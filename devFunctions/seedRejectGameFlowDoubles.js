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
  normalizeTeamKey,
  createTeam,
  buildLadderParticipant,
} from "@shared";
import { formatDisplayName } from "../helpers/formatDisplayName";
import { baselineProfileDetail, toPlayer } from "./seedRejectGameFlow";

// Fixed ids, hyphen-free so normalizeTeamKey's derived team keys stay simple
// enough to hardcode in a Maestro flow (it splits every id on "-" before
// re-sorting, so a real id with hyphens in it produces a scrambled key).
export const MAESTRO_D_LADDER_ID = "maestro-reject-flow-doubles-ladder";
export const MAESTRO_D_MATCH_ID = "maestro-reject-flow-doubles-match";
export const MAESTRO_D_PARTNER_ID = "maestrodpartner";
export const MAESTRO_D_OPP1_ID = "maestrodopp1";
export const MAESTRO_D_OPP2_ID = "maestrodopp2";
export const MAESTRO_D_DISPUTE_ID = "maestro-reject-flow-doubles-dispute";
const BEST_OF = 5;
export const MAESTRO_D_GAME_ID = `${MAESTRO_D_MATCH_ID}-g1`;

/**
 * Doubles counterpart to seedRejectGameFlow.js: a checked-in doubles ladder
 * match with one game already reported (Team B, the opponents, win 21-15)
 * and a matching notification for the test user (Team A, with a synthetic
 * partner). Same idempotent-reset shape as the singles seed — re-running it
 * always resets both teams and all four players back to a 0/0/0 baseline.
 *
 * Pass `withActiveDispute: true` for a game already under an active dispute
 * the test user opened, matching createDispute's shape.
 */
