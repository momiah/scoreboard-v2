import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  nextLadderHomeCourtChanges,
  toLadderHomeCourt,
} from "../../helpers/ladderHomeCourt";
import {
  MAESTRO_HC_DOUBLES_LADDER_ID,
  MAESTRO_HC_PARTNER_ID,
} from "./homeCourtFixtures";

export const mockPartnerSetHomeCourt = async ({ testUser, courtId }) => {
  if (!testUser?.userId || !courtId) {
    throw new Error(
      "mockPartnerSetHomeCourt: testUser and courtId are both required",
    );
  }

  const teamSnap = await getDocs(
    query(
      collection(db, "ladders", MAESTRO_HC_DOUBLES_LADDER_ID, "ladderTeams"),
      where("playerIds", "array-contains", testUser.userId),
      limit(1),
    ),
  );
  if (teamSnap.empty) {
    throw new Error("mockPartnerSetHomeCourt: the test user has no team");
  }
  const courtSnap = await getDoc(doc(db, "courts", courtId));
  if (!courtSnap.exists()) {
    throw new Error(`mockPartnerSetHomeCourt: court ${courtId} not found`);
  }

  const teamDoc = teamSnap.docs[0];
  await updateDoc(teamDoc.ref, {
    homeCourt: toLadderHomeCourt({ ...courtSnap.data(), courtId }),
    homeCourtChanges: nextLadderHomeCourtChanges(teamDoc.data()),
    homeCourtUpdatedAt: new Date(),
    homeCourtUpdatedBy: MAESTRO_HC_PARTNER_ID,
  });
  return { teamId: teamDoc.id, courtId };
};
