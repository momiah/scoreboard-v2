import {
  collection,
  documentId,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import {
  fixtureLocationFor,
  isLocationMissing,
} from "../maestro/fixtures/fixtureUsers";

const FIXTURE_USER_ID_PREFIX = "maestro";

export const backfillFixtureUserLocations = async () => {
  const snapshot = await getDocs(
    query(
      collection(db, "users"),
      where(documentId(), ">=", FIXTURE_USER_ID_PREFIX),
      where(documentId(), "<", `${FIXTURE_USER_ID_PREFIX}`),
    ),
  );

  let scanned = 0;
  let updated = 0;

  for (const userDoc of snapshot.docs) {
    scanned += 1;
    const location = userDoc.data()?.location;
    if (!isLocationMissing(location)) continue;

    const filled = { ...fixtureLocationFor(userDoc.id) };
    Object.entries(location ?? {}).forEach(([key, value]) => {
      if (typeof value !== "string" || value.trim() !== "") filled[key] = value;
    });
    await updateDoc(userDoc.ref, { location: filled });
    updated += 1;
  }

  return { scanned, updated };
};
