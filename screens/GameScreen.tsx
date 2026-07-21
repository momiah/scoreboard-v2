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
  RefreshControl,
} from "react-native";

import styled from "styled-components/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import {
  COLLECTION_NAMES,
  COMPETITION_TYPES,
  notificationTypes,
} from "@shared";
import {
  GameVideo,
  GameTeam,
  Player,
  NormalizedCompetition,
  Game,
} from "@shared/types";
import { buildCompetitionConfig } from "@/helpers/getCompetitionConfig";
import { UserContext } from "../context/UserContext";
import GameVideoCard from "../components/Feed/GameVideoCard";
import { useLikeVideo } from "../hooks/useLikeVideo";
import { useGameApproval } from "../hooks/useGameApproval";
import VideoUploadModal from "../components/Modals/VideoUploadModal";
import {
  TeamColumn,
  ScoreDisplay,
} from "../components/scoreboard/ScoreboardAtoms";
import ActionPlaceholder from "../components/ActionPlaceholder";
import { usePendingUpload } from "@/hooks/usePendingUpload";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";

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
  const { approve, decline, loadingDecision, findGameInCompetition } =
    useGameApproval();

  const [videos, setVideos] = useState<GameVideo[]>([]);
  const [liveGame, setLiveGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { pendingUploads } = usePendingUpload(currentUser?.userId);

  const isLeague = competitionType === COMPETITION_TYPES.LEAGUE;
  const config = buildCompetitionConfig(isLeague);

  const approvalNotificationType = isLeague
    ? notificationTypes.ACTION.ADD_GAME.LEAGUE
    : notificationTypes.ACTION.ADD_GAME.TOURNAMENT;

  // ── Derived values ────────────────────────────────────────────────────────
  const team1Player1 = team1?.player1;
  const team1Player2 = team1?.player2 ?? null;
  const team2Player1 = team2?.player1;
  const team2Player2 = team2?.player2 ?? null;

  // Live game data is the source of truth for participation — route param
  // team payloads (from feed/notification docs) may lack userIds
  const participantTeam1 = liveGame?.team1 ?? team1;
  const participantTeam2 = liveGame?.team2 ?? team2;

  const participantIds = [
    participantTeam1?.player1?.userId,
    participantTeam1?.player2?.userId,
    participantTeam2?.player1?.userId,
    participantTeam2?.player2?.userId,
  ].filter(Boolean);

  const isParticipant =
    !!currentUser?.userId && participantIds.includes(currentUser.userId);

  const hasAlreadyUploaded = videos.some(
    (video) => video.postedBy.userId === currentUser?.userId,
  );

  // ── Approval eligibility ──────────────────────────────────────────────────
  const isReporter = liveGame?.reporter === currentUser?.userId;
  const approvalLimitReached =
    liveGame?.approvalStatus === notificationTypes.RESPONSE.APPROVED_GAME;
  const autoApproved = liveGame?.autoApproved ?? false;
  const isPending =
    liveGame?.approvalStatus === "Pending" ||
    liveGame?.approvalStatus === "pending";

  const showApproval = isParticipant && !isReporter && liveGame !== null;
  const canApprove =
    showApproval && isPending && !approvalLimitReached && !autoApproved;

  const approvalLabel = approvalLimitReached
    ? "Game approved"
    : autoApproved
      ? "Auto-approved"
      : "Approve this game?";

  // ── Live game subscription ────────────────────────────────────────────────
  useEffect(() => {
    const db = getFirestore();
    const competitionRef = doc(db, config.collectionName, competitionId);

    const unsubscribe = onSnapshot(
      competitionRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setLiveGame(null);
          return;
        }
        const normalizedCompetition = normalizeCompetitionData({
          rawData: snapshot.data(),
          competitionType: config.competitionType,
        }) as NormalizedCompetition;

        setLiveGame(
          findGameInCompetition(normalizedCompetition, gameId, config.isLeague),
        );
      },
      (error) => {
        console.error("[GameScreen] Competition subscription error:", error);
      },
    );

    return () => unsubscribe();
  }, [competitionId, gameId, competitionType]);

  // ── Real-time video subscription ──────────────────────────────────────────
  useEffect(() => {
    const db = getFirestore();
    const videosQuery = query(
      collection(db, COLLECTION_NAMES.gameVideos),
      where("gameId", "==", gameId),
      where("videoApproved", "==", true),
    );

    const unsubscribe = onSnapshot(
      videosQuery,
      (snapshot) => {
        const fetched = snapshot.docs.map((video) => video.data() as GameVideo);
        setVideos(fetched);
        setIsLoading(false);

        if (currentUser && fetched.length > 0) {
          const likedByMap = Object.fromEntries(
            fetched.map((video) => [video.gameId, video.likedBy ?? []]),
          );
          initLikedVideos(likedByMap, currentUser.userId);
        }
      },
      (error) => {
        console.error("[GameScreen] Video subscription error:", error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [gameId, currentUser]);

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

  const isUploadingThisGame = pendingUploads.some(
    (upload) => upload.gameId === gameId,
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // onSnapshot keeps data live, this is just for the pull-to-refresh UX
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // ── Approval handlers ─────────────────────────────────────────────────────
  const handleApprove = useCallback(() => {
    if (!liveGame) return;
    approve({
      gameId,
      competitionId,
      senderId: liveGame.reporter,
      notificationType: approvalNotificationType,
    });
  }, [approve, liveGame, gameId, competitionId, approvalNotificationType]);

  const handleDecline = useCallback(() => {
    if (!liveGame) return;
    decline({
      gameId,
      competitionId,
      senderId: liveGame.reporter,
      notificationType: approvalNotificationType,
    });
  }, [decline, liveGame, gameId, competitionId, approvalNotificationType]);

  // ── Placeholder logic ─────────────────────────────────────────────────────
  const renderPlaceholder = () => {
    if (isParticipant) {
      return (
        <PlaceholderWrapper>
          <ActionPlaceholder
            message={
              isUploadingThisGame
                ? "Upload in progress..."
                : hasAlreadyUploaded
                  ? "Replace your video"
                  : videos.length > 0
                    ? "A video has been published — upload your own version!"
                    : "Be the first to upload a video of this game!"
            }
            icon={
              isUploadingThisGame ? "cloud-upload-outline" : "videocam-outline"
            }
            onPress={() => {
              if (!isUploadingThisGame) setUploadModalVisible(true);
            }}
            disabled={isUploadingThisGame}
          />
        </PlaceholderWrapper>
      );
    }

    if (videos.length === 0) {
      return (
        <PlaceholderWrapper>
          <EmptyText>No videos have been uploaded for this game.</EmptyText>
          <Ionicons
            name="videocam-off-outline"
            size={100}
            color="rgba(255,255,255,0.2)"
            style={{ alignSelf: "center", marginBottom: 8 }}
          />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="white"
            colors={["white"]}
            progressBackgroundColor="#00A2FF"
          />
        }
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

              {showApproval && (
                <ApprovalContainer>
                  <ApprovalLabel disabled={!canApprove}>
                    {approvalLabel}
                  </ApprovalLabel>
                  <ApprovalActions>
                    <IconButton
                      variant="decline"
                      disabled={!canApprove || loadingDecision}
                      onPress={handleDecline}
                    >
                      <Ionicons name="close" size={15} color="white" />
                    </IconButton>
                    <IconButton
                      variant="accept"
                      disabled={!canApprove || loadingDecision}
                      onPress={handleApprove}
                    >
                      {loadingDecision ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons name="checkmark" size={15} color="white" />
                      )}
                    </IconButton>
                  </ApprovalActions>
                </ApprovalContainer>
              )}
            </Header>
            {/* ── Score card ── */}
            {liveGame && (
              <ScoreCard>
                <TeamColumn
                  team="left"
                  players={team1}
                  leagueType={team1Player2 ? "Doubles" : "Singles"}
                />
                <ScoreDisplay
                  date={liveGame.date ?? date}
                  team1={liveGame.team1.score}
                  team2={liveGame.team2.score}
                  item={liveGame}
                />
                <TeamColumn
                  team="right"
                  players={team2}
                  leagueType={team2Player2 ? "Doubles" : "Singles"}
                />
              </ScoreCard>
            )}
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
            currentUserId={currentUser?.userId}
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
          onClose={() => setUploadModalVisible(false)}
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

const ApprovalContainer = styled.View({
  alignItems: "center",
  flexDirection: "row",
  gap: 10,
});

const ApprovalLabel = styled.Text(({ disabled }: { disabled: boolean }) => ({
  color: disabled ? "rgba(255,255,255,0.4)" : "#00A2FF",
  fontSize: 11,
  fontWeight: "600",
}));

const ApprovalActions = styled.View({
  flexDirection: "row",
  gap: 8,
});

const IconButton = styled.TouchableOpacity(
  ({
    disabled,
    variant,
  }: {
    disabled: boolean;
    variant: "decline" | "accept";
  }) => ({
    width: 27,
    height: 27,
    borderRadius: 18,
    backgroundColor: disabled
      ? "#888"
      : variant === "decline"
        ? "red"
        : "#00A2FF",
    opacity: disabled ? 0.6 : 1,
    justifyContent: "center",
    alignItems: "center",
  }),
);

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
