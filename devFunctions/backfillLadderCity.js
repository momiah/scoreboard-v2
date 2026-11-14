import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase.config";

/**
 * Backfill every ladder without a `city` with the most common
 * `location.city` among its courts. Ladders that already have a city, or
 * whose courts have none, are left alone.
 */
export const backfillLadderCity = async () => {
  const laddersSnapshot = await getDocs(collection(db, "ladders"));

  let scanned = 0;
  let updated = 0;
  const skipped = [];

  for (const ladderDoc of laddersSnapshot.docs) {
    scanned += 1;
    const data = ladderDoc.data() || {};
    if (typeof data.city === "string" && data.city.trim() !== "") continue;

    const counts = new Map();
    for (const courtId of data.courtIds ?? []) {
      const court = await getDoc(doc(db, "courts", courtId));
      const city = court.data()?.location?.city?.trim();
      if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
    }

    const [city] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!city) {
      skipped.push(data.name ?? ladderDoc.id);
      continue;
    }

    await updateDoc(ladderDoc.ref, { city });
    updated += 1;
  }

  return { scanned, updated, skipped };
};
