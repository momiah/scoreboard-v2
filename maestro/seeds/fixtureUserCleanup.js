import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase.config";

const FIXTURE_USER_SUBCOLLECTIONS = ["notifications", "chats"];

export const deleteFixtureUserSubcollections = async (userIds) => {
  await Promise.all(
    userIds.flatMap((userId) =>
      FIXTURE_USER_SUBCOLLECTIONS.map(async (sub) => {
        const snap = await getDocs(collection(db, "users", userId, sub));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }),
    ),
  );
};

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
