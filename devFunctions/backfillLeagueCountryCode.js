// helpers/backfillLeagueCountryCode.js
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";

/**
 * Backfill all league docs with a `countryCode` field.
 * - If already present, skip.
 * - If `location.countryCode` exists, write `countryCode`.
 */
export const backfillLeagueCountryCode = async () => {
  const leaguesSnapshot = await getDocs(collection(db, "leagues"));

  let scanned = 0;
  let updated = 0;

  for (const leagueDoc of leaguesSnapshot.docs) {
    scanned += 1;

    const data = leagueDoc.data() || {};
    const hasCountryCode =
      typeof data.countryCode === "string" && data.countryCode.trim() !== "";
    const hasLocationCountryCode =
      typeof data.location?.countryCode === "string" &&
      data.location.countryCode.trim() !== "";

    if (!hasCountryCode && hasLocationCountryCode) {
      await updateDoc(leagueDoc.ref, {
        countryCode: data.location.countryCode.trim(),
      });
      updated += 1;
    }
  }

  return { scanned, updated };
};
