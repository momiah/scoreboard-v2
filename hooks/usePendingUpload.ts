import { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  COLLECTION_NAMES,
  PendingUpload,
  // COMPETITION_TYPES
} from "@shared";

interface UsePendingUploadsReturn {
  pendingUploads: PendingUpload[];
  isUploading: boolean;
}

// const TEST_PENDING: PendingUpload[] = [
//   {
//     gameId: "test-123",
//     competitionId: "test-comp",
//     competitionName: "Test League",
//     competitionType: COMPETITION_TYPES.LEAGUE,
//     gamescore: "21 - 15",
//     progress: 45,
//     status: "uploading",
//     startedAt: new Date(),
//     uploadId: "test-123",
//     postedBy: {
//       userId: "test",
//       firstName: "Mohsin",
//       lastName: "Miah",
//       username: "mohsin",
//       profileImage: "",
//     },
//     teams: {
//       team1: {
//         player1: {
//           userId: "1",
//           firstName: "Mohsin",
//           lastName: "M",
//           username: "mohsin",
//         },
//         player2: {
//           userId: "2",
//           firstName: "Ali",
//           lastName: "A",
//           username: "ali",
//         },
//       },
//       team2: {
//         player1: {
//           userId: "3",
//           firstName: "John",
//           lastName: "J",
//           username: "john",
//         },
//         player2: {
//           userId: "4",
//           firstName: "Dave",
//           lastName: "D",
//           username: "dave",
//         },
//       },
//     },
//     date: "29-04-2026",
//   },
// ];

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
    pendingUploads: pendingUploads,
    isUploading: pendingUploads.length > 0,
  };
};
