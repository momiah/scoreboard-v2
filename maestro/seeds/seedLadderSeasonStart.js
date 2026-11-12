import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { buildFixtureUser } from "../fixtures/fixtureUsers";
import {
  LADDER_CANCELLED_REASON,
  LADDER_MIN_ENTRANTS_TO_START,
  LADDER_SEASON_EXTENSION_DAYS,
  LADDER_SEASON_START_DAYS,
  LADDER_STATUS,
  LADDER_TYPE,
  buildLadderParticipant,
  deriveExtendedLadderDates,
  deriveLadderDates,
  getLadderSeasonCancelledNotification,
  getLadderSeasonExtendedNotification,
  getLadderSeasonStartedNotification,
  notificationSchema,
  notificationTypes,
} from "@shared";
import { resetHomeCourtNotifications } from "./homeCourtFixtures";

export const MAESTRO_SEASON_LADDER_ID = "maestro-season-start-ladder";
export const MAESTRO_SEASON_LADDER_NAME = "Maestro Season Start";
export const MAESTRO_SEASON_LADDER_IDS = [MAESTRO_SEASON_LADDER_ID];

export const SEASON_VARIANT = {
  PRE_SEASON: "preSeason",
  EXTENDED: "extended",
  STARTED: "started",
  CANCELLED: "cancelled",
};

/** Entrants seeded before the season start: short of the minimum by this many. */
export const MAESTRO_SEASON_SHORTFALL = 28;

const DAY_MS = 24 * 60 * 60 * 1000;
const LADDER_SUBCOLLECTIONS = [
  "ladderMatches",
  "ladderParticipants",
  "ladderTeams",
  "ladderMembers",
];
const SEASON_NOTIFICATION_ID = `maestro-season-${MAESTRO_SEASON_LADDER_ID}`;
const BATCH_LIMIT = 450;

const fixtureEntrantId = (n) =>
  `maestro-season-entrant-${String(n).padStart(3, "0")}`;

/** Every fixture entrant a variant can seed (all but the test user). */
export const maestroSeasonFixtureUserIds = () =>
  Array.from({ length: LADDER_MIN_ENTRANTS_TO_START - 1 }, (_, i) =>
    fixtureEntrantId(i + 1),
  );

const commitInBatches = async (writes) => {
  for (let start = 0; start < writes.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    writes.slice(start, start + BATCH_LIMIT).forEach((write) => write(batch));
    await batch.commit();
  }
};

