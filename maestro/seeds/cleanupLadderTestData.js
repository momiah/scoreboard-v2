import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { DISPUTES_COLLECTION } from "@shared";
import {
  MAESTRO_LADDER_ID,
  MAESTRO_GAME_ID,
  MAESTRO_OPPONENT_ID,
} from "./seedRejectGameFlow";
import {
  MAESTRO_D_LADDER_ID,
  MAESTRO_D_GAME_ID,
  MAESTRO_D_PARTNER_ID,
  MAESTRO_D_OPP1_ID,
  MAESTRO_D_OPP2_ID,
} from "./seedRejectGameFlowDoubles";
import {
  MAESTRO_AG_LADDER_ID,
  MAESTRO_AG_GAME_ID,
  MAESTRO_AG_OPPONENT_ID,
} from "./seedAddApproveGameFlow";
import {
  MAESTRO_AGD_LADDER_ID,
  MAESTRO_AGD_GAME_ID,
  MAESTRO_AGD_PARTNER_ID,
  MAESTRO_AGD_OPP1_ID,
  MAESTRO_AGD_OPP2_ID,
} from "./seedAddApproveGameFlowDoubles";
import {
  MAESTRO_HC_LADDER_IDS,
  MAESTRO_HC_ALL_COURT_IDS,
  MAESTRO_HC_FIXTURE_USER_IDS,
  deleteUserSubmittedCourts,
} from "./homeCourtFixtures";
import {
  MAESTRO_PO_LADDER_IDS,
  cleanupLadderPlayoffsTestData,
} from "./seedLadderPlayoffs";
import {
  MAESTRO_JOIN_LADDER_IDS,
  cleanupLadderJoinTestData,
} from "./seedLadderJoinFlow";
import { deleteReportsForLadder } from "./reportFixtures";
import {
  MAESTRO_TEAM_LADDER_ID,
  cleanupTeamFlowTestData,
} from "./seedTeamFlow";
import {
  MAESTRO_CANCEL_LADDER_ID,
  cleanupMatchCancellationTestData,
} from "./seedMatchCancellationFlow";
import {
  MAESTRO_DISBAND_LADDER_IDS,
  cleanupTeamDisbandTestData,
} from "./seedTeamDisbandFlow";

const LADDER_SUBCOLLECTIONS = [
  "ladderMatches",
  "ladderParticipants",
  "ladderTeams",
  "ladderMembers",
];

const ALL_LADDER_IDS = [
  MAESTRO_LADDER_ID,
  MAESTRO_D_LADDER_ID,
  MAESTRO_AG_LADDER_ID,
  MAESTRO_AGD_LADDER_ID,
  ...MAESTRO_HC_LADDER_IDS,
];
const ALL_GAME_IDS = [
  MAESTRO_GAME_ID,
  MAESTRO_D_GAME_ID,
  MAESTRO_AG_GAME_ID,
  MAESTRO_AGD_GAME_ID,
];
const ALL_FIXTURE_USER_IDS = [
  MAESTRO_OPPONENT_ID,
  MAESTRO_D_PARTNER_ID,
  MAESTRO_D_OPP1_ID,
  MAESTRO_D_OPP2_ID,
  MAESTRO_AG_OPPONENT_ID,
  MAESTRO_AGD_PARTNER_ID,
  MAESTRO_AGD_OPP1_ID,
  MAESTRO_AGD_OPP2_ID,
  ...MAESTRO_HC_FIXTURE_USER_IDS,
];

const deleteAllDocs = async (colRef) => {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

const deleteLadderTree = async (ladderId) => {
  await Promise.all(
    LADDER_SUBCOLLECTIONS.map((sub) =>
      deleteAllDocs(collection(db, "ladders", ladderId, sub)),
    ),
  );
  await deleteDoc(doc(db, "ladders", ladderId));
};

const deleteDisputesForGame = async (gameId) => {
  const snap = await getDocs(
    query(collection(db, DISPUTES_COLLECTION), where("gameId", "==", gameId)),
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

export const cleanupLadderTestData = async ({
  testUser = null,
  ladderIds = ALL_LADDER_IDS,
  gameIds = ALL_GAME_IDS,
  fixtureUserIds = ALL_FIXTURE_USER_IDS,
  courtIds = MAESTRO_HC_ALL_COURT_IDS,
} = {}) => {
  await Promise.all([
    ...ladderIds.map((id) => deleteLadderTree(id)),
    ...gameIds.map((id) => deleteDisputesForGame(id)),
    ...fixtureUserIds.map((id) => deleteDoc(doc(db, "users", id))),
    ...courtIds.map((id) => deleteDoc(doc(db, "courts", id))),
  ]);
  const deletedCourts = await deleteUserSubmittedCourts(testUser);
  const playoffs = await cleanupLadderPlayoffsTestData();
  const join = await cleanupLadderJoinTestData();
  const disband = await cleanupTeamDisbandTestData();
  const cancellation = await cleanupMatchCancellationTestData();
  const teams = await cleanupTeamFlowTestData();

  const notificationLadderIds = [
    ...ladderIds,
    ...MAESTRO_PO_LADDER_IDS,
    ...MAESTRO_JOIN_LADDER_IDS,
    ...MAESTRO_DISBAND_LADDER_IDS,
    MAESTRO_CANCEL_LADDER_ID,
    MAESTRO_TEAM_LADDER_ID,
  ];
  await Promise.all(notificationLadderIds.map(deleteReportsForLadder));
  if (testUser?.userId && notificationLadderIds.length) {
    const notificationsRef = collection(
      db,
      "users",
      testUser.userId,
      "notifications",
    );
    const snap = await getDocs(
      query(
        notificationsRef,
        where("data.ladderId", "in", notificationLadderIds),
      ),
    );
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }

  return {
    deletedLadders: ladderIds,
    deletedUsers: fixtureUserIds,
    deletedCourts: [...courtIds, ...deletedCourts],
    playoffs,
    join,
    disband,
    cancellation,
    teams,
  };
};
