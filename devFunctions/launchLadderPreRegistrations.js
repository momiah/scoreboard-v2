import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  GENDER_TYPE,
  LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
  LADDER_PRE_REGISTRATIONS_COLLECTION,
  LADDER_PRE_REGISTRATION_STATUS,
  LADDER_TYPE,
} from "@shared";
import { db } from "../services/firebase.config";

const LAUNCH_DETAILS = {
  region: "United Kingdom",
  countryCode: "GB",
  image: "",
  currencyType: "GBP",
  maxPlayers: 2048,
};

export const LAUNCH_LADDER_PRE_REGISTRATIONS = [
  {
    preRegistrationId: "launch-cash-mens-singles",
    name: "Men's singles",
    description:
      "The first Cash Ladder. Climb the national rankings and play for a share of the prize pool.",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: GENDER_TYPE.MENS,
    entryFee: 20,
  },
  {
    preRegistrationId: "launch-cash-mens-doubles",
    name: "Men's doubles",
    description:
      "Enter as a team, climb together and play for a share of the prize pool.",
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: GENDER_TYPE.MENS,
    entryFee: 20,
  },
  {
    preRegistrationId: "launch-community-singles",
    name: "Singles",
    description: "Earn your rank. Your finish stays on your profile for good.",
    ladderType: LADDER_TYPE.SINGLES,
    genderType: GENDER_TYPE.MIXED,
    entryFee: 0,
  },
  {
    preRegistrationId: "launch-community-doubles",
    name: "Doubles",
    description: "Climb as a team. Finish the season as your area's top pair.",
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: GENDER_TYPE.MIXED,
    entryFee: 0,
  },
];

/**
 * Create the four launch pre-registrations (open, not yet linked to a ladder).
 * Run once from the Home dev button until the website can create them.
 */
export const createLaunchLadderPreRegistrations = async (actorUserId) => {
  for (const {
    preRegistrationId,
    ...details
  } of LAUNCH_LADDER_PRE_REGISTRATIONS) {
    await setDoc(
      doc(db, LADDER_PRE_REGISTRATIONS_COLLECTION, preRegistrationId),
      {
        ...LAUNCH_DETAILS,
        ...details,
        status: LADDER_PRE_REGISTRATION_STATUS.OPEN,
        expectedOpensAt: null,
        ladderId: null,
        notifiedAt: null,
        createdBy: actorUserId,
        createdAt: serverTimestamp(),
        updatedBy: actorUserId,
        updatedAt: serverTimestamp(),
      },
    );
  }
  return LAUNCH_LADDER_PRE_REGISTRATIONS.length;
};

/** Delete the launch pre-registrations created above, and their registrants. */
export const deleteLaunchLadderPreRegistrations = async () => {
  let registrants = 0;
  for (const { preRegistrationId } of LAUNCH_LADDER_PRE_REGISTRATIONS) {
    const registrantsSnapshot = await getDocs(
      collection(
        db,
        LADDER_PRE_REGISTRATIONS_COLLECTION,
        preRegistrationId,
        LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
      ),
    );
    for (const registrant of registrantsSnapshot.docs) {
      await deleteDoc(registrant.ref);
      registrants += 1;
    }
    await deleteDoc(
      doc(db, LADDER_PRE_REGISTRATIONS_COLLECTION, preRegistrationId),
    );
  }
  return {
    preRegistrations: LAUNCH_LADDER_PRE_REGISTRATIONS.length,
    registrants,
  };
};
