import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  setDoc,
  doc,
  where,
} from "firebase/firestore";
import moment from "moment";
import { db } from "../services/firebase.config";
import {
  LADDER_TYPE,
  LADDER_STATUS,
  LADDER_MATCH_STATUS,
  DISPUTES_COLLECTION,
  notificationTypes,
  notificationSchema,
  createLadderMatchGames,
} from "@shared";
import { formatDisplayName } from "../helpers/formatDisplayName";

// Fixed ids so re-running the seed is idempotent — it always resets the same
// ladder/match/game back to "just reported", rather than piling up test data.
export const MAESTRO_LADDER_ID = "maestro-reject-flow-ladder";
export const MAESTRO_MATCH_ID = "maestro-reject-flow-match";
export const MAESTRO_OPPONENT_ID = "maestro-reject-flow-opponent";
const BEST_OF = 5;

const toPlayer = (user) => ({
  userId: user.userId,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  username: user.username || "",
  displayName: formatDisplayName(user),
});

/**
 * Seed a ladder + accepted, checked-in match with one game already reported
 * (Pending, opponent as reporter) and a matching "game reported" notification
 * for the test user — everything the reject-game (dispute) Maestro flows
 * need to act on. Re-running it resets game 1 and clears any dispute/
 * notification left over from a previous run, so it's safe to call before
 * every Maestro suite run.
 */
export const seedRejectGameFlow = async ({ testUser }) => {
  if (!testUser?.userId) {
    throw new Error("seedRejectGameFlow: testUser with a userId is required");
  }

  const opponent = {
    userId: MAESTRO_OPPONENT_ID,
    firstName: "Maestro",
    lastName: "Opponent",
    username: "maestro_opponent",
  };

  await setDoc(
    doc(db, "users", MAESTRO_OPPONENT_ID),
    {
      userId: MAESTRO_OPPONENT_ID,
      firstName: opponent.firstName,
      lastName: opponent.lastName,
      username: opponent.username,
      usernameLower: opponent.username,
      handPreference: "",
      provider: "seed",
      dob: "",
      profileDetail: { XP: 20 },
      profileImage: "",
      bio: "",
      headline: "",
      profileViews: 0,
      location: {},
      email: "maestro-opponent@example.com",
      phoneNumber: "",
      showEmail: false,
      showPhoneNumber: false,
      pushTokens: [],
    },
    { merge: true },
  );

  const today = moment().format("DD-MM-YYYY");
  const shells = createLadderMatchGames(BEST_OF, MAESTRO_MATCH_ID);
  const gameId = shells[0].gameId;

  const reportedGame = {
    ...shells[0],
    team1: { player1: toPlayer(opponent), player2: null, score: 21 },
    team2: { player1: toPlayer(testUser), player2: null, score: 15 },
    gamescore: "21-15",
    date: today,
    reportedAt: new Date(),
    reportedTime: moment().format("HH:mm"),
    result: {
      winner: { team: "Team 1", players: [opponent.userId], score: 21 },
      loser: { team: "Team 2", players: [testUser.userId], score: 15 },
    },
    approvalStatus: "Pending",
    reporter: opponent.userId,
    numberOfApprovals: 0,
    numberOfDeclines: 0,
    approvers: [],
  };

  await setDoc(doc(db, "ladders", MAESTRO_LADDER_ID), {
    ladderId: MAESTRO_LADDER_ID,
    name: "Maestro Reject-Flow Ladder",
    description:
      "Seeded by devFunctions/seedRejectGameFlow.js for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    countryCode: "GB",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: "Mixed",
    courtIds: [],
    status: LADDER_STATUS.REGISTRATION_CLOSED,
    registrationOpensAt: new Date(),
    registrationClosesAt: new Date(),
    seasonStartsAt: new Date(),
    seasonEndsAt: new Date(),
    playoffStartsAt: new Date(),
    playoffEndsAt: new Date(),
    entryFee: 0,
    currencyType: "GBP",
    minRank: 0,
    maxPlayers: 2,
    participantCount: 2,
    prizesDistributed: false,
    createdBy: testUser.userId,
    createdAt: new Date(),
    updatedBy: testUser.userId,
    updatedAt: new Date(),
  });

  const now = new Date();
  await setDoc(doc(db, "ladders", MAESTRO_LADDER_ID, "ladderMatches", MAESTRO_MATCH_ID), {
    ladderMatchId: MAESTRO_MATCH_ID,
    court: {
      courtId: "maestro-test-court",
      courtName: "Maestro Test Court",
      location: { city: "Test", country: "United Kingdom", countryCode: "GB" },
    },
    bestOf: BEST_OF,
    matchDate: today,
    matchTime: { start: "18:00" },
    courtFee: 0,
    currencyType: "GBP",
    participants: [testUser.userId, opponent.userId],
    games: [reportedGame, ...shells.slice(1)],
    matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
    shuttleType: "Feather",
    createdBy: opponent.userId,
    createdAt: now,
    acceptedBy: testUser.userId,
    acceptedAt: now,
    checkIn: {
      checkedInBy: [testUser.userId, opponent.userId],
      checkedInAt: { [testUser.userId]: now, [opponent.userId]: now },
      completed: true,
      completedAt: now,
    },
    ladderType: LADDER_TYPE.SINGLES,
    lastUpdated: now,
  });

  // Reset: drop any dispute or notification left over from a previous run of
  // this seed so the flow always starts from a freshly reported game.
  const staleDisputes = await getDocs(
    query(collection(db, DISPUTES_COLLECTION), where("gameId", "==", gameId)),
  );
  await Promise.all(staleDisputes.docs.map((d) => deleteDoc(d.ref)));

  const notificationsRef = collection(
    db,
    "users",
    testUser.userId,
    "notifications",
  );
  const staleNotifications = await getDocs(
    query(notificationsRef, where("data.matchId", "==", MAESTRO_MATCH_ID)),
  );
  await Promise.all(staleNotifications.docs.map((d) => deleteDoc(d.ref)));

  await addDoc(notificationsRef, {
    ...notificationSchema,
    createdAt: new Date(),
    recipientId: testUser.userId,
    senderId: opponent.userId,
    message: `${formatDisplayName(opponent)} has just reported a score in Maestro Reject-Flow Ladder ladder`,
    type: notificationTypes.ACTION.ADD_GAME.LADDER,
    data: {
      ladderId: MAESTRO_LADDER_ID,
      matchId: MAESTRO_MATCH_ID,
      gameId,
    },
  });

  return {
    ladderId: MAESTRO_LADDER_ID,
    matchId: MAESTRO_MATCH_ID,
    gameId,
    opponentId: opponent.userId,
  };
};
