import { useState, useCallback } from "react";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentSnapshot,
} from "firebase/firestore";
import { GameVideo } from "@shared/types";
import { COLLECTION_NAMES } from "@shared";

const PAGE_SIZE = 10;

const EMPTY_PLAYER = {
  firstName: "",
  lastName: "",
  userId: "",
  username: "",
};

const EMPTY_TEAMS = {
  team1: { player1: EMPTY_PLAYER },
  team2: { player1: EMPTY_PLAYER },
};

const EMPTY_POSTED_BY = {
  userId: "",
  firstName: "",
  lastName: "",
  username: "",
  profileImage: "",
};

const normalizeGameVideo = (data: Record<string, unknown>): GameVideo =>
  ({
    ...data,
    teams: data.teams ?? EMPTY_TEAMS,
    postedBy: data.postedBy ?? EMPTY_POSTED_BY,
    likedBy: data.likedBy ?? [],
  }) as GameVideo;

interface UseGameVideoFeedReturn {
  videos: GameVideo[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  fetchVideos: () => Promise<void>;
  fetchMoreVideos: () => Promise<void>;
}

export const useGameVideoFeed = (): UseGameVideoFeedReturn => {
  const [videos, setVideos] = useState<GameVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = getFirestore();
      const videosQuery = query(
        collection(db, COLLECTION_NAMES.gameVideos),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      );

      const snapshot = await getDocs(videosQuery);
      const fetched = snapshot.docs.map((doc) =>
        normalizeGameVideo(doc.data()),
      );

      setVideos(fetched);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to fetch game videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMoreVideos = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastDoc) return;

    setIsLoadingMore(true);
    try {
      const db = getFirestore();
      const videosQuery = query(
        collection(db, COLLECTION_NAMES.gameVideos),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE),
      );

      const snapshot = await getDocs(videosQuery);
      const fetched = snapshot.docs.map((doc) =>
        normalizeGameVideo(doc.data()),
      );

      setVideos((prev) => [...prev, ...fetched]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to fetch more game videos:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, lastDoc]);

  return {
    videos,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchVideos,
    fetchMoreVideos,
  };
};