const deleteAllDocs = async (colRef) => {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

const resetLadderTree = (ladderId) =>
  Promise.all(
    LADDER_SUBCOLLECTIONS.map((sub) =>
      deleteAllDocs(collection(db, "ladders", ladderId, sub)),
    ),
  );

const daysAgo = (now, days) => new Date(now.getTime() - days * DAY_MS);

/**
 * The ladder as processLadderPhases leaves it. Pre-season: registration opened
 * three days ago. Extended: the original start was five days ago and moved
 * back. Started: the start was due an hour ago with enough entrants. Cancelled:
 * the moved-back start passed with too few.
 */
const ladderState = (variant, now) => {
  if (variant === SEASON_VARIANT.PRE_SEASON) {
    const registrationOpensAt = daysAgo(now, 3);
    return {
      registrationOpensAt,
      ...deriveLadderDates(registrationOpensAt),
      status: LADDER_STATUS.REGISTRATION_OPEN,
      participantCount: LADDER_MIN_ENTRANTS_TO_START - MAESTRO_SEASON_SHORTFALL,
    };
  }
  if (variant === SEASON_VARIANT.EXTENDED) {
    const registrationOpensAt = daysAgo(now, LADDER_SEASON_START_DAYS + 5);
    const { seasonStartsAt } = deriveLadderDates(registrationOpensAt);
    return {
      registrationOpensAt,
      ...deriveExtendedLadderDates(seasonStartsAt),
      status: LADDER_STATUS.REGISTRATION_OPEN,
      seasonExtendedAt: seasonStartsAt,
      participantCount: LADDER_MIN_ENTRANTS_TO_START - MAESTRO_SEASON_SHORTFALL,
    };
  }
  if (variant === SEASON_VARIANT.STARTED) {
    const registrationOpensAt = new Date(
      now.getTime() - LADDER_SEASON_START_DAYS * DAY_MS - 60 * 60 * 1000,
    );
    const dates = deriveLadderDates(registrationOpensAt);
    return {
      registrationOpensAt,
      ...dates,
      status: LADDER_STATUS.REGISTRATION_OPEN,
      seasonStartedAt: now,
      participantCount: LADDER_MIN_ENTRANTS_TO_START,
    };
  }
  const registrationOpensAt = daysAgo(
    now,
    LADDER_SEASON_START_DAYS + LADDER_SEASON_EXTENSION_DAYS,
  );
  const { seasonStartsAt } = deriveLadderDates(registrationOpensAt);
  return {
    registrationOpensAt,
    ...deriveExtendedLadderDates(seasonStartsAt),
    status: LADDER_STATUS.CANCELLED,
    seasonExtendedAt: seasonStartsAt,
    cancelledAt: now,
    cancelledReason: LADDER_CANCELLED_REASON.TOO_FEW_REGISTRATIONS,
    participantCount: LADDER_MIN_ENTRANTS_TO_START - MAESTRO_SEASON_SHORTFALL,
  };
};

const ladderCopy = {
  name: MAESTRO_SEASON_LADDER_NAME,
  ladderType: LADDER_TYPE.SINGLES,
};

/** The notification processLadderPhases sends for the variant, if any. */
const seasonNotification = (variant, participantCount) => {
  if (variant === SEASON_VARIANT.STARTED) {
    return getLadderSeasonStartedNotification(ladderCopy);
  }
  if (variant === SEASON_VARIANT.EXTENDED) {
    return getLadderSeasonExtendedNotification(ladderCopy, participantCount);
  }
  if (variant === SEASON_VARIANT.CANCELLED) {
    return getLadderSeasonCancelledNotification(ladderCopy);
  }
  return null;
};

export const seedLadderSeasonStart = async ({
  testUser,
  variant = SEASON_VARIANT.PRE_SEASON,
}) => {
  if (!testUser?.userId) {
    throw new Error("seedLadderSeasonStart: testUser with a userId is required");
  }
  const now = new Date();
  const state = ladderState(variant, now);

  await resetLadderTree(MAESTRO_SEASON_LADDER_ID);
  await setDoc(doc(db, "ladders", MAESTRO_SEASON_LADDER_ID), {
    ladderId: MAESTRO_SEASON_LADDER_ID,
    name: MAESTRO_SEASON_LADDER_NAME,
    description:
      "Seeded by maestro/seeds/seedLadderSeasonStart for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    countryCode: "GB",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: "Mixed",
    courtIds: [],
    entryFee: 0,
    currencyType: "GBP",
    minRank: 0,
    maxPlayers: 2048,
    prizesDistributed: false,
    createdBy: testUser.userId,
    createdAt: state.registrationOpensAt,
    updatedBy: testUser.userId,
    updatedAt: now,
    ...state,
  });
  const joinedAt = (n) =>
    new Date(state.registrationOpensAt.getTime() + n * 60 * 1000);
  const fixtureUsers = maestroSeasonFixtureUserIds()
    .slice(0, state.participantCount - 1)
    .map((userId, index) =>
      buildFixtureUser({
        userId,
        firstName: `S${String(index + 1).padStart(3, "0")}`,
        lastName: "Seed",
        username: `season_${String(index + 1).padStart(3, "0")}`,
      }),
    );
  await commitInBatches([
    ...fixtureUsers.map(
      (user) => (batch) => batch.set(doc(db, "users", user.userId), user),
    ),
    ...[testUser, ...fixtureUsers].map((user, index) => (batch) =>
      batch.set(
        doc(
          db,
          "ladders",
          MAESTRO_SEASON_LADDER_ID,
          "ladderParticipants",
          user.userId,
        ),
        { ...buildLadderParticipant(user), joinedAt: joinedAt(index) },
      ),
    ),
  ]);

  await resetHomeCourtNotifications({
    testUser,
    ladderId: MAESTRO_SEASON_LADDER_ID,
    ladderName: MAESTRO_SEASON_LADDER_NAME,
  });
  const notification = seasonNotification(variant, state.participantCount);
  if (notification) {
    await setDoc(
      doc(db, "users", testUser.userId, "notifications", SEASON_NOTIFICATION_ID),
      {
        ...notificationSchema,
        createdAt: now,
        recipientId: testUser.userId,
        senderId: "system",
        ...notification,
        type: notificationTypes.INFORMATION.LADDER.TYPE,
        data: { ladderId: MAESTRO_SEASON_LADDER_ID, tab: "Summary" },
      },
    );
  }
  return { ladderId: MAESTRO_SEASON_LADDER_ID, variant };
};

export const cleanupLadderSeasonStartTestData = async (testUser) => {
  await Promise.all(MAESTRO_SEASON_LADDER_IDS.map(resetLadderTree));
  await Promise.all(
    MAESTRO_SEASON_LADDER_IDS.map((id) => deleteDoc(doc(db, "ladders", id))),
  );
  await commitInBatches(
    maestroSeasonFixtureUserIds().map(
      (userId) => (batch) => batch.delete(doc(db, "users", userId)),
    ),
  );
  if (testUser?.userId) {
    const notifications = await getDocs(
      query(
        collection(db, "users", testUser.userId, "notifications"),
        where("data.ladderId", "in", MAESTRO_SEASON_LADDER_IDS),
      ),
    );
    await Promise.all(notifications.docs.map((d) => deleteDoc(d.ref)));
  }
  return { ladders: MAESTRO_SEASON_LADDER_IDS };
};
