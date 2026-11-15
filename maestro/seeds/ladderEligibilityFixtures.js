import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_ELIGIBILITY_COLLECTION,
  getLadderEligibilityId,
} from "@shared";

/** A verified court that free Maestro ladders list, so joining passes the location check near it. */
export const MAESTRO_ELIGIBILITY_COURT_ID = "maestro-eligibility-court";
export const MAESTRO_ELIGIBILITY_LADDER_IDS = [
  "maestro-join-singles-ladder",
  "maestro-join-doubles-ladder",
  "maestro-team-ladder",
  "maestro-disband-ladder",
  "maestro-disband-done-ladder",
];

const eligibilityCourt = () => ({
  courtId: MAESTRO_ELIGIBILITY_COURT_ID,
  courtName: "Maestro Eligibility Court",
  location: {
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "WC2N 5DU",
    address: "Trafalgar Square",
    latitude: 51.5074,
    longitude: -0.1278,
  },
  verified: true,
  submittedBy: "maestro-eligibility-admin",
  verifiedBy: "maestro-eligibility-admin",
  verifiedAt: new Date(),
  createdAt: new Date(),
});

const eligibilityRef = (ladderId, userId) =>
  doc(db, LADDER_ELIGIBILITY_COLLECTION, getLadderEligibilityId(ladderId, userId));

/** Writes the court and clears any earlier location check for this ladder. */
export const prepareEligibilityCourt = async ({ testUser, ladderId }) => {
  await setDoc(doc(db, "courts", MAESTRO_ELIGIBILITY_COURT_ID), eligibilityCourt());
  await deleteDoc(eligibilityRef(ladderId, testUser.userId));
};

export const cleanupLadderEligibilityFixtures = async ({ testUser }) => {
  await deleteDoc(doc(db, "courts", MAESTRO_ELIGIBILITY_COURT_ID));
  if (!testUser?.userId) return;
  await Promise.all(
    MAESTRO_ELIGIBILITY_LADDER_IDS.map((id) => deleteDoc(eligibilityRef(id, testUser.userId))),
  );
};
