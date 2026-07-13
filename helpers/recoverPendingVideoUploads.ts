import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  setDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { COLLECTION_NAMES } from "@shared";
import { GameVideoUploadPayload } from "@shared/types";

type CheckR2VideoParams = {
  gameId: string;
  competitionId: string;
};

type CheckR2VideoResponse = {
  videoUrl: string | null;
};

const ABANDON_AFTER_MS = 60 * 60 * 1000; // 1 hour of no activity

// Call once in AppContent useEffect when currentUser is available
export const recoverPendingVideoUploads = async (userId: string) => {
  const db = getFirestore();
  const functions = getFunctions();

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION_NAMES.pendingVideoUploads),
      where("postedBy.userId", "==", userId),
    ),
  );

  if (snapshot.empty) return;

  const checkR2VideoExists = httpsCallable<
    CheckR2VideoParams,
    CheckR2VideoResponse
  >(functions, "checkR2VideoExists");

  const updateGameVideoUrl = httpsCallable<GameVideoUploadPayload, void>(
    functions,
    "updateGameVideoUrl",
  );

  for (const docSnap of snapshot.docs) {
    const {
      gameId,
      competitionId,
      competitionName,
      competitionType,
      gamescore,
      date,
      postedBy,
      teams,
      progress,
      platform,
      startedAt,
    } = docSnap.data();

    try {
      const { data } = await checkR2VideoExists({ gameId, competitionId });

      if (data.videoUrl) {
        // ── File made it to R2 — finish the job the killed app didn't ────────
        await updateGameVideoUrl({
          gameId,
          competitionId,
          competitionName,
          competitionType,
          videoUrl: data.videoUrl,
          gamescore,
          date,
          postedBy,
          teams,
        });
        await deleteDoc(docSnap.ref);
        continue;
      }

      // ── No file in R2 — decide: still uploading, or dead? ──────────────────
      const startedMs =
        startedAt?.toMillis?.() ??
        (startedAt?.seconds ? startedAt.seconds * 1000 : null);

      const isAbandoned =
        startedMs !== null && Date.now() - startedMs > ABANDON_AFTER_MS;

      if (isAbandoned) {
        // Older than 1 hour with no file — treat as dead (app killed mid-upload).
        // Record for diagnostics, then remove so no phantom toast remains.
        const failedDocRef = doc(
          db,
          COLLECTION_NAMES.failedVideoUploads,
          `${gameId}_${Date.now()}`,
        );
        await setDoc(failedDocRef, {
          gameId,
          competitionId,
          userId: postedBy?.userId ?? userId,
          errorMessage: "abandoned — app killed mid-upload (no activity 1h+)",
          lastProgress: progress ?? 0,
          platform: platform ?? "unknown",
          failedAt: new Date(),
        });
        await deleteDoc(docSnap.ref);
      }
      // Younger than 1 hour with no file — genuinely may still be uploading.
      // Leave the record intact.
    } catch (error) {
      console.error(`Failed to recover upload for game ${gameId}:`, error);
    }
  }
};
