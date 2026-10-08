import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { notificationSchema, notificationTypes } from "courtchamps-shared";
import {
  LADDER_CANCELLED_REASON,
  LADDER_PLAYOFF_TIES_COLLECTION,
  LADDER_STATUS,
  LADDER_TYPE,
  TEAM_STATUS,
} from "courtchamps-shared/types";
import type {
  Ladder,
  LadderHomeCourt,
  LadderStatus,
  Player,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "courtchamps-shared/types";
import {
  LADDER_MIN_PLAYOFF_SIZE,
  buildLadderPlayoffTies,
  getLadderPlayoffQualifiers,
} from "courtchamps-shared/helpers";
import type { LadderPlayoffEntrant } from "courtchamps-shared/helpers";

import { refundLadderEntryFees } from "./helpers/refundLadderEntryFees";
import { sendNotification } from "./helpers/sendNotification";

const LADDERS = "ladders";
const LADDER_PARTICIPANTS = "ladderParticipants";
const LADDER_TEAMS = "ladderTeams";
const USERS = "users";
const USERS_PER_READ = 300;
const NOTIFICATIONS_PER_WAVE = 50;
const PLAYOFF_ROUND_DAYS = 10;

const PRE_PLAYOFF_STATUSES: LadderStatus[] = [
  LADDER_STATUS.REGISTRATION_OPEN,
  LADDER_STATUS.REGISTRATION_CLOSED,
];

type Db = admin.firestore.Firestore;
type DocRef = admin.firestore.DocumentReference;

export interface ProcessLadderPhasesSummary {
  registrationClosed: string[];
  cancelled: string[];
  playoffsGenerated: string[];
}

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
};

const isDue = (value: unknown, now: Date): boolean => {
  const date = toDate(value);
  return !!date && date.getTime() <= now.getTime();
};

const isPrePlayoff = (status: unknown): boolean =>
  PRE_PLAYOFF_STATUSES.includes(status as LadderStatus);

const entrantsCollection = (ladderRef: DocRef, ladder: Ladder) =>
  ladderRef.collection(
    ladder.ladderType === LADDER_TYPE.DOUBLES ? LADDER_TEAMS : LADDER_PARTICIPANTS,
  );

const fetchUsers = async (
  db: Db,
  userIds: string[],
): Promise<Map<string, UserProfile>> => {
  const users = new Map<string, UserProfile>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  for (let start = 0; start < uniqueIds.length; start += USERS_PER_READ) {
    const refs = uniqueIds
      .slice(start, start + USERS_PER_READ)
      .map((userId) => db.collection(USERS).doc(userId));
    const snapshots = await db.getAll(...refs);
    snapshots.forEach((snapshot) => {
      if (snapshot.exists) users.set(snapshot.id, snapshot.data() as UserProfile);
    });
  }
  return users;
};

const toPlayer = (
  userId: string,
  user: UserProfile | undefined,
  fallback?: Partial<Player>,
): Player => ({
  userId,
  firstName: user?.firstName ?? fallback?.firstName ?? "",
  lastName: user?.lastName ?? fallback?.lastName ?? "",
  username: user?.username ?? fallback?.username ?? "",
});

const globalXp = (user: UserProfile | undefined): number =>
  user?.profileDetail?.XP ?? 0;

const toHomeCourt = (value: unknown): LadderHomeCourt | null =>
  value && typeof value === "object" && (value as LadderHomeCourt).courtId
    ? (value as LadderHomeCourt)
    : null;

const notifyPlayers = async ({
  userIds,
  ladder,
  title,
  message,
  tab,
}: {
  userIds: string[];
  ladder: Ladder;
  title: string;
  message: string;
  tab: string;
}): Promise<void> => {
  const recipients = [...new Set(userIds.filter(Boolean))];
  for (let start = 0; start < recipients.length; start += NOTIFICATIONS_PER_WAVE) {
    await Promise.all(
      recipients.slice(start, start + NOTIFICATIONS_PER_WAVE).map((recipientId) =>
        sendNotification({
          ...notificationSchema,
          createdAt: new Date(),
          recipientId,
          senderId: "system",
          title,
          message,
          type: notificationTypes.INFORMATION.LADDER.TYPE,
          data: { ladderId: ladder.ladderId, tab },
        }),
      ),
    );
  }
};

const loadEntrantPlayerIds = async (
  ladderRef: DocRef,
  ladder: Ladder,
): Promise<string[]> => {
  const snapshot = await entrantsCollection(ladderRef, ladder).get();
  return snapshot.docs.flatMap((entrantDoc) => {
    const data = entrantDoc.data() as ScoreboardProfile & TeamStats;
    return ladder.ladderType === LADDER_TYPE.DOUBLES
      ? data.playerIds ?? []
      : [data.userId || entrantDoc.id];
  });
};

