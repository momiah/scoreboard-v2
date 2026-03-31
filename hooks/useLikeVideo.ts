import { useState, useCallback } from "react";
import {
  getFirestore,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";

interface UseLikeVideoReturn {
  likedVideoIds: Set<string>;
  handleLike: (gameId: string, userId: string) => Promise<void>;
  initLikedVideos: (likedBy: Record<string, string[]>, userId: string) => void;
}

export const useLikeVideo = (): UseLikeVideoReturn => {
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());

  // Called once on feed load to seed local state from Firestore data
  const initLikedVideos = useCallback(
    (likedByMap: Record<string, string[]>, userId: string) => {
      const liked = new Set<string>();
      for (const [gameId, likedBy] of Object.entries(likedByMap)) {
        if (likedBy.includes(userId)) {
          liked.add(gameId);
        }
      }
      setLikedVideoIds(liked);
    },
    [],
  );

  const handleLike = useCallback(
    async (gameId: string, userId: string) => {
      const db = getFirestore();
      const videoRef = doc(db, COLLECTION_NAMES.gameVideos, gameId);
      const isLiked = likedVideoIds.has(gameId);

      // Optimistic update — update UI immediately
      setLikedVideoIds((prev) => {
        const updated = new Set(prev);
        if (isLiked) {
          updated.delete(gameId);
        } else {
          updated.add(gameId);
        }
        return updated;
      });

      try {
        await updateDoc(videoRef, {
          likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
          likes: increment(isLiked ? -1 : 1),
        });
      } catch (error) {
        // Revert optimistic update on failure
        setLikedVideoIds((prev) => {
          const reverted = new Set(prev);
          if (isLiked) {
            reverted.add(gameId);
          } else {
            reverted.delete(gameId);
          }
          return reverted;
        });
        console.error("Failed to update like:", error);
      }
    },
    [likedVideoIds],
  );

  return { likedVideoIds, handleLike, initLikedVideos };
};
