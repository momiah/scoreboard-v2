import moment from "moment";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { ccImageEndpoint, courtSchema, locationSchema } from "@shared";
import type { CompetitionLocation, Court } from "@shared/types";
import { db } from "../../services/firebase.config";
import { generateCourtId } from "../../helpers/generateCourtId";
import { ROSTER, SeedCity, SEED_CITY_LOCATIONS } from "./roster";
import { simulateLiveActivity } from "./simulate";

// Staff-only: firestore.rules leaves this collection to staff and functions.
export const SEED_REGISTRY = {
  collection: "seedRegistry",
  id: "liveActivity2026",
};

interface SeedRegistry {
  createdAt: Date;
  userIds: string[];
  leagueIds: string[];
  tournamentIds: string[];
  courtIds: string[];
}

const registryRef = () => doc(db, SEED_REGISTRY.collection, SEED_REGISTRY.id);

const FALLBACK_VENUES: Record<
  SeedCity,
  { courtName: string; postCode: string; address: string }
> = {
  London: {
    courtName: "Mile End Park Leisure Centre",
    postCode: "E3 4HL",
    address: "190 Burdett Road",
  },
  Manchester: {
    courtName: "Armitage Centre",
    postCode: "M14 6ZT",
    address: "Moseley Road, Fallowfield",
  },
  Birmingham: {
    courtName: "Fox Hollies Leisure Centre",
    postCode: "B27 7RS",
    address: "Shaftmoor Lane, Acocks Green",
  },
  Bristol: {
    courtName: "Easton Leisure Centre",
    postCode: "BS5 0SW",
    address: "Thrissell Street",
  },
};

const chunk = <T>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );

// Firestore rejects undefined; Dates must survive as Timestamps.
const clean = (value: unknown): unknown => {
  if (value instanceof Date || value === null) return value;
  if (Array.isArray(value)) return value.map(clean);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, clean(v)]),
    );
  }
  return value;
};

const courtLocation = (court: Court): CompetitionLocation => ({
  ...locationSchema,
  ...court.location,
  courtName: court.courtName,
  courtId: court.courtId,
});

// Prefers a court players already use in that city; adds a real venue only
// when the city has none.
const resolveCourts = async () => {
  const snapshot = await getDocs(collection(db, "courts"));
  const courts = snapshot.docs.map(
    (d) => ({ ...d.data(), courtId: d.id }) as Court,
  );
  const created: string[] = [];
  const byCity = {} as Record<SeedCity, CompetitionLocation>;
  for (const city of Object.keys(SEED_CITY_LOCATIONS) as SeedCity[]) {
    const existing = courts
      .filter(
        (c) => c.location?.city?.trim().toLowerCase() === city.toLowerCase(),
      )
      .sort((a, b) => {
        const score = (c: Court) =>
          /leisure|sports|centre|center/i.test(c.courtName) ? 0 : 1;
        return score(a) - score(b) || a.courtName.localeCompare(b.courtName);
      });
    if (existing[0]) {
      byCity[city] = courtLocation(existing[0]);
      continue;
    }
    const venue = FALLBACK_VENUES[city];
    const court = {
      ...courtSchema,
      courtName: venue.courtName,
      location: {
        ...courtSchema.location,
        ...SEED_CITY_LOCATIONS[city],
        postCode: venue.postCode,
        address: venue.address,
      },
      createdAt: new Date(),
    };
    const courtId = generateCourtId(court);
    await setDoc(doc(db, "courts", courtId), { ...court, courtId });
    created.push(courtId);
    byCity[city] = courtLocation({ ...court, courtId } as Court);
  }
  return { byCity, created };
};

const takenUsernames = async () => {
  const names = ROSTER.map((r) => r.username.toLowerCase());
  const taken: string[] = [];
  for (const group of chunk(names, 30)) {
    const snap = await getDocs(
      query(collection(db, "users"), where("usernameLower", "in", group)),
    );
    snap.forEach((d) => taken.push(d.data().usernameLower));
  }
  return taken;
};

