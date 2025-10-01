// helpers/backfillUsersUsernameLower.js
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";

/**
 * Backfill all user docs with a `usernameLower` field.
 * - If already present, skip.
 * - If `username` exists, write `usernameLower`.
 */
export const backfillUsernameLower = async () => {
  const usersSnapshot = await getDocs(collection(db, "users"));

  let scanned = 0;
  let updated = 0;

  for (const userDoc of usersSnapshot.docs) {
    scanned += 1;

    const data = userDoc.data() || {};
    const hasUsernameLower =
      typeof data.usernameLower === "string" &&
      data.usernameLower.trim() !== "";
    const hasUsername =
      typeof data.username === "string" && data.username.trim() !== "";

    if (!hasUsernameLower && hasUsername) {
      await updateDoc(userDoc.ref, {
        usernameLower: data.username.trim().toLowerCase(),
      });
      updated += 1;
    }
  }

  return { scanned, updated };
};
