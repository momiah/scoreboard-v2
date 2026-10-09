import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
  buildLadderParticipant,
  notificationSchema,
  notificationTypes,
} from "@shared";
import { deleteReportsForLadder, seedStrikes } from "./reportFixtures";
import {
  HOME_COURT_VARIANT,
  homeCourtEntrantFields,
  postedMatchDocument,
  seedFixtureUser,
} from "./homeCourtFixtures";

export const MAESTRO_CANCEL_LADDER_ID = "maestro-cancel-ladder";
export const MAESTRO_CANCEL_LADDER_NAME = "Maestro Cancel Ladder";
export const MAESTRO_CANCEL_MATCH_ID = "maestro-cancel-match";
export const MAESTRO_CANCEL_OPPONENT_ID = "maestro-cancel-opponent";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);
const SUBCOLLECTIONS = ["ladderMatches", "ladderParticipants"];

export const CANCEL_VARIANT = {
  POSTED_OWN: "postedOwn",
  ACCEPTED: "accepted",
  REQUESTED_BY_OPPONENT: "requestedByOpponent",
  REQUESTED_BY_USER: "requestedByUser",
  GAME_REPORTED: "gameReported",
  USER_DISQUALIFIED: "userDisqualified",
};

const opponent = {
  userId: MAESTRO_CANCEL_OPPONENT_ID,
  firstName: "Maestro",
  lastName: "CancelOpponent",
  username: "maestro_cancel_opponent",
};