export const seedLiveActivity = async () => {
  if ((await getDoc(registryRef())).exists()) {
    throw new Error("Live activity is already seeded. Delete it first.");
  }
  const taken = await takenUsernames();
  if (taken.length > 0) {
    throw new Error(`Usernames already taken: ${taken.join(", ")}`);
  }

  const { byCity, created } = await resolveCourts();
  const activity = await simulateLiveActivity({
    courts: byCity,
    now: moment(),
  });

  const registry: SeedRegistry = {
    createdAt: new Date(),
    userIds: activity.users.map((u) => u.userId),
    leagueIds: activity.leagues.map((l) => l.leagueId!),
    tournamentIds: activity.tournaments.map((t) => t.tournamentId!),
    courtIds: created,
  };
  await setDoc(registryRef(), registry);

  for (const group of chunk(activity.users, 100)) {
    const batch = writeBatch(db);
    group.forEach((user) =>
      batch.set(doc(db, "users", user.userId), clean(user) as object),
    );
    await batch.commit();
  }

  const competitions = [
    ...activity.leagues.map((l) => ({
      collectionName: "leagues",
      id: l.leagueId!,
      name: l.leagueName,
      createdAt: l.createdAt,
      data: l,
    })),
    ...activity.tournaments.map((t) => ({
      collectionName: "tournaments",
      id: t.tournamentId!,
      name: t.tournamentName,
      createdAt: t.createdAt,
      data: t,
    })),
  ];
  for (const competition of competitions) {
    await setDoc(
      doc(db, competition.collectionName, competition.id),
      clean(competition.data) as object,
    );
    await setDoc(
      doc(collection(db, competition.collectionName, competition.id, "chat")),
      {
        _id: "welcome",
        text: `Welcome to the chat for ${competition.name}!`,
        createdAt: competition.createdAt,
        user: { _id: "system", name: "CourtChamps", avatar: ccImageEndpoint },
      },
    );
  }

  return {
    users: registry.userIds.length,
    leagues: registry.leagueIds.length,
    tournaments: registry.tournamentIds.length,
    games:
      activity.leagues.reduce((n, l) => n + l.games.length, 0) +
      activity.tournaments.reduce(
        (n, t) => n + ((t as { gamesCompleted?: number }).gamesCompleted ?? 0),
        0,
      ),
    courtsAdded: created.length,
  };
};

const deleteSubcollection = async (path: string[]) => {
  const snap = await getDocs(collection(db, path[0], ...path.slice(1)));
  for (const group of chunk(snap.docs, 400)) {
    const batch = writeBatch(db);
    group.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
};

// Removes everything the registry lists. A competition a real player has
// joined is kept and reported, so nobody loses their games.
export const deleteLiveActivity = async () => {
  const snap = await getDoc(registryRef());
  if (!snap.exists()) throw new Error("No live activity seeded");
  const registry = snap.data() as SeedRegistry;
  const seededUsers = new Set(registry.userIds);
  const kept: string[] = [];
  const keptUsers = new Set<string>();

  const competitions = [
    ...registry.leagueIds.map((id) => ["leagues", id] as const),
    ...registry.tournamentIds.map((id) => ["tournaments", id] as const),
  ];
  for (const [collectionName, id] of competitions) {
    const ref = doc(db, collectionName, id);
    const competition = await getDoc(ref);
    if (!competition.exists()) continue;
    const realPlayers = (competition.data().participantIds ?? []).filter(
      (uid: string) => !seededUsers.has(uid),
    );
    if (realPlayers.length > 0) {
      kept.push(`${collectionName}/${id}`);
      competition
        .data()
        .participantIds.forEach((uid: string) => keptUsers.add(uid));
      continue;
    }
    await deleteSubcollection([collectionName, id, "chat"]);
    await deleteDoc(ref);
  }

  for (const userId of registry.userIds) {
    if (keptUsers.has(userId)) continue;
    await deleteSubcollection(["users", userId, "notifications"]);
    await deleteSubcollection(["users", userId, "chats"]);
    await deleteDoc(doc(db, "users", userId));
  }

  for (const courtId of registry.courtIds) {
    const [leagues, tournaments] = await Promise.all(
      ["leagues", "tournaments"].map((c) =>
        getDocs(
          query(collection(db, c), where("location.courtId", "==", courtId)),
        ),
      ),
    );
    if (leagues.empty && tournaments.empty) {
      await deleteDoc(doc(db, "courts", courtId));
    } else {
      kept.push(`courts/${courtId}`);
    }
  }

  if (kept.length === 0) {
    await deleteDoc(registryRef());
  } else {
    await setDoc(registryRef(), {
      ...registry,
      userIds: registry.userIds.filter((id) => keptUsers.has(id)),
      leagueIds: registry.leagueIds.filter((id) =>
        kept.includes(`leagues/${id}`),
      ),
      tournamentIds: registry.tournamentIds.filter((id) =>
        kept.includes(`tournaments/${id}`),
      ),
      courtIds: registry.courtIds.filter((id) => kept.includes(`courts/${id}`)),
    });
  }
  return {
    deletedUsers: registry.userIds.length - keptUsers.size,
    kept,
  };
};
