import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_TYPE,
  LADDER_MATCH_STATUS,
  buildLadderParticipant,
  normalizeTeamKey,
} from "@shared";
import { buildSeedLadderTeam } from "./buildSeedLadderTeam";
import {
  HOME_COURT_VARIANT,
  MAESTRO_HC_DOUBLES_LADDER_ID,
  MAESTRO_HC_DOUBLES_LADDER_NAME,
  MAESTRO_HC_DOUBLES_MATCH_ID,
  MAESTRO_HC_PARTNER_ID,
  MAESTRO_HC_D_OPP1_ID,
  MAESTRO_HC_D_OPP2_ID,
  MAESTRO_HC_OTHER_SUBMITTER_ID,
  MAESTRO_HC_OPPONENT_ID,
  MAESTRO_HC_COURT_A_DOUBLES_ID,
  MAESTRO_HC_COURT_C_DOUBLES_ID,
  deleteUserSubmittedCourts,
  homeCourtEntrantFields,
  postedMatchDocument,
  resetHomeCourtNotifications,
  seedFixtureUser,
  seedHomeCourtCourts,
  seedHomeCourtLadder,
} from "./homeCourtFixtures";

export {
  HOME_COURT_VARIANT,
  MAESTRO_HC_DOUBLES_LADDER_ID,
  MAESTRO_HC_DOUBLES_MATCH_ID,
};

export const seedHomeCourtFlowDoubles = async ({
  testUser,
  homeCourt = HOME_COURT_VARIANT.NONE,
}) => {
  if (!testUser?.userId) {
    throw new Error(
      "seedHomeCourtFlowDoubles: testUser with a userId is required",
    );
  }

  const partner = {
    userId: MAESTRO_HC_PARTNER_ID,
    firstName: "Maestro",
    lastName: "Partner",
    username: "maestro_hc_partner",
  };
  const opp1 = {
    userId: MAESTRO_HC_D_OPP1_ID,
    firstName: "Maestro",
    lastName: "Opponent1",
    username: "maestro_hc_d_opp1",
  };
  const opp2 = {
    userId: MAESTRO_HC_D_OPP2_ID,
    firstName: "Maestro",
    lastName: "Opponent2",
    username: "maestro_hc_d_opp2",
  };
  const otherSubmitter = {
    userId: MAESTRO_HC_OTHER_SUBMITTER_ID,
    firstName: "Maestro",
    lastName: "Submitter",
    username: "maestro_hc_other_submitter",
  };
  const courtOwner = {
    userId: MAESTRO_HC_OPPONENT_ID,
    firstName: "Maestro",
    lastName: "Opponent",
    username: "maestro_hc_opponent",
  };

  await Promise.all([
    seedFixtureUser(partner, "maestro-hc-partner@example.com"),
    seedFixtureUser(opp1, "maestro-hc-d-opp1@example.com"),
    seedFixtureUser(opp2, "maestro-hc-d-opp2@example.com"),
    seedFixtureUser(otherSubmitter, "maestro-hc-submitter@example.com"),
    seedFixtureUser(courtOwner, "maestro-hc-opponent@example.com"),
  ]);

  await deleteUserSubmittedCourts(testUser);
  await seedHomeCourtCourts({
    testUser,
    ladderId: MAESTRO_HC_DOUBLES_LADDER_ID,
    ladderName: MAESTRO_HC_DOUBLES_LADDER_NAME,
    ownPendingCourtId: MAESTRO_HC_COURT_A_DOUBLES_ID,
    otherPendingCourtId: MAESTRO_HC_COURT_C_DOUBLES_ID,
  });

  await seedHomeCourtLadder({
    testUser,
    ladderId: MAESTRO_HC_DOUBLES_LADDER_ID,
    ladderName: MAESTRO_HC_DOUBLES_LADDER_NAME,
    ladderType: LADDER_TYPE.DOUBLES,
    maxPlayers: 4,
  });

  const teamAKey = normalizeTeamKey([testUser.userId, partner.userId]);
  const teamBKey = normalizeTeamKey([opp1.userId, opp2.userId]);
  const teamA = buildSeedLadderTeam({
    players: [testUser, partner],
    createdBy: testUser,
    teamName: "Maestro Home Aces",
  });
  const teamB = buildSeedLadderTeam({
    players: [opp1, opp2],
    createdBy: opp1,
    teamName: "Maestro Home Bravos",
  });

  await setDoc(
    doc(db, "ladders", MAESTRO_HC_DOUBLES_LADDER_ID, "ladderTeams", teamAKey),
    { ...teamA, ...homeCourtEntrantFields(homeCourt) },
  );
  await setDoc(
    doc(db, "ladders", MAESTRO_HC_DOUBLES_LADDER_ID, "ladderTeams", teamBKey),
    teamB,
  );

  await Promise.all(
    [testUser, partner, opp1, opp2].map((user) =>
      setDoc(
        doc(
          db,
          "ladders",
          MAESTRO_HC_DOUBLES_LADDER_ID,
          "ladderParticipants",
          user.userId,
        ),
        buildLadderParticipant(user),
      ),
    ),
  );

  await setDoc(
    doc(
      db,
      "ladders",
      MAESTRO_HC_DOUBLES_LADDER_ID,
      "ladderMatches",
      MAESTRO_HC_DOUBLES_MATCH_ID,
    ),
    postedMatchDocument({
      matchId: MAESTRO_HC_DOUBLES_MATCH_ID,
      createdBy: opp1.userId,
      participants: [opp1.userId, opp2.userId],
      ladderType: LADDER_TYPE.DOUBLES,
      teams: [
        {
          teamId: teamBKey,
          teamKey: teamBKey,
          playerIds: [opp1.userId, opp2.userId],
        },
      ],
    }),
  );

  await resetHomeCourtNotifications({
    testUser,
    ladderId: MAESTRO_HC_DOUBLES_LADDER_ID,
    ladderName: MAESTRO_HC_DOUBLES_LADDER_NAME,
  });

  return {
    ladderId: MAESTRO_HC_DOUBLES_LADDER_ID,
    homeCourt,
    matchStatus: LADDER_MATCH_STATUS.POSTED,
  };
};
