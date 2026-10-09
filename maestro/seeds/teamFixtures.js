import { collection, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase.config";

export const MAESTRO_TEAM_FIXTURE_TAGS = ["join", "disband", "teams-flow"];
export const MAESTRO_CREATED_TEAM_NAME = "Maestro Created Team";

const deleteAllDocs = async (colRef) => {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

export const deleteAllMaestroFixtureTeams = async () => {
  const [tagged, created] = await Promise.all([
    getDocs(
      query(
        collection(db, "teams"),
        where("maestroFixture", "in", MAESTRO_TEAM_FIXTURE_TAGS),
      ),
    ),
    getDocs(
      query(
        collection(db, "teams"),
        where("teamName", "==", MAESTRO_CREATED_TEAM_NAME),
      ),
    ),
  ]);
  await Promise.all(
    [...tagged.docs, ...created.docs].map(async (d) => {
      await deleteAllDocs(collection(d.ref, "requests"));
      await deleteDoc(d.ref);
    }),
  );
};