export const seedDoublesRejectGameFlow = async ({
  testUser,
  withActiveDispute = false,
}) => {
  if (!testUser?.userId) {
    throw new Error(
      "seedDoublesRejectGameFlow: testUser with a userId is required",
    );
  }

  // Distinct last-name initials (formatDisplayName is "First L.") so each
  // player's name is unambiguous in screenshots/assertions, and doesn't
  // collide with the singles seed's "Maestro O" opponent.
  const partner = {
    userId: MAESTRO_D_PARTNER_ID,
    firstName: "Maestro",
    lastName: "Foxtrot",
    username: "maestro_partner",
  };
  const opp1 = {
    userId: MAESTRO_D_OPP1_ID,
    firstName: "Maestro",
    lastName: "Delta",
    username: "maestro_opp1",
  };
  const opp2 = {
    userId: MAESTRO_D_OPP2_ID,
    firstName: "Maestro",
    lastName: "Echo",
    username: "maestro_opp2",
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
    seedUserDoc(partner, "maestro-doubles-partner@example.com"),
    seedUserDoc(opp1, "maestro-doubles-opp1@example.com"),
    seedUserDoc(opp2, "maestro-doubles-opp2@example.com"),
    setDoc(
      doc(db, "users", testUser.userId),
      { profileDetail: baselineProfileDetail(100) },
      { merge: true },
    ),
  ]);

  const today = moment().format("DD-MM-YYYY");
  const shells = createLadderMatchGames(BEST_OF, MAESTRO_D_MATCH_ID);
  const gameId = shells[0].gameId;

  const reportedGame = {
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
    approvalStatus: withActiveDispute ? "disputed" : "Pending",
    reporter: opp1.userId,
    numberOfApprovals: 0,
    numberOfDeclines: 0,
    approvers: [],
  };

  await setDoc(doc(db, "ladders", MAESTRO_D_LADDER_ID), {
    ladderId: MAESTRO_D_LADDER_ID,
    name: "Maestro Reject-Flow Doubles Ladder",
    description:
      "Seeded by devFunctions/seedRejectGameFlowDoubles.js for Maestro E2E tests. Safe to ignore.",
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

  // Team standings (Team Performance tab) — both teams reset to a 0 baseline
  // each run. teamKey is derived the same way the real scoring code derives
  // it (normalizeTeamKey), not hand-computed, so it's always correct even
  // though testUser's real id is unknown ahead of time.
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
    doc(db, "ladders", MAESTRO_D_LADDER_ID, "ladderTeams", teamAKey),
    teamA,
  );
  await setDoc(
    doc(db, "ladders", MAESTRO_D_LADDER_ID, "ladderTeams", teamBKey),
    teamB,
  );

  // Also seed a ladderParticipants doc per player. The Team Performance tab
  // doesn't read these, but the dispute-resolution scoring path does — and
  // when it can't find one, courtchamps-shared's scoreDoublesLadderGame falls
  // back to building one on the fly via buildLadderParticipant(). That
  // fallback has a real bug: it shallow-spreads the module-level
  // scoreboardProfileSchema singleton, so every fallback participant shares
  // the SAME `currentStreak`/`resultLog`/etc. object by reference — scoring
  // one player mutates the "fresh" state the next player reads, corrupting
  // all 4 players' streak/XP numbers (confirmed directly against the
  // installed package; see the message to the user for the reproduction).
  // Pre-seeding real, independent participant docs avoids the fallback
  // entirely, which is also what keeps a real doubles ladder correct in
  // production once players have actually played a game before.
  await Promise.all(
    [testUser, partner, opp1, opp2].map((user) =>
      setDoc(
        doc(db, "ladders", MAESTRO_D_LADDER_ID, "ladderParticipants", user.userId),
        buildLadderParticipant(user),
      ),
    ),
  );

  const now = new Date();
  await setDoc(
    doc(db, "ladders", MAESTRO_D_LADDER_ID, "ladderMatches", MAESTRO_D_MATCH_ID),
    {
      ladderMatchId: MAESTRO_D_MATCH_ID,
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
      games: [reportedGame, ...shells.slice(1)],
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

  // Reset: drop any dispute or notification left over from a previous run.
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
    query(notificationsRef, where("data.matchId", "==", MAESTRO_D_MATCH_ID)),
  );
  await Promise.all(staleNotifications.docs.map((d) => deleteDoc(d.ref)));

  await addDoc(notificationsRef, {
    ...notificationSchema,
    createdAt: new Date(),
    recipientId: testUser.userId,
    senderId: opp1.userId,
    message: `${formatDisplayName(opp1)} has just reported a score in Maestro Reject-Flow Doubles Ladder ladder`,
    type: notificationTypes.ACTION.ADD_GAME.LADDER,
    data: {
      ladderId: MAESTRO_D_LADDER_ID,
      matchId: MAESTRO_D_MATCH_ID,
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
      // Scoring reads result.winner/loser.score, not team1/team2.score
      // directly — these must move with the corrected score above, or an
      // UPHELD resolution ends up scoring the original margin.
      result: {
        winner: { ...reportedGame.result.winner, score: 21 },
        loser: { ...reportedGame.result.loser, score: 19 },
      },
    };
    await setDoc(doc(db, DISPUTES_COLLECTION, MAESTRO_D_DISPUTE_ID), {
      disputeId: MAESTRO_D_DISPUTE_ID,
      ladderId: MAESTRO_D_LADDER_ID,
      ladderName: "Maestro Reject-Flow Doubles Ladder",
      ladderType: LADDER_TYPE.DOUBLES,
      ladderMatchId: MAESTRO_D_MATCH_ID,
      gameId,
      originalGame: reportedGame,
      disputedGame,
      openedBy: testUser.userId,
      participantIds: [
        testUser.userId,
        partner.userId,
        opp1.userId,
        opp2.userId,
      ],
      stage: DISPUTE_STAGE.UNDER_REVIEW,
      events: [
        {
          type: DISPUTE_EVENT_TYPE.OPENED,
          stage: DISPUTE_STAGE.UNDER_REVIEW,
          createdBy: testUser.userId,
          createdAt: now,
          note: "Maestro E2E seed: pre-existing doubles dispute.",
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
    ladderId: MAESTRO_D_LADDER_ID,
    matchId: MAESTRO_D_MATCH_ID,
    disputeId: withActiveDispute ? MAESTRO_D_DISPUTE_ID : null,
    gameId,
    teamAKey,
    teamBKey,
  };
};
