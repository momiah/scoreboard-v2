import { doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_TYPE,
  LADDER_MATCH_STATUS,
  buildLadderParticipant,
} from "@shared";
import {
  HOME_COURT_VARIANT,
  MAESTRO_HC_LADDER_ID,
  MAESTRO_HC_LADDER_NAME,
  MAESTRO_HC_MATCH_ID,
  MAESTRO_HC_OPPONENT_ID,
  MAESTRO_HC_OTHER_SUBMITTER_ID,
  MAESTRO_HC_COURT_A_SINGLES_ID,
  MAESTRO_HC_COURT_C_SINGLES_ID,
  deleteUserSubmittedCourts,
  homeCourtEntrantFields,
  postedMatchDocument,
  resetHomeCourtNotifications,
  seedFixtureUser,
  seedHomeCourtCourts,
  seedHomeCourtLadder,
} from "./homeCourtFixtures";

export { HOME_COURT_VARIANT, MAESTRO_HC_LADDER_ID, MAESTRO_HC_MATCH_ID };

export const seedHomeCourtFlow = async ({
  testUser,
  homeCourt = HOME_COURT_VARIANT.NONE,
  extraLadderCourts = 0,
  ladderStatus = /** @type {string | undefined} */ (undefined),
}) => {
  if (!testUser?.userId) {
    throw new Error("seedHomeCourtFlow: testUser with a userId is required");
  }

  const opponent = {
    userId: MAESTRO_HC_OPPONENT_ID,
    firstName: "Maestro",
    lastName: "Opponent",
    username: "maestro_hc_opponent",
  };
  const otherSubmitter = {
    userId: MAESTRO_HC_OTHER_SUBMITTER_ID,
    firstName: "Maestro",
    lastName: "Submitter",
    username: "maestro_hc_other_submitter",
  };

  await Promise.all([
    seedFixtureUser(opponent, "maestro-hc-opponent@example.com"),
    seedFixtureUser(otherSubmitter, "maestro-hc-submitter@example.com"),
  ]);

  await deleteUserSubmittedCourts(testUser);
  await seedHomeCourtCourts({
    testUser,
    ladderId: MAESTRO_HC_LADDER_ID,
    ladderName: MAESTRO_HC_LADDER_NAME,
    ownPendingCourtId: MAESTRO_HC_COURT_A_SINGLES_ID,
    otherPendingCourtId: MAESTRO_HC_COURT_C_SINGLES_ID,
    extraCourts: extraLadderCourts,
  });

  await seedHomeCourtLadder({
    testUser,
    ladderId: MAESTRO_HC_LADDER_ID,
    ladderName: MAESTRO_HC_LADDER_NAME,
    ladderType: LADDER_TYPE.SINGLES,
    maxPlayers: 2,
    extraCourts: extraLadderCourts,
    ...(ladderStatus ? { status: ladderStatus } : {}),
  });

  await setDoc(
    doc(
      db,
      "ladders",
      MAESTRO_HC_LADDER_ID,
      "ladderParticipants",
      testUser.userId,
    ),
    {
      ...buildLadderParticipant(testUser),
      ...homeCourtEntrantFields(homeCourt),
    },
  );
  await setDoc(
    doc(
      db,
      "ladders",
      MAESTRO_HC_LADDER_ID,
      "ladderParticipants",
      opponent.userId,
    ),
    buildLadderParticipant(opponent),
  );

  await setDoc(
    doc(
      db,
      "ladders",
      MAESTRO_HC_LADDER_ID,
      "ladderMatches",
      MAESTRO_HC_MATCH_ID,
    ),
    postedMatchDocument({
      matchId: MAESTRO_HC_MATCH_ID,
      createdBy: opponent.userId,
      participants: [opponent.userId],
      ladderType: LADDER_TYPE.SINGLES,
    }),
  );

  await resetHomeCourtNotifications({
    testUser,
    ladderId: MAESTRO_HC_LADDER_ID,
    ladderName: MAESTRO_HC_LADDER_NAME,
  });

  return {
    ladderId: MAESTRO_HC_LADDER_ID,
    homeCourt,
    matchStatus: LADDER_MATCH_STATUS.POSTED,
  };
};