const loadEntrants = async (
  db: Db,
  ladderRef: DocRef,
  ladder: Ladder,
): Promise<LadderPlayoffEntrant[]> => {
  const snapshot = await entrantsCollection(ladderRef, ladder).get();

  if (ladder.ladderType === LADDER_TYPE.DOUBLES) {
    const teams = snapshot.docs
      .map((teamDoc) => ({ id: teamDoc.id, team: teamDoc.data() as TeamStats }))
      .filter(
        ({ team }) =>
          team.status !== TEAM_STATUS.PENDING &&
          (team.playerIds ?? []).length >= 2,
      );
    const users = await fetchUsers(
      db,
      teams.flatMap(({ team }) => team.playerIds ?? []),
    );
    return teams.map(({ id, team }) => {
      const playerIds = team.playerIds ?? [];
      return {
        entrantKey: team.teamKey || id,
        teamId: team.teamId ?? null,
        players: playerIds.map((userId) =>
          toPlayer(
            userId,
            users.get(userId),
            team.players?.find((member) => member.userId === userId),
          ),
        ),
        competitionXP: team.XP ?? 0,
        numberOfWins: team.numberOfWins ?? 0,
        totalPointDifference: team.totalPointDifference ?? 0,
        globalXp: playerIds.reduce(
          (sum, userId) => sum + globalXp(users.get(userId)),
          0,
        ),
        joinedAt: toDate(team.joinedAt),
        homeCourt: toHomeCourt(team.homeCourt),
      };
    });
  }

  const participants = snapshot.docs.map((participantDoc) => ({
    userId:
      (participantDoc.data() as ScoreboardProfile).userId || participantDoc.id,
    participant: participantDoc.data() as ScoreboardProfile,
  }));
  const users = await fetchUsers(
    db,
    participants.map(({ userId }) => userId),
  );
  return participants.map(({ userId, participant }) => ({
    entrantKey: userId,
    teamId: null,
    players: [toPlayer(userId, users.get(userId), participant)],
    competitionXP: participant.competitionXP ?? 0,
    numberOfWins: participant.numberOfWins ?? 0,
    totalPointDifference: participant.totalPointDifference ?? 0,
    globalXp: globalXp(users.get(userId)),
    joinedAt: toDate(participant.joinedAt),
    homeCourt: toHomeCourt(participant.homeCourt),
  }));
};

const cancelLadder = async ({
  db,
  ladderRef,
  ladder,
  entrantCount,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  entrantCount: number;
  now: Date;
}): Promise<boolean> => {
  const cancelled = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ladderRef);
    if (!fresh.exists || !isPrePlayoff(fresh.data()?.status)) return false;
    transaction.update(ladderRef, {
      status: LADDER_STATUS.CANCELLED,
      cancelledAt: now,
      cancelledReason: LADDER_CANCELLED_REASON.TOO_FEW_REGISTRATIONS,
    });
    return true;
  });
  if (cancelled) {
    await refundLadderEntryFees({ ladder, entrantCount });
    await notifyPlayers({
      userIds: await loadEntrantPlayerIds(ladderRef, ladder),
      ladder,
      title: "Ladder cancelled",
      message: `${ladder.name} has been cancelled because not enough players signed up before registration closed. If you paid an entry fee, it will be refunded to you in full.`,
      tab: "Summary",
    });
  }
  return cancelled;
};

const closeRegistration = async ({
  db,
  ladderRef,
  ladder,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  now: Date;
}): Promise<"closed" | "cancelled" | null> => {
  const countSnapshot = await entrantsCollection(ladderRef, ladder)
    .count()
    .get();
  const entrantCount = countSnapshot.data().count;

  if (entrantCount < LADDER_MIN_PLAYOFF_SIZE) {
    const cancelled = await cancelLadder({
      db,
      ladderRef,
      ladder,
      entrantCount,
      now,
    });
    return cancelled ? "cancelled" : null;
  }

  const closed = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ladderRef);
    if (fresh.data()?.status !== LADDER_STATUS.REGISTRATION_OPEN) return false;
    transaction.update(ladderRef, {
      status: LADDER_STATUS.REGISTRATION_CLOSED,
    });
    return true;
  });
  return closed ? "closed" : null;
};

