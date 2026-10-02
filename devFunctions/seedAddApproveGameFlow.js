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
  createLadderMatchGames,
  buildLadderParticipant,
  notificationTypes,
  notificationSchema,
} from "@shared";
import { baselineProfileDetail, toPlayer } from "./seedRejectGameFlow";

export const MAESTRO_AG_LADDER_ID = "maestro-add-game-flow-ladder";
export const MAESTRO_AG_MATCH_ID = "maestro-add-game-flow-match";
export const MAESTRO_AG_OPPONENT_ID = "maestro-add-game-flow-opponent";
const BEST_OF = 5;
export const MAESTRO_AG_GAME_ID = `${MAESTRO_AG_MATCH_ID}-g1`;

export const seedAddApproveGameFlow = async ({
  testUser,
  withReportedGame = false,
  priorApprovedGames = 0,
  extraPendingGames = 0,
  allCheckedIn = true,
}) => {
  if (!testUser?.userId) {
    throw new Error(
      "seedAddApproveGameFlow: testUser with a userId is required",
    );
  }

  const opponent = {
    userId: MAESTRO_AG_OPPONENT_ID,
    firstName: "Maestro",
    lastName: "Reporter",
    username: "maestro_ag_opponent",
  };

  await setDoc(
    doc(db, "users", MAESTRO_AG_OPPONENT_ID),
    {
      userId: MAESTRO_AG_OPPONENT_ID,
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
      email: "maestro-add-game-opponent@example.com",
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
  const shells = createLadderMatchGames(BEST_OF, MAESTRO_AG_MATCH_ID);

  const opponentWinsGame = (shell, approvalStatus) => ({
    ...shell,
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
    approvalStatus,
    reporter: opponent.userId,
    numberOfApprovals: approvalStatus === "approved" ? 1 : 0,
    numberOfDeclines: 0,
    approvers:
      approvalStatus === "approved"
        ? [{ userId: testUser.userId, username: testUser.username }]
        : [],
  });

  const games = shells.map((shell, index) => {
    if (index < priorApprovedGames) return opponentWinsGame(shell, "approved");
    if (
      withReportedGame &&
      index >= priorApprovedGames &&
      index <= priorApprovedGames + extraPendingGames
    ) {
      return opponentWinsGame(shell, "Pending");
    }
    return shell;
  });
  await setDoc(doc(db, "ladders", MAESTRO_AG_LADDER_ID), {
    ladderId: MAESTRO_AG_LADDER_ID,
    name: "Maestro Add-Game Flow Ladder",
    description:
      "Seeded by devFunctions/seedAddApproveGameFlow.js for Maestro E2E tests. Safe to ignore.",
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
    doc(
      db,
      "ladders",
      MAESTRO_AG_LADDER_ID,
      "ladderParticipants",
      testUser.userId,
    ),
    buildLadderParticipant(testUser),
  );
  await setDoc(
    doc(
      db,
      "ladders",
      MAESTRO_AG_LADDER_ID,
      "ladderParticipants",
      opponent.userId,
    ),
    buildLadderParticipant(opponent),
  );

  const now = new Date();
  await setDoc(
    doc(
      db,
      "ladders",
      MAESTRO_AG_LADDER_ID,
      "ladderMatches",
      MAESTRO_AG_MATCH_ID,
    ),
    {
      ladderMatchId: MAESTRO_AG_MATCH_ID,
      court: {
        courtId: "maestro-test-court",
        courtName: "Maestro Test Court",
        location: {
          city: "Test",
          country: "United Kingdom",
          countryCode: "GB",
        },
      },
      bestOf: BEST_OF,
      matchDate: today,
      matchTime: { start: "18:00" },
      courtFee: 0,
      currencyType: "GBP",
      participants: [testUser.userId, opponent.userId],
      games,
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      shuttleType: "Feather",
      createdBy: opponent.userId,
      createdAt: now,
      acceptedBy: testUser.userId,
      acceptedAt: now,
      checkIn: allCheckedIn
        ? {
            checkedInBy: [testUser.userId, opponent.userId],
            checkedInAt: { [testUser.userId]: now, [opponent.userId]: now },
            completed: true,
            completedAt: now,
          }
        : {
            checkedInBy: [opponent.userId],
            checkedInAt: { [opponent.userId]: now },
            completed: false,
          },
      ladderType: LADDER_TYPE.SINGLES,
      lastUpdated: now,
    },
  );

  const notificationsRef = collection(
    db,
    "users",
    testUser.userId,
    "notifications",
  );
  const staleNotifications = await getDocs(
    query(notificationsRef, where("data.matchId", "==", MAESTRO_AG_MATCH_ID)),
  );
  await Promise.all(staleNotifications.docs.map((d) => deleteDoc(d.ref)));

  await addDoc(notificationsRef, {
    ...notificationSchema,
    createdAt: new Date(),
    recipientId: testUser.userId,
    senderId: opponent.userId,
    message: `${opponent.firstName} ${opponent.lastName} accepted your ladder match at Maestro Test Court`,
    type: notificationTypes.INFORMATION.LADDER_MATCH_ACCEPTED.TYPE,
    data: {
      ladderId: MAESTRO_AG_LADDER_ID,
      matchId: MAESTRO_AG_MATCH_ID,
      ladderType: LADDER_TYPE.SINGLES,
    },
  });

  if (withReportedGame) {
    for (let offset = 0; offset <= extraPendingGames; offset += 1) {
      await addDoc(notificationsRef, {
        ...notificationSchema,
        createdAt: new Date(Date.now() + offset),
        recipientId: testUser.userId,
        senderId: opponent.userId,
        message:
          offset === 0
            ? `${opponent.firstName} ${opponent.lastName} has just reported a score in Maestro Add-Game Flow Ladder ladder`
            : `${opponent.firstName} ${opponent.lastName} has just submitted result number ${offset + 1} in Maestro Add-Game Flow Ladder ladder`,
        type: notificationTypes.ACTION.ADD_GAME.LADDER,
        data: {
          ladderId: MAESTRO_AG_LADDER_ID,
          matchId: MAESTRO_AG_MATCH_ID,
          gameId: shells[priorApprovedGames + offset].gameId,
        },
      });
    }
  }

  return {
    ladderId: MAESTRO_AG_LADDER_ID,
    matchId: MAESTRO_AG_MATCH_ID,
    gameId: MAESTRO_AG_GAME_ID,
    opponentId: opponent.userId,
  };
};
