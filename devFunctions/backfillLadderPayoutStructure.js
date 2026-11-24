import { collection, getDocs, updateDoc } from "firebase/firestore";
import { LADDER_PRE_REGISTRATIONS_COLLECTION, PAYOUT_STRUCTURE } from "@shared";
import { db } from "../services/firebase.config";

const PAYOUT_STRUCTURES = Object.values(PAYOUT_STRUCTURE);

/**
 * Give every ladder and ladder pre-registration without a valid
 * `payoutStructure` the linear one. Documents that already have one are left alone.
 */
export const backfillLadderPayoutStructure = async () => {
  const result = {};
  for (const collectionName of ["ladders", LADDER_PRE_REGISTRATIONS_COLLECTION]) {
    const snapshot = await getDocs(collection(db, collectionName));
    let updated = 0;
    for (const document of snapshot.docs) {
      if (PAYOUT_STRUCTURES.includes(document.data()?.payoutStructure)) continue;
      await updateDoc(document.ref, { payoutStructure: PAYOUT_STRUCTURE.LINEAR });
      updated += 1;
    }
    result[collectionName] = { scanned: snapshot.size, updated };
  }
  return result;
};
