import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import { FlatList, ViewToken, ViewabilityConfig } from "react-native";
import styled from "styled-components/native";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import { GameVideo } from "@shared/types";
import { UserContext } from "../../context/UserContext";
import GameVideoCard from "../Feed/GameVideoCard";
import { useLikeVideo } from "../../hooks/useLikeVideo";
import { Ionicons } from "@expo/vector-icons";

interface CompetitionVideosProps {
  competitionId: string;
}

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 80,
};

const CompetitionVideos: React.FC<CompetitionVideosProps> = ({
  competitionId,
}) => {
  const { currentUser } = useContext(UserContext);
  const { likedVideoIds, handleLike, initLikedVideos } = useLikeVideo();

  const [videos, setVideos] = useState<GameVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveVideoId(viewableItems[0].item.gameId);
      }
    },
    [],
  );

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig: VIEWABILITY_CONFIG, onViewableItemsChanged },
  ]);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setVideos([]);
    try {
      const db = getFirestore();
      const snap = await getDocs(
        query(
          collection(db, COLLECTION_NAMES.gameVideos),
          where("competitionId", "==", competitionId),
          where("videoApproved", "==", true),
          orderBy("createdAt", "desc"),
        ),
      );
      const fetched = snap.docs.map((doc) => doc.data() as GameVideo);
      setVideos(fetched);

      if (currentUser && fetched.length > 0) {
        const likedByMap = Object.fromEntries(
          fetched.map((v) => [v.gameId, v.likedBy ?? []]),
        );
        initLikedVideos(likedByMap, currentUser.userId);
      }
    } catch (error) {
      console.error("[CompetitionVideos] Failed to fetch videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [competitionId, currentUser]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  if (isLoading) {
    return (
      <>
        <GameVideoCard
          isLoading
          isActive={false}
          onLike={() => {}}
          isLiked={false}
          initiallyLiked={false}
        />
        <GameVideoCard
          isLoading
          isActive={false}
          onLike={() => {}}
          isLiked={false}
          initiallyLiked={false}
        />
      </>
    );
  }

  if (videos.length === 0) {
    return (
      <EmptyContainer>
        <Ionicons
          name="videocam-off-outline"
          size={100}
          color="rgba(255,255,255,0.2)"
        />
        <EmptyText>
          No videos have been uploaded for this competition yet.
        </EmptyText>
      </EmptyContainer>
    );
  }

  return (
    <FlatList
      data={videos}
      keyExtractor={(item) => item.gameId + item.postedBy.userId}
      viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <GameVideoCard
          video={item}
          isActive={item.gameId === activeVideoId}
          onLike={(id) => handleLike(id, currentUser?.userId ?? "")}
          isLiked={likedVideoIds.has(item.gameId)}
          initiallyLiked={
            item.likedBy?.includes(currentUser?.userId ?? "") ?? false
          }
          currentUserId={currentUser?.userId}
          onVideoDeleted={fetchVideos}
          competitionPage={true}
        />
      )}
    />
  );
};

const EmptyText = styled.Text({
  color: "rgba(255,255,255,0.4)",
  fontSize: 14,
  textAlign: "center",
  fontStyle: "italic",
  marginTop: 40,
  paddingHorizontal: 20,
});

const EmptyContainer = styled.View({
  alignItems: "center",
  marginTop: 60,
  gap: 12,
});

export default CompetitionVideos;
