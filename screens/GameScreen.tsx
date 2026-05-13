import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useRef,
} from "react";
import {
  FlatList,
  ActivityIndicator,
  ViewToken,
  ViewabilityConfig,
} from "react-native";
import styled from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { COLLECTION_NAMES, COMPETITION_TYPES } from "@shared";
import { GameVideo, GameTeam, Player } from "@shared/types";
import { UserContext } from "../context/UserContext";
import GameVideoCard from "../components/Feed/GameVideoCard";
import { useLikeVideo } from "../hooks/useLikeVideo";
import VideoUploadModal from "../components/Modals/VideoUploadModal";
import {
  TeamColumn,
  ScoreDisplay,
} from "../components/scoreboard/ScoreboardAtoms";
import ActionPlaceholder from "../components/ActionPlaceholder";

type GameScreenParams = {
  GameScreen: {
    gameId: string;
    competitionId: string;
    competitionType: string;
    competitionName: string;
    gamescore: string;
    date: string;
    team1: GameTeam;
    team2: GameTeam;
  };
};

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 80,
};

const GameScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<GameScreenParams, "GameScreen">>();
  const {
    gameId,
    competitionId,
    competitionType,
    competitionName,
    gamescore,
    date,
    team1,
    team2,
  } = route.params;

  const { currentUser } = useContext(UserContext);
  const { likedVideoIds, handleLike, initLikedVideos } = useLikeVideo();

  const [videos, setVideos] = useState<GameVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // ── Derived values ────────────────────────────────────────────────────────
  const team1Player1 = team1?.player1;
  const team1Player2 = team1?.player2 ?? null;
  const team2Player1 = team2?.player1;
  const team2Player2 = team2?.player2 ?? null;

  const isParticipant = [
    team1Player1?.userId,
    team1Player2?.userId,
    team2Player1?.userId,
    team2Player2?.userId,
  ].includes(currentUser?.userId);

  const hasAlreadyUploaded = videos.some(
    (v) => v.postedBy.userId === currentUser?.userId,
  );

  // ── Fetch videos ──────────────────────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = getFirestore();
      const videosQuery = query(
        collection(db, COLLECTION_NAMES.gameVideos),
        where("gameId", "==", gameId),
        where("videoApproved", "==", true),
      );
      const snapshot = await getDocs(videosQuery);
      const fetched = snapshot.docs.map((doc) => doc.data() as GameVideo);
      setVideos(fetched);

      if (currentUser && fetched.length > 0) {
        const likedByMap = Object.fromEntries(
          fetched.map((v) => [v.gameId, v.likedBy ?? []]),
        );
        initLikedVideos(likedByMap, currentUser.userId);
      }
    } catch (error) {
      console.error("[GameScreen] Failed to fetch videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, currentUser]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ── Viewability ───────────────────────────────────────────────────────────
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

  // ── Placeholder logic ─────────────────────────────────────────────────────
  const renderPlaceholder = () => {
    if (isParticipant) {
      return (
        <PlaceholderWrapper>
          <ActionPlaceholder
            message={
              hasAlreadyUploaded
                ? "Replace your video"
                : videos.length > 0
                  ? "A video has been published — upload your own version!"
                  : "Be the first to upload a video of this game!"
            }
            icon="videocam-outline"
            onPress={() => setUploadModalVisible(true)}
          />
        </PlaceholderWrapper>
      );
    }

    if (!isParticipant && videos.length === 0) {
      return (
        <PlaceholderWrapper>
          <EmptyText>No videos have been uploaded for this game.</EmptyText>
        </PlaceholderWrapper>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "rgb(3, 16, 31)" }}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.gameId + item.postedBy.userId}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Header ── */}
            <Header>
              <BackButton onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={24} color="white" />
              </BackButton>
              <CompetitionName numberOfLines={1}>
                {competitionName}
              </CompetitionName>
            </Header>

            {/* ── Score card ── */}
            <ScoreCard>
              <TeamColumn
                team="left"
                players={team1}
                leagueType={team1Player2 ? "Doubles" : "Singles"}
              />
              <ScoreDisplay
                date={date}
                team1={team1.score}
                team2={team2.score}
                item={{ approvalStatus: "approved", gamescore }}
              />
              <TeamColumn
                team="right"
                players={team2}
                leagueType={team2Player2 ? "Doubles" : "Singles"}
              />
            </ScoreCard>
          </>
        }
        renderItem={({ item }) => (
          <GameVideoCard
            video={item}
            isActive={item.gameId === activeVideoId}
            onLike={(id) => handleLike(id, currentUser?.userId ?? "")}
            isLiked={likedVideoIds.has(item.gameId)}
            initiallyLiked={
              item.likedBy?.includes(currentUser?.userId ?? "") ?? false
            }
            isSubmissionMode={true}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="large"
              color="#00A2FF"
              style={{ marginTop: 40 }}
            />
          ) : (
            renderPlaceholder()
          )
        }
        ListFooterComponent={
          !isLoading && videos.length > 0 ? renderPlaceholder() : null
        }
      />

      {/* ── Upload modal ── */}
      {uploadModalVisible && currentUser && (
        <VideoUploadModal
          visible={uploadModalVisible}
          onClose={() => {
            setUploadModalVisible(false);
            fetchVideos();
          }}
          gameId={gameId}
          competitionId={competitionId}
          competitionName={competitionName}
          competitionType={
            competitionType as
              | typeof COMPETITION_TYPES.LEAGUE
              | typeof COMPETITION_TYPES.TOURNAMENT
          }
          gamescore={gamescore}
          date={date}
          teams={{
            team1: {
              player1: team1Player1 as Player,
              ...(team1Player2 && { player2: team1Player2 as Player }),
            },
            team2: {
              player1: team2Player1 as Player,
              ...(team2Player2 && { player2: team2Player2 as Player }),
            },
          }}
          currentUser={currentUser}
          title="Upload Game Video"
          subtitle="Its your time to shine ✨ Add a video to this game for others to view on the feed."
          icon="videocam-outline"
          showAddLaterHint={false}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 12,
  gap: 12,
});

const BackButton = styled.TouchableOpacity({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "rgba(255,255,255,0.08)",
  justifyContent: "center",
  alignItems: "center",
});

const CompetitionName = styled.Text({
  color: "#00A2FF",
  fontSize: 14,
  fontWeight: "600",
  flex: 1,
});

const ScoreCard = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginHorizontal: 16,
  marginBottom: 16,
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 12,
  paddingVertical: 16,
  paddingHorizontal: 12,
});

const PlaceholderWrapper = styled.View({
  paddingHorizontal: 16,
  paddingVertical: 8,
});

const EmptyText = styled.Text({
  color: "rgba(255,255,255,0.4)",
  fontSize: 14,
  textAlign: "center",
  fontStyle: "italic",
  paddingVertical: 40,
});

export default GameScreen;