const deleteAllDocs = async (colRef) => {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

const resetTree = () =>
  Promise.all(
    SUBCOLLECTIONS.map(async (sub) => {
      const snap = await getDocs(
        collection(db, "ladders", MAESTRO_CANCEL_LADDER_ID, sub),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }),
  );

const clearFixtureNotifications = async (userIds, ladderId) => {
  await Promise.all(
    userIds.map(async (userId) => {
      const snap = await getDocs(
        query(
          collection(db, "users", userId, "notifications"),
          where("data.ladderId", "==", ladderId),
        ),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }),
  );
};

const writeNotifications = async (testUser) => {
  const notificationsRef = collection(
    db,
    "users",
    testUser.userId,
    "notifications",
  );
  const stale = await getDocs(
    query(
      notificationsRef,
      where("data.ladderId", "==", MAESTRO_CANCEL_LADDER_ID),
    ),
  );
  await Promise.all(stale.docs.map((d) => deleteDoc(d.ref)));
  await Promise.all(
    ["Summary", "Matchmaking", "Schedule"].map((tab) =>
      setDoc(doc(notificationsRef, `maestro-cancel-${tab}`), {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: testUser.userId,
        senderId: "system",
        message: `Maestro: open ${MAESTRO_CANCEL_LADDER_NAME} on ${tab}`,
        type: notificationTypes.INFORMATION.LADDER.TYPE,
        data: { ladderId: MAESTRO_CANCEL_LADDER_ID, tab },
      }),
    ),
  );
};

export const seedMatchCancellationFlow = async ({
  testUser,
  variant = CANCEL_VARIANT.ACCEPTED,
}) => {
  if (!testUser?.userId) {
    throw new Error("seedMatchCancellationFlow: testUser with a userId is required");
  }
  await seedFixtureUser(opponent, "maestro-cancel-opponent@example.com");
  await resetTree();
  await deleteReportsForLadder(MAESTRO_CANCEL_LADDER_ID);
  await clearFixtureNotifications([opponent.userId], MAESTRO_CANCEL_LADDER_ID);

  await setDoc(doc(db, "ladders", MAESTRO_CANCEL_LADDER_ID), {
    ladderId: MAESTRO_CANCEL_LADDER_ID,
    name: MAESTRO_CANCEL_LADDER_NAME,
    description:
      "Seeded by maestro/seeds/seedMatchCancellationFlow for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    countryCode: "GB",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: "Mixed",
    courtIds: [],
    status: LADDER_STATUS.REGISTRATION_OPEN,
    registrationOpensAt: daysFromNow(-5),
    registrationClosesAt: daysFromNow(7),
    seasonStartsAt: daysFromNow(-5),
    seasonEndsAt: daysFromNow(60),
    playoffStartsAt: daysFromNow(50),
    playoffEndsAt: daysFromNow(60),
    entryFee: 0,
    currencyType: "GBP",
    minRank: 0,
    maxPlayers: 2048,
    participantCount: 2,
    prizesDistributed: false,
    createdBy: testUser.userId,
    createdAt: new Date(),
    updatedBy: testUser.userId,
    updatedAt: new Date(),
  });
  await setDoc(
    doc(db, "ladders", MAESTRO_CANCEL_LADDER_ID, "ladderParticipants", testUser.userId),
    {
      ...buildLadderParticipant(testUser),
      ...homeCourtEntrantFields(HOME_COURT_VARIANT.SET),
    },
  );
  await setDoc(
    doc(db, "ladders", MAESTRO_CANCEL_LADDER_ID, "ladderParticipants", opponent.userId),
    buildLadderParticipant(opponent),
  );

  const posted = postedMatchDocument({
    matchId: MAESTRO_CANCEL_MATCH_ID,
    createdBy: testUser.userId,
    participants: [testUser.userId],
    ladderType: LADDER_TYPE.SINGLES,
  });
  const accepted = {
    ...posted,
    participants: [testUser.userId, opponent.userId],
    matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
    acceptedBy: opponent.userId,
    acceptedAt: new Date(),
  };
  const requestBy = (requestedBy) => ({
    cancellationRequest: { requestedBy, requestedAt: new Date() },
  });
  const documentByVariant = {
    [CANCEL_VARIANT.POSTED_OWN]: posted,
    [CANCEL_VARIANT.ACCEPTED]: accepted,
    [CANCEL_VARIANT.REQUESTED_BY_OPPONENT]: {
      ...accepted,
      ...requestBy(opponent.userId),
    },
    [CANCEL_VARIANT.REQUESTED_BY_USER]: {
      ...accepted,
      ...requestBy(testUser.userId),
    },
    [CANCEL_VARIANT.USER_DISQUALIFIED]: {
      ...posted,
      createdBy: opponent.userId,
      participants: [opponent.userId],
    },
    [CANCEL_VARIANT.GAME_REPORTED]: {
      ...accepted,
      games: accepted.games.map((game, index) =>
        index === 0
          ? {
              ...game,
              reporter: opponent.userId,
              approvalStatus: "pending",
              result: {
                winner: { team: "Team 1", players: [opponent.userId], score: 21 },
                loser: { team: "Team 2", players: [testUser.userId], score: 15 },
              },
            }
          : game,
      ),
    },
  };
  await setDoc(
    doc(db, "ladders", MAESTRO_CANCEL_LADDER_ID, "ladderMatches", MAESTRO_CANCEL_MATCH_ID),
    documentByVariant[variant],
  );
  if (variant === CANCEL_VARIANT.USER_DISQUALIFIED) {
    await seedStrikes(MAESTRO_CANCEL_LADDER_ID, testUser.userId, { cheating: 3 });
  }
  const chatRef = collection(
    db,
    "ladders",
    MAESTRO_CANCEL_LADDER_ID,
    "ladderMatches",
    MAESTRO_CANCEL_MATCH_ID,
    "chat",
  );
  await deleteAllDocs(chatRef);
  await setDoc(doc(chatRef, "maestro-cancel-chat-1"), {
    text: "See you at the court at 6",
    createdAt: Timestamp.now(),
    user: { _id: opponent.userId, name: opponent.username, avatar: "" },
  });
  await deleteDoc(
    doc(db, "users", opponent.userId, "chats", MAESTRO_CANCEL_MATCH_ID),
  );
  await writeNotifications(testUser);
  return { ladderId: MAESTRO_CANCEL_LADDER_ID, variant };
};

export const cleanupMatchCancellationTestData = async () => {
  await resetTree();
  await deleteDoc(doc(db, "ladders", MAESTRO_CANCEL_LADDER_ID));
  await deleteDoc(doc(db, "users", MAESTRO_CANCEL_OPPONENT_ID));
  return { ladders: [MAESTRO_CANCEL_LADDER_ID] };
};
