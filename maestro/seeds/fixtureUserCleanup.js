import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase.config";

export { deleteFixtureUserSubcollections } from "../fixtures/fixtureUsers";

const FIXTURE_LADDER_ROSTER_SUBCOLLECTIONS = [
  "ladderParticipants",
  "ladderTeams",
];

export const deleteFixtureLadderRoster = async (ladderId) => {
  await Promise.all(
    FIXTURE_LADDER_ROSTER_SUBCOLLECTIONS.map(async (sub) => {
      const snap = await getDocs(collection(db, "ladders", ladderId, sub));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }),
  );
};
