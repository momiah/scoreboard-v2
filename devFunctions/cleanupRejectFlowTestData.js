import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
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

const LADDER_SUBCOLLECTIONS = [
  "ladderMatches",
  "ladderParticipants",
  "ladderTeams",
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

export const cleanupRejectFlowTestData = async ({ testUser } = {}) => {
  await Promise.all([
    deleteLadderTree(MAESTRO_LADDER_ID),
    deleteLadderTree(MAESTRO_D_LADDER_ID),
    deleteDisputesForGame(MAESTRO_GAME_ID),
    deleteDisputesForGame(MAESTRO_D_GAME_ID),
    deleteDoc(doc(db, "users", MAESTRO_OPPONENT_ID)),
    deleteDoc(doc(db, "users", MAESTRO_D_PARTNER_ID)),
    deleteDoc(doc(db, "users", MAESTRO_D_OPP1_ID)),
    deleteDoc(doc(db, "users", MAESTRO_D_OPP2_ID)),
  ]);

  if (testUser?.userId) {
    const notificationsRef = collection(
      db,
      "users",
      testUser.userId,
      "notifications",
    );
    const snap = await getDocs(
      query(
        notificationsRef,
        where("data.ladderId", "in", [MAESTRO_LADDER_ID, MAESTRO_D_LADDER_ID]),
      ),
    );
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }

  return {
    deletedLadders: [MAESTRO_LADDER_ID, MAESTRO_D_LADDER_ID],
    deletedUsers: [
      MAESTRO_OPPONENT_ID,
      MAESTRO_D_PARTNER_ID,
      MAESTRO_D_OPP1_ID,
      MAESTRO_D_OPP2_ID,
    ],
  };
};
