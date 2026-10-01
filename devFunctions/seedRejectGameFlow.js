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
  DISPUTE_STAGE,
  DISPUTE_EVENT_TYPE,
  notificationTypes,
  notificationSchema,
  createLadderMatchGames,
  buildLadderParticipant,
} from "@shared";
import { formatDisplayName } from "../helpers/formatDisplayName";

export const MAESTRO_LADDER_ID = "maestro-reject-flow-ladder";
export const MAESTRO_MATCH_ID = "maestro-reject-flow-match";
export const MAESTRO_OPPONENT_ID = "maestro-reject-flow-opponent";
export const MAESTRO_DISPUTE_ID = "maestro-reject-flow-dispute";
const BEST_OF = 5;
export const MAESTRO_GAME_ID = `${MAESTRO_MATCH_ID}-g1`;
export const baselineProfileDetail = (xp) => ({
  XP: xp,
  totalPointDifference: 0,
  numberOfWins: 0,
  numberOfLosses: 0,
  numberOfGamesPlayed: 0,
  winPercentage: 0,
  prevGameXP: 0,
  highestWinStreak: 0,
  highestLossStreak: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  demonWin: 0,
  averagePointDifference: 0,
  pointDifferenceLog: [],
  resultLog: [],
  currentStreak: { type: null, count: 0 },
});

export const toPlayer = (user) => ({
  userId: user.userId,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  username: user.username || "",
  displayName: formatDisplayName(user),
});

export const seedRejectGameFlow = async ({
  testUser,
  withActiveDispute = false,
}) => {
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
      profileDetail: baselineProfileDetail(100),
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

  await setDoc(
    doc(db, "users", testUser.userId),
    { profileDetail: baselineProfileDetail(100) },
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
    approvalStatus: withActiveDispute ? "disputed" : "Pending",
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

  await setDoc(
    doc(db, "ladders", MAESTRO_LADDER_ID, "ladderParticipants", testUser.userId),
    buildLadderParticipant(testUser),
  );
  await setDoc(
    doc(db, "ladders", MAESTRO_LADDER_ID, "ladderParticipants", opponent.userId),
    buildLadderParticipant(opponent),
  );

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

  if (withActiveDispute) {
    const disputedGame = {
      ...reportedGame,
      team1: { ...reportedGame.team1, score: 21 },
      team2: { ...reportedGame.team2, score: 19 },
      gamescore: "21-19",
      approvalStatus: "",
      result: {
        winner: { ...reportedGame.result.winner, score: 21 },
        loser: { ...reportedGame.result.loser, score: 19 },
      },
    };
    await setDoc(doc(db, DISPUTES_COLLECTION, MAESTRO_DISPUTE_ID), {
      disputeId: MAESTRO_DISPUTE_ID,
      ladderId: MAESTRO_LADDER_ID,
      ladderName: "Maestro Reject-Flow Ladder",
      ladderType: LADDER_TYPE.SINGLES,
      ladderMatchId: MAESTRO_MATCH_ID,
      gameId,
      originalGame: reportedGame,
      disputedGame,
      openedBy: testUser.userId,
      participantIds: [testUser.userId, opponent.userId],
      stage: DISPUTE_STAGE.UNDER_REVIEW,
      events: [
        {
          type: DISPUTE_EVENT_TYPE.OPENED,
          stage: DISPUTE_STAGE.UNDER_REVIEW,
          createdBy: testUser.userId,
          createdAt: now,
          note: "Maestro E2E seed: pre-existing dispute.",
        },
      ],
      evidenceDueAt: null,
      resolution: null,
      finalGame: null,
      adminNotes: null,
      matchDate: today,
      matchTime: { start: "18:00" },
      courtName: "Maestro Test Court",
      createdAt: now,
      resolvedAt: null,
      resolvedBy: null,
    });
  }

  return {
    ladderId: MAESTRO_LADDER_ID,
    matchId: MAESTRO_MATCH_ID,
    disputeId: withActiveDispute ? MAESTRO_DISPUTE_ID : null,
    gameId,
    opponentId: opponent.userId,
  };
};
