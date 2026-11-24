import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE,
  LADDER_INACTIVITY_REMOVED_LABEL,
  LADDER_REGISTRATION_CLOSE_DAYS,
  LADDER_SEASON_START_DAYS,
  LADDER_STATUS,
  LADDER_TYPE,
  buildLadderParticipant,
  deriveLadderSeasonDates,
  getLadderInactivityRemoval,
  getLadderInactivityRules,
  getLadderInactivityWarning,
  markLadderInactivityWarningSent,
  notificationSchema,
  notificationTypes,
  PAYOUT_STRUCTURE,
} from "@shared";

export const MAESTRO_INACTIVITY_LADDER_ID = "maestro-inactivity-ladder";
export const MAESTRO_INACTIVITY_LADDER_NAME = "Maestro Inactivity Singles";

export const INACTIVITY_VARIANT = {
  WARNING: "warning",
  REMOVED: "removed",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const WARNING_DAYS_LEFT = 3;

const notificationId = (kind, userId) => `${kind}-${MAESTRO_INACTIVITY_LADDER_ID}-${userId}`;
const warningKind = `inactivity-warning-${WARNING_DAYS_LEFT}`;
const removedKind = "inactivity-removed";

const ladderRef = () => doc(db, "ladders", MAESTRO_INACTIVITY_LADDER_ID);
const participantRef = (userId) =>
  doc(db, "ladders", MAESTRO_INACTIVITY_LADDER_ID, "ladderParticipants", userId);
const notificationRef = (userId, kind) =>
  doc(db, "users", userId, "notifications", notificationId(kind, userId));

/** A started season whose inactivity removal date is `removalAt`. */
const ladderDocument = ({ testUser, removalAt, removed }) => {
  const registrationClosesAt = new Date(
    removalAt.getTime() + LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE * DAY_MS,
  );
  const seasonStartsAt = new Date(
    registrationClosesAt.getTime() - LADDER_REGISTRATION_CLOSE_DAYS * DAY_MS,
  );
  const registrationOpensAt = new Date(
    seasonStartsAt.getTime() - LADDER_SEASON_START_DAYS * DAY_MS,
  );
  return {
    ladderId: MAESTRO_INACTIVITY_LADDER_ID,
    name: MAESTRO_INACTIVITY_LADDER_NAME,
    description:
      "Seeded by maestro/seeds/seedLadderInactivity for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    city: "London",
    countryCode: "GB",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: "Mixed",
    courtIds: [],
    registrationOpensAt,
    ...deriveLadderSeasonDates(seasonStartsAt),
    seasonStartedAt: seasonStartsAt,
    // Removal happens while registration is still open.
    status: LADDER_STATUS.REGISTRATION_OPEN,
    entryFee: 0,
    payoutStructure: PAYOUT_STRUCTURE.LINEAR,
    currencyType: "GBP",
    minRank: 0,
    maxPlayers: 2048,
    participantCount: removed ? 0 : 1,
    prizesDistributed: false,
    inactivityWarningDaysSent: markLadderInactivityWarningSent([], removed ? 1 : WARNING_DAYS_LEFT),
    ...(removed
      ? {
          inactivityRemovedAt: new Date(removalAt.getTime() + 5 * 60 * 1000),
          inactivityRemovedUserIds: [testUser.userId],
        }
      : {}),
    createdBy: testUser.userId,
    createdAt: registrationOpensAt,
    updatedBy: testUser.userId,
    updatedAt: registrationOpensAt,
  };
};

const notification = ({ testUser, title, message, tab, createdAt }) => ({
  ...notificationSchema,
  createdAt,
  recipientId: testUser.userId,
  senderId: "system",
  title,
  message,
  type: notificationTypes.INFORMATION.LADDER.TYPE,
  data: { ladderId: MAESTRO_INACTIVITY_LADDER_ID, tab },
});

/**
 * The state processLadderPhases leaves for an inactive test user on a free
 * ladder: the 3-day warning before the removal date, or the removal itself
 * (14 days before registration closes, so registration is still open), with
 * the notification the job writes under the same id.
 */
export const seedLadderInactivity = async ({ testUser, variant = INACTIVITY_VARIANT.WARNING }) => {
  if (!testUser?.userId) {
    throw new Error("seedLadderInactivity: testUser with a userId is required");
  }
  await cleanupLadderInactivityTestData({ testUser });
  const removed = variant === INACTIVITY_VARIANT.REMOVED;
  const now = Date.now();
  const removalAt = removed
    ? new Date(now - HOUR_MS)
    : new Date(now + WARNING_DAYS_LEFT * DAY_MS - HOUR_MS);
  const ladder = ladderDocument({ testUser, removalAt, removed });
  await setDoc(ladderRef(), ladder);

  if (removed) {
    const { title, message } = getLadderInactivityRemoval(ladder);
    await setDoc(
      notificationRef(testUser.userId, removedKind),
      notification({ testUser, title, message, tab: "Summary", createdAt: ladder.inactivityRemovedAt }),
    );
    return {
      variant,
      expected: { inactivityMessage: message, joinLabel: LADDER_INACTIVITY_REMOVED_LABEL },
    };
  }

  await setDoc(participantRef(testUser.userId), {
    ...buildLadderParticipant(testUser),
    // Joined when registration opened, so outside the late-joiner grace.
    joinedAt: ladder.registrationOpensAt,
  });
  const { title, message } = getLadderInactivityWarning(ladder, WARNING_DAYS_LEFT);
  await setDoc(
    notificationRef(testUser.userId, warningKind),
    notification({ testUser, title, message, tab: "Matchmaking", createdAt: new Date() }),
  );
  const [inactivityRuleFirst, , , , inactivityRuleLast] = getLadderInactivityRules("player");
  return {
    variant,
    expected: { inactivityMessage: message, inactivityRuleFirst, inactivityRuleLast },
  };
};

export const cleanupLadderInactivityTestData = async ({ testUser }) => {
  if (testUser?.userId) {
    await Promise.all([
      deleteDoc(participantRef(testUser.userId)),
      deleteDoc(notificationRef(testUser.userId, warningKind)),
      deleteDoc(notificationRef(testUser.userId, removedKind)),
    ]);
  }
  await deleteDoc(ladderRef());
  return { ladderId: MAESTRO_INACTIVITY_LADDER_ID };
};
