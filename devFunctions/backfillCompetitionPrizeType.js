import { collection, getDocs, updateDoc } from "firebase/firestore";
import { getPrizeType } from "@shared";
import { db } from "../services/firebase.config";

const COMPETITION_COLLECTIONS = ["leagues", "tournaments"];

/**
 * Backfill every league and tournament with the Cash / Community prizeType.
 * - Worked out from the entry fee, so free competitions become Community.
 * - Skips docs that already hold the right value.
 */
export const backfillCompetitionPrizeType = async () => {
  const summary = {};

  for (const collectionName of COMPETITION_COLLECTIONS) {
    const snapshot = await getDocs(collection(db, collectionName));
    let scanned = 0;
    let updated = 0;

    for (const competitionDoc of snapshot.docs) {
      scanned += 1;
      const data = competitionDoc.data() || {};
      const prizeType = getPrizeType(data.entryFee);

      if (data.prizeType !== prizeType) {
        await updateDoc(competitionDoc.ref, { prizeType });
        updated += 1;
      }
    }

    summary[collectionName] = { scanned, updated };
  }

  return summary;
};
