import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
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

// Call once in App.tsx useEffect on app launch
export const recoverPendingVideoUploads = async () => {
  const db = getFirestore();
  const functions = getFunctions();

  const snapshot = await getDocs(
    collection(db, COLLECTION_NAMES.pendingVideoUploads),
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
    } = docSnap.data();

    try {
      const { data } = await checkR2VideoExists({ gameId, competitionId });

      if (data.videoUrl) {
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
      }
      // No file found means upload is still in progress — leave the record intact
    } catch (error) {
      console.error(`Failed to recover upload for game ${gameId}:`, error);
    }
  }
};
