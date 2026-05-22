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
  handleLike: (docId: string, userId: string) => Promise<void>;
  initLikedVideos: (
    likedByMap: Record<string, string[]>,
    userId: string,
  ) => void;
}

export const useLikeVideo = (): UseLikeVideoReturn => {
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());

  // ── Seed local state from Firestore data on feed load ─────────────────────
  const initLikedVideos = useCallback(
    (likedByMap: Record<string, string[]>, userId: string) => {
      const likedSet = new Set<string>();
      for (const [docId, likedBy] of Object.entries(likedByMap)) {
        if (likedBy.includes(userId)) {
          likedSet.add(docId);
        }
      }
      setLikedVideoIds(likedSet);
    },
    [],
  );

  const handleLike = useCallback(
    async (docId: string, userId: string) => {
      const db = getFirestore();
      const videoRef = doc(db, COLLECTION_NAMES.gameVideos, docId);
      const isLiked = likedVideoIds.has(docId);

      // ── Optimistic update ─────────────────────────────────────────────────
      setLikedVideoIds((prevIds) => {
        const updatedIds = new Set(prevIds);
        if (isLiked) {
          updatedIds.delete(docId);
        } else {
          updatedIds.add(docId);
        }
        return updatedIds;
      });

      try {
        await updateDoc(videoRef, {
          likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
          likes: increment(isLiked ? -1 : 1),
        });
      } catch (error) {
        // ── Revert on failure ─────────────────────────────────────────────
        setLikedVideoIds((prevIds) => {
          const revertedIds = new Set(prevIds);
          if (isLiked) {
            revertedIds.add(docId);
          } else {
            revertedIds.delete(docId);
          }
          return revertedIds;
        });
        console.error("Failed to update like:", error);
      }
    },
    [likedVideoIds],
  );

  return { likedVideoIds, handleLike, initLikedVideos };
};
