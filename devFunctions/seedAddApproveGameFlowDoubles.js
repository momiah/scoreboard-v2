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
  normalizeTeamKey,
  createTeam,
  buildLadderParticipant,
  notificationTypes,
  notificationSchema,
} from "@shared";
import { formatDisplayName } from "../helpers/formatDisplayName";
import { baselineProfileDetail, toPlayer } from "./seedRejectGameFlow";

export const MAESTRO_AGD_LADDER_ID = "maestro-add-game-flow-doubles-ladder";
export const MAESTRO_AGD_MATCH_ID = "maestro-add-game-flow-doubles-match";
export const MAESTRO_AGD_PARTNER_ID = "maestroagdpartner";
export const MAESTRO_AGD_OPP1_ID = "maestroagdopp1";
export const MAESTRO_AGD_OPP2_ID = "maestroagdopp2";
const BEST_OF = 5;
export const MAESTRO_AGD_GAME_ID = `${MAESTRO_AGD_MATCH_ID}-g1`;

export const seedAddApproveGameFlowDoubles = async ({
  testUser,
  withReportedGame = false,
}) => {
  if (!testUser?.userId) {
    throw new Error(
      "seedAddApproveGameFlowDoubles: testUser with a userId is required",
    );
  }

  const partner = {
    userId: MAESTRO_AGD_PARTNER_ID,
    firstName: "Maestro",
    lastName: "Golf",
    username: "maestro_agd_partner",
  };
  const opp1 = {
    userId: MAESTRO_AGD_OPP1_ID,
    firstName: "Maestro",
    lastName: "Hotel",
    username: "maestro_agd_opp1",
  };
  const opp2 = {
    userId: MAESTRO_AGD_OPP2_ID,
    firstName: "Maestro",
    lastName: "India",
    username: "maestro_agd_opp2",
  };

  const seedUserDoc = (user, email) =>
    setDoc(
      doc(db, "users", user.userId),
      {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        usernameLower: user.username,
        handPreference: "",
        provider: "seed",
        dob: "",
        profileDetail: baselineProfileDetail(100),
        profileImage: "",
        bio: "",
        headline: "",
        profileViews: 0,
        location: {},
        email,
        phoneNumber: "",
        showEmail: false,
        showPhoneNumber: false,
        pushTokens: [],
      },
      { merge: true },
    );

  await Promise.all([
    seedUserDoc(partner, "maestro-add-game-doubles-partner@example.com"),
    seedUserDoc(opp1, "maestro-add-game-doubles-opp1@example.com"),
    seedUserDoc(opp2, "maestro-add-game-doubles-opp2@example.com"),
    setDoc(
      doc(db, "users", testUser.userId),
      { profileDetail: baselineProfileDetail(100) },
      { merge: true },
    ),
  ]);

  const today = moment().format("DD-MM-YYYY");
  const shells = createLadderMatchGames(BEST_OF, MAESTRO_AGD_MATCH_ID);

  const reportedGame = withReportedGame
    ? {
        ...shells[0],
        team1: {
          player1: toPlayer(opp1),
          player2: toPlayer(opp2),
          score: 21,
        },
        team2: {
          player1: toPlayer(testUser),
          player2: toPlayer(partner),
          score: 15,
        },
        gamescore: "21-15",
        date: today,
        reportedAt: new Date(),
        reportedTime: moment().format("HH:mm"),
        result: {
          winner: {
            team: "Team 1",
            players: [opp1.userId, opp2.userId],
            score: 21,
          },
          loser: {
            team: "Team 2",
            players: [testUser.userId, partner.userId],
            score: 15,
          },
        },
        approvalStatus: "Pending",
        reporter: opp1.userId,
        numberOfApprovals: 0,
        numberOfDeclines: 0,
        approvers: [],
      }
    : null;

  await setDoc(doc(db, "ladders", MAESTRO_AGD_LADDER_ID), {
    ladderId: MAESTRO_AGD_LADDER_ID,
    name: "Maestro Add-Game Flow Doubles Ladder",
    description:
      "Seeded by devFunctions/seedAddApproveGameFlowDoubles.js for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    countryCode: "GB",
    ladderType: LADDER_TYPE.DOUBLES,
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
    maxPlayers: 4,
    participantCount: 4,
    prizesDistributed: false,
    createdBy: testUser.userId,
    createdAt: new Date(),
    updatedBy: testUser.userId,
    updatedAt: new Date(),
  });

  const teamAKey = normalizeTeamKey([testUser.userId, partner.userId]);
  const teamBKey = normalizeTeamKey([opp1.userId, opp2.userId]);
  const teamA = {
    ...createTeam(
      [formatDisplayName(testUser), formatDisplayName(partner)],
      teamAKey,
    ),
    XP: 0,
    teamId: teamAKey,
    playerIds: [testUser.userId, partner.userId],
    status: "active",
  };
  const teamB = {
    ...createTeam([formatDisplayName(opp1), formatDisplayName(opp2)], teamBKey),
    XP: 0,
    teamId: teamBKey,
    playerIds: [opp1.userId, opp2.userId],
    status: "active",
  };
  await setDoc(
    doc(db, "ladders", MAESTRO_AGD_LADDER_ID, "ladderTeams", teamAKey),
    teamA,
  );
  await setDoc(
    doc(db, "ladders", MAESTRO_AGD_LADDER_ID, "ladderTeams", teamBKey),
    teamB,
  );

  await Promise.all(
    [testUser, partner, opp1, opp2].map((user) =>
      setDoc(
        doc(db, "ladders", MAESTRO_AGD_LADDER_ID, "ladderParticipants", user.userId),
        buildLadderParticipant(user),
      ),
    ),
  );

  const now = new Date();
  await setDoc(
    doc(db, "ladders", MAESTRO_AGD_LADDER_ID, "ladderMatches", MAESTRO_AGD_MATCH_ID),
    {
      ladderMatchId: MAESTRO_AGD_MATCH_ID,
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
      participants: [
        testUser.userId,
        partner.userId,
        opp1.userId,
        opp2.userId,
      ],
      teams: [
        { teamId: teamBKey, teamKey: teamBKey, playerIds: [opp1.userId, opp2.userId] },
        {
          teamId: teamAKey,
          teamKey: teamAKey,
          playerIds: [testUser.userId, partner.userId],
        },
      ],
      games: reportedGame ? [reportedGame, ...shells.slice(1)] : shells,
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      shuttleType: "Feather",
      createdBy: opp1.userId,
      createdAt: now,
      acceptedBy: testUser.userId,
      acceptedAt: now,
      checkIn: {
        checkedInBy: [
          testUser.userId,
          partner.userId,
          opp1.userId,
          opp2.userId,
        ],
        checkedInAt: {
          [testUser.userId]: now,
          [partner.userId]: now,
          [opp1.userId]: now,
          [opp2.userId]: now,
        },
        completed: true,
        completedAt: now,
      },
      ladderType: LADDER_TYPE.DOUBLES,
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
    query(notificationsRef, where("data.matchId", "==", MAESTRO_AGD_MATCH_ID)),
  );
  await Promise.all(staleNotifications.docs.map((d) => deleteDoc(d.ref)));

  await addDoc(notificationsRef, {
    ...notificationSchema,
    createdAt: new Date(),
    recipientId: testUser.userId,
    senderId: opp1.userId,
    message: `${opp1.firstName} ${opp1.lastName} accepted your ladder match at Maestro Test Court`,
    type: notificationTypes.INFORMATION.LADDER_MATCH_ACCEPTED.TYPE,
    data: {
      ladderId: MAESTRO_AGD_LADDER_ID,
      matchId: MAESTRO_AGD_MATCH_ID,
      ladderType: LADDER_TYPE.DOUBLES,
    },
  });

  if (withReportedGame) {
    await addDoc(notificationsRef, {
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: testUser.userId,
      senderId: opp1.userId,
      message: `${opp1.firstName} ${opp1.lastName} has just reported a score in Maestro Add-Game Flow Doubles Ladder ladder`,
      type: notificationTypes.ACTION.ADD_GAME.LADDER,
      data: {
        ladderId: MAESTRO_AGD_LADDER_ID,
        matchId: MAESTRO_AGD_MATCH_ID,
        gameId: MAESTRO_AGD_GAME_ID,
      },
    });
  }

  return {
    ladderId: MAESTRO_AGD_LADDER_ID,
    matchId: MAESTRO_AGD_MATCH_ID,
    gameId: MAESTRO_AGD_GAME_ID,
    teamAKey,
    teamBKey,
  };
};
