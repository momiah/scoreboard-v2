import React, { useEffect, useCallback, useState, useRef } from "react";
import { Dimensions, TouchableOpacity } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import styled from "styled-components/native";
import { GameVideo, Player } from "@shared/types";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { ccImageEndpoint, COMPETITION_TYPES } from "@shared";
import { formatDisplayName } from "@/helpers/formatDisplayName";
import { Ionicons } from "@expo/vector-icons";
import VideoMenuModal from "../Modals/VideoMenuModal";
import VideoCommentsModal from "../Modals/VideoCommentsModal";

const { width: screenWidth } = Dimensions.get("window");

const VIDEO_HEIGHT = screenWidth * (9 / 16);
const CARD_HEIGHT = VIDEO_HEIGHT + 100;

interface GameVideoCardProps {
  video: GameVideo;
  isActive: boolean;
  onLike: (gameId: string) => void;
  isLiked: boolean;
  initiallyLiked: boolean;
  isSubmissionMode?: boolean;
}

const GameVideoCard: React.FC<GameVideoCardProps> = ({
  video,
  isActive,
  onLike,
  isLiked,
  initiallyLiked,
  isSubmissionMode = false,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const videoRef = useRef<VideoView>(null);

  const player = useVideoPlayer(video.videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const { muted } = useEvent(player, "mutedChange", {
    muted: player.muted,
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive]);

  const handleVideoPress = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPlaying, player]);

  const handleMutePress = useCallback(() => {
    player.muted = !player.muted;
  }, [player]);

  const handleProfilePress = () => {
    navigation.navigate("UserProfile", { userId: video.postedBy.userId });
  };

  const handleCompetitionPress = () => {
    const route =
      video.competitionType === COMPETITION_TYPES.TOURNAMENT
        ? "Tournament"
        : "League";
    const idKey =
      video.competitionType === COMPETITION_TYPES.TOURNAMENT
        ? "tournamentId"
        : "leagueId";
    navigation.navigate(route, { [idKey]: video.competitionId });
  };

  const handlePlayerPress = (player: Player) => {
    navigation.navigate("UserProfile", { userId: player.userId });
  };

  const displayedLikes = (() => {
    if (isLiked && !initiallyLiked) return video.likes + 1;
    if (!isLiked && initiallyLiked) return video.likes - 1;
    return video.likes;
  })();

  return (
    <CardContainer>
      {/* ── Header ── */}
      <HeaderRow>
        <HeaderLeft>
          <UploaderRow>
            <TouchableOpacity onPress={handleProfilePress}>
              <Avatar
                source={
                  video.postedBy.profileImage
                    ? { uri: video.postedBy.profileImage }
                    : { uri: ccImageEndpoint }
                }
              />
            </TouchableOpacity>
            <UploaderInfo>
              <TouchableOpacity onPress={handleProfilePress}>
                <UploaderName numberOfLines={1}>
                  {formatDisplayName(video.postedBy)}
                </UploaderName>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCompetitionPress}>
                <CompetitionName numberOfLines={1}>
                  {video.competitionName}
                </CompetitionName>
              </TouchableOpacity>
            </UploaderInfo>
          </UploaderRow>
        </HeaderLeft>

        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color="rgba(255,255,255,0.6)"
          />
        </TouchableOpacity>
      </HeaderRow>

      {/* ── Video ── */}
      <VideoContainer>
        <TouchableOpacity onPress={handleVideoPress} activeOpacity={1}>
          <StyledVideoView
            ref={videoRef}
            player={player}
            contentFit="cover"
            nativeControls={isFullscreen}
            onFullscreenEnter={() => setIsFullscreen(true)}
            onFullscreenExit={() => setIsFullscreen(false)}
          />
        </TouchableOpacity>
        <VideoControls>
          <MuteButton onPress={handleMutePress}>
            <Ionicons
              name={muted ? "volume-mute" : "volume-high"}
              size={12}
              color="white"
            />
          </MuteButton>
          <FullscreenButton
            onPress={() =>
              isFullscreen
                ? videoRef.current?.exitFullscreen()
                : videoRef.current?.enterFullscreen()
            }
          >
            <Ionicons
              name={isFullscreen ? "contract-outline" : "expand-outline"}
              size={12}
              color="white"
            />
          </FullscreenButton>
        </VideoControls>
      </VideoContainer>

      {/* ── Footer ── */}
      <FooterRow>
        {!isSubmissionMode && (
          <Scorecard video={video} onPlayerPress={handlePlayerPress} />
        )}
        <ActionsRow>
          <ActionButton onPress={() => onLike(video.gameId)}>
            <ActionEmoji>
              {isLiked ? (
                <Ionicons name="flame" size={25} color="#ff9436ff" />
              ) : (
                <Ionicons
                  name="flame-outline"
                  size={25}
                  color="rgba(255,255,255,0.6)"
                />
              )}
            </ActionEmoji>
            <ActionCount>{displayedLikes}</ActionCount>
          </ActionButton>
          <ActionButton onPress={() => setCommentsVisible(true)}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={25}
              color="rgba(255,255,255,0.6)"
            />
            <ActionCount>{video.commentCount}</ActionCount>
          </ActionButton>
        </ActionsRow>
      </FooterRow>

      {menuVisible && (
        <VideoMenuModal
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          video={video}
          isSubmissionMode={isSubmissionMode}
        />
      )}

      {commentsVisible && (
        <VideoCommentsModal
          visible={commentsVisible}
          onClose={() => setCommentsVisible(false)}
          video={video}
        />
      )}
    </CardContainer>
  );
};

