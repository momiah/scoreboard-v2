import { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { COLLECTION_NAMES, PendingUpload } from "@shared";

interface UsePendingUploadsReturn {
  pendingUploads: PendingUpload[];
  isUploading: boolean;
}

export const usePendingUpload = (
  userId: string | undefined,
): UsePendingUploadsReturn => {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  useEffect(() => {
    if (!userId) return;

    const db = getFirestore();

    const pendingQuery = query(
      collection(db, COLLECTION_NAMES.pendingVideoUploads),
      where("postedBy.userId", "==", userId),
    );

    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const uploads = snapshot.docs.map((doc) => doc.data() as PendingUpload);
        setPendingUploads(uploads);
      },
      (error) => {
        console.error("[usePendingUploads] Snapshot error:", error);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return {
    pendingUploads,
    isUploading: pendingUploads.length > 0,
  };
};
