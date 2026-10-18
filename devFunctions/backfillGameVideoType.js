// devFunctions/backfillGameVideoType.js
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../services/firebase.config";

/**
 * Backfill all gameVideos docs with `videoType: "game"`.
 * - If already present, skip.
 */
export const backfillGameVideoType = async () => {
  const snapshot = await getDocs(collection(db, "gameVideos"));
  const missing = snapshot.docs.filter(
    (videoDoc) => !videoDoc.data()?.videoType,
  );

  for (let i = 0; i < missing.length; i += 400) {
    const batch = writeBatch(db);
    missing
      .slice(i, i + 400)
      .forEach((videoDoc) => batch.update(videoDoc.ref, { videoType: "game" }));
    await batch.commit();
  }

  return { scanned: snapshot.size, updated: missing.length };
};