interface ScorecardProps {
  video: GameVideo;
  onPlayerPress: (player: Player) => void;
}

const Scorecard: React.FC<ScorecardProps> = ({ video, onPlayerPress }) => {
  const [score1, score2] = video.gamescore.split("-").map((s) => s.trim());
  const team1Player1 = video.teams?.team1?.player1;
  const team1Player2 = video.teams?.team1?.player2 ?? null;
  const team2Player1 = video.teams?.team2?.player1;
  const team2Player2 = video.teams?.team2?.player2 ?? null;

  return (
    <ScorecardOverlay>
      <TeamNamesColumn alignRight={false}>
        {team1Player1 && (
          <TouchableOpacity onPress={() => onPlayerPress(team1Player1)}>
            <PlayerName numberOfLines={1}>
              {formatDisplayName(team1Player1)}
            </PlayerName>
          </TouchableOpacity>
        )}
        {team1Player2 && (
          <TouchableOpacity onPress={() => onPlayerPress(team1Player2)}>
            <PlayerName numberOfLines={1}>
              {formatDisplayName(team1Player2)}
            </PlayerName>
          </TouchableOpacity>
        )}
      </TeamNamesColumn>

      <ScoreRow>
        <ScoreText>{score1}</ScoreText>
        <ScoreDivider> - </ScoreDivider>
        <ScoreText>{score2}</ScoreText>
      </ScoreRow>

      <TeamNamesColumn alignRight>
        {team2Player1 && (
          <TouchableOpacity onPress={() => onPlayerPress(team2Player1)}>
            <PlayerName numberOfLines={1}>
              {formatDisplayName(team2Player1)}
            </PlayerName>
          </TouchableOpacity>
        )}
        {team2Player2 && (
          <TouchableOpacity onPress={() => onPlayerPress(team2Player2)}>
            <PlayerName numberOfLines={1}>
              {formatDisplayName(team2Player2)}
            </PlayerName>
          </TouchableOpacity>
        )}
      </TeamNamesColumn>
    </ScorecardOverlay>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const CardContainer = styled.View({
  width: screenWidth,
  marginBottom: 50,
});

// ── Header ───────────────────────────────────────────────────────────────────

const HeaderRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 10,
});

const HeaderLeft = styled.View({
  flex: 1,
  marginRight: 10,
});

const UploaderRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const Avatar = styled.Image({
  width: 36,
  height: 36,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#00A2FF",
});

const UploaderInfo = styled.View({
  flex: 1,
});

const UploaderName = styled.Text({
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
});

const CompetitionName = styled.Text({
  color: "#00A2FF",
  fontSize: 12,
  marginTop: 2,
});

// ── Video ────────────────────────────────────────────────────────────────────

const VideoContainer = styled.View({
  position: "relative",
});

const StyledVideoView = styled(VideoView)({
  width: screenWidth,
  height: VIDEO_HEIGHT,
});

const VideoControls = styled.View({
  position: "absolute",
  bottom: 12,
  right: 12,
  flexDirection: "row",
  gap: 8,
  alignItems: "center",
});

const MuteButton = styled.TouchableOpacity({
  backgroundColor: "rgba(0,0,0,0.5)",
  borderRadius: 16,
  padding: 6,
});

const FullscreenButton = styled.TouchableOpacity({
  backgroundColor: "rgba(0,0,0,0.5)",
  borderRadius: 16,
  padding: 6,
});

// ── Footer ───────────────────────────────────────────────────────────────────

const FooterRow = styled.View({
  flexDirection: "column",
  justifyContent: "space-between",
  paddingHorizontal: 12,
});

const ActionsRow = styled.View({
  paddingTop: 10,
  flexDirection: "row",
  gap: 16,
  alignItems: "center",
});

const ActionButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
});

const ActionEmoji = styled.Text({
  fontSize: 20,
});

const ActionCount = styled.Text({
  color: "white",
  fontSize: 12,
  fontWeight: "600",
});

// ── Scorecard ───────────────────────────────────────────────────────────────

const PlayerName = styled.Text({
  color: "white",
  fontSize: 12,
  fontWeight: "600",
  paddingHorizontal: 5,
  paddingVertical: 10,
});

const TeamNamesColumn = styled.View<{ alignRight: boolean }>(
  ({ alignRight }: { alignRight: boolean }) => ({
    alignItems: alignRight ? "flex-end" : "flex-start",
    flex: 1,
  }),
);

const ScorecardOverlay = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "rgba(0, 100, 200, 0.15)",
  paddingHorizontal: 10,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.2)",
  gap: 6,
  marginHorizontal: -15,
});

const ScoreRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
});

const ScoreText = styled.Text({
  color: "#00A2FF",
  fontSize: 18,
  fontWeight: "bold",
});

const ScoreDivider = styled.Text({
  color: "rgba(255,255,255,0.4)",
  fontSize: 10,
});

export { CARD_HEIGHT };
export default GameVideoCard;