const generatePlayoffs = async ({
  db,
  ladderRef,
  ladder,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  now: Date;
}): Promise<"generated" | "cancelled" | null> => {
  const entrants = await loadEntrants(db, ladderRef, ladder);
  const { bracketSize, qualifiers } = getLadderPlayoffQualifiers({
    entrants,
    registeredCount: Math.max(entrants.length, LADDER_MIN_PLAYOFF_SIZE),
    maxPlayers: ladder.maxPlayers,
  });

  if (bracketSize === 0) {
    const cancelled = await cancelLadder({
      db,
      ladderRef,
      ladder,
      entrantCount: entrants.length,
      now,
    });
    return cancelled ? "cancelled" : null;
  }

  const ties = buildLadderPlayoffTies({
    ladderId: ladder.ladderId,
    qualifiers,
    createdAt: now,
  });

  const outcome = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ladderRef);
    const data = fresh.data();
    if (!fresh.exists || !isPrePlayoff(data?.status) || data?.playoffsGeneratedAt) {
      return null;
    }
    ties.forEach((tie) => {
      transaction.create(
        ladderRef.collection(LADDER_PLAYOFF_TIES_COLLECTION).doc(tie.tieId),
        tie,
      );
    });
    transaction.update(ladderRef, {
      status: LADDER_STATUS.PLAYOFFS,
      playoffsGeneratedAt: now,
      playoffBracketSize: bracketSize,
      playoffEntrantCount: entrants.length,
    });
    return "generated" as const;
  });

  if (outcome === "generated") {
    await notifyPlayers({
      userIds: qualifiers.flatMap((qualifier) =>
        qualifier.players.map((player) => player.userId),
      ),
      ladder,
      title: "You made the playoffs!",
      message: `Congratulations! You've made the playoffs in ${ladder.name}. You have ${PLAYOFF_ROUND_DAYS} days to play both your home and away games.`,
      tab: "Playoffs",
    });
    const qualifierKeys = new Set(
      qualifiers.map((qualifier) => qualifier.entrantKey),
    );
    await notifyPlayers({
      userIds: entrants
        .filter((entrant) => !qualifierKeys.has(entrant.entrantKey))
        .flatMap((entrant) => entrant.players.map((player) => player.userId)),
      ladder,
      title: "Playoffs have started",
      message: `The playoffs in ${ladder.name} have started, and unfortunately you didn't make the cut this time. The ladder is now closed, so you can no longer post matches. Thank you for playing, and come back next season for another chance to win!`,
      tab: "Playoffs",
    });
  }
  return outcome;
};

/**
 * Moves ladders through their scheduled phases. At registration close a ladder
 * with fewer than LADDER_MIN_PLAYOFF_SIZE entrants is cancelled (and refunded),
 * otherwise registration is closed. At playoff start the top entrants are
 * placed into a knockout bracket and the ladder moves to Playoffs. Each step
 * re-checks the ladder inside a transaction and bracket slots have fixed ids,
 * so re-running never generates twice.
 */
export const runProcessLadderPhases = async (
  now: Date = new Date(),
): Promise<ProcessLadderPhasesSummary> => {
  const db = admin.firestore();
  const summary: ProcessLadderPhasesSummary = {
    registrationClosed: [],
    cancelled: [],
    playoffsGenerated: [],
  };

  const laddersSnapshot = await db
    .collection(LADDERS)
    .where("status", "in", PRE_PLAYOFF_STATUSES)
    .get();

  for (const ladderDoc of laddersSnapshot.docs) {
    const ladder = { ...(ladderDoc.data() as Ladder), ladderId: ladderDoc.id };
    try {
      let status = ladder.status;

      if (
        status === LADDER_STATUS.REGISTRATION_OPEN &&
        isDue(ladder.registrationClosesAt, now)
      ) {
        const outcome = await closeRegistration({
          db,
          ladderRef: ladderDoc.ref,
          ladder,
          now,
        });
        if (outcome === "cancelled") {
          summary.cancelled.push(ladder.ladderId);
          continue;
        }
        if (outcome === "closed") {
          summary.registrationClosed.push(ladder.ladderId);
          status = LADDER_STATUS.REGISTRATION_CLOSED;
        }
      }

      if (isPrePlayoff(status) && isDue(ladder.playoffStartsAt, now)) {
        const outcome = await generatePlayoffs({
          db,
          ladderRef: ladderDoc.ref,
          ladder,
          now,
        });
        if (outcome === "generated") {
          summary.playoffsGenerated.push(ladder.ladderId);
        } else if (outcome === "cancelled") {
          summary.cancelled.push(ladder.ladderId);
        }
      }
    } catch (error) {
      console.log(`❌ processLadderPhases failed for ${ladder.ladderId}:`, error);
    }
  }

  console.log(
    `✅ processLadderPhases: closed ${summary.registrationClosed.length}, cancelled ${summary.cancelled.length}, playoffs ${summary.playoffsGenerated.length}.`,
  );
  return summary;
};

export const processLadderPhases = onSchedule("every 15 minutes", async () => {
  await runProcessLadderPhases();
});
