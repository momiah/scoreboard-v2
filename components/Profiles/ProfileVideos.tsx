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
  getDocs,
} from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import { GameVideo } from "@shared/types";
import { UserContext } from "../../context/UserContext";
import GameVideoCard from "../Feed/GameVideoCard";
import { useLikeVideo } from "../../hooks/useLikeVideo";
import LineTabs from "../LineTabs";

interface ProfileVideosProps {
  userId: string;
  isOwnProfile: boolean;
  firstName: string;
}

type VideoTab = "Uploaded" | "Saved" | "Videos of Me";

const VIDEO_TABS = (isOwnProfile: boolean, firstName: string) =>
  isOwnProfile
    ? ["Uploaded", "Saved", "Videos of Me"]
    : ["Uploaded", `Videos of ${firstName}`];

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 80,
};

const ProfileVideos: React.FC<ProfileVideosProps> = ({
  userId,
  isOwnProfile,
  firstName,
}) => {
  const { currentUser } = useContext(UserContext);
  const { likedVideoIds, handleLike, initLikedVideos } = useLikeVideo();

  const [selectedVideoTab, setSelectedVideoTab] =
    useState<VideoTab>("Uploaded");
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
      let fetchedVideos: GameVideo[] = [];

      if (selectedVideoTab === "Uploaded") {
        const snap = await getDocs(
          query(
            collection(db, COLLECTION_NAMES.gameVideos),
            where("postedBy.userId", "==", userId),
            where("videoApproved", "==", true),
          ),
        );
        fetchedVideos = snap.docs.map((doc) => doc.data() as GameVideo);
      } else if (selectedVideoTab === "Saved") {
        const snap = await getDocs(
          query(
            collection(db, COLLECTION_NAMES.savedVideos),
            where("savedBy.userId", "==", userId),
          ),
        );
        fetchedVideos = snap.docs.map((doc) => doc.data() as GameVideo);
      } else if (selectedVideoTab === "Videos of Me") {
        const snap = await getDocs(
          query(
            collection(db, COLLECTION_NAMES.gameVideos),
            where("playerIds", "array-contains", userId),
            where("videoApproved", "==", true),
          ),
        );
        fetchedVideos = snap.docs.map((doc) => doc.data() as GameVideo);
      }

      setVideos(fetchedVideos);

      if (currentUser && fetchedVideos.length > 0) {
        const likedByMap = Object.fromEntries(
          fetchedVideos.map((v) => [v.gameId, v.likedBy ?? []]),
        );
        initLikedVideos(likedByMap, currentUser.userId);
      }
    } catch (error) {
      console.error("[ProfileVideos] Failed to fetch videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedVideoTab]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const availableTabs = VIDEO_TABS(isOwnProfile, firstName);

  return (
    <Container>
      {/* ── Video sub-tabs ── */}
      <LineTabs
        tabs={availableTabs.map((t) => ({ key: t, label: t }))}
        activeTab={selectedVideoTab}
        onTabPress={(tab) => setSelectedVideoTab(tab as VideoTab)}
      />

      {/* ── Content ── */}
      {isLoading ? (
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
      ) : videos.length === 0 ? (
        <EmptyText>
          {selectedVideoTab === "Uploaded" && "No videos uploaded yet."}
          {selectedVideoTab === "Saved" && "No saved videos yet."}
          {selectedVideoTab === "Videos of Me" &&
            `No videos of ${isOwnProfile ? "you" : firstName} yet.`}
        </EmptyText>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.gameId + item.postedBy.userId}
          viewabilityConfigCallbackPairs={
            viewabilityConfigCallbackPairs.current
          }
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <GameVideoCard
              profilePage={true}
              profileVideoTab={selectedVideoTab}
              currentUserId={currentUser?.userId}
              video={item}
              isActive={item.gameId === activeVideoId}
              onLike={(id) => handleLike(id, currentUser?.userId ?? "")}
              isLiked={likedVideoIds.has(item.gameId)}
              initiallyLiked={
                item.likedBy?.includes(currentUser?.userId ?? "") ?? false
              }
            />
          )}
        />
      )}
    </Container>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.View({
  flex: 1,
});

const EmptyText = styled.Text({
  color: "rgba(255,255,255,0.4)",
  fontSize: 14,
  textAlign: "center",
  fontStyle: "italic",
  marginTop: 40,
});

export default ProfileVideos;
