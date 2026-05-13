import React, { useState, useEffect, useRef } from "react";
import { ActivityIndicator, Modal, Dimensions, Animated } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { COMPETITION_TYPES } from "@shared";
import { UserProfile, Teams } from "@shared/types";
import { useVideoUpload, PickedVideo } from "../../hooks/useVideoUpload";

interface VideoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  competitionId: string;
  competitionName: string;
  competitionType:
    | typeof COMPETITION_TYPES.LEAGUE
    | typeof COMPETITION_TYPES.TOURNAMENT;
  gamescore: string;
  date: string;
  teams: Teams;
  currentUser: UserProfile;
  title?: string;
  subtitle?: string;
  icon?: "checkmark-circle-outline" | "videocam-outline";
  iconColor?: string;
  showAddLaterHint?: boolean;
}

const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  visible,
  onClose,
  gameId,
  competitionId,
  competitionName,
  competitionType,
  gamescore,
  date,
  teams,
  currentUser,
  title = "Game Submitted!",
  subtitle = "Opponents have 24 hours to approve or it will be auto-approved.",
  icon = "checkmark-circle-outline",
  iconColor = "#00A2FF",
  showAddLaterHint = true,
}) => {
  const [pickedVideo, setPickedVideo] = useState<PickedVideo | null>(null);
  const [errorText, setErrorText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const { pickVideo, startBackgroundUpload } = useVideoUpload({
    competitionId,
  });

  // ── Simulated progress animation ──────────────────────────────────────────
  useEffect(() => {
    if (isProcessing) {
      progressAnim.setValue(0);
      const crawl = Animated.timing(progressAnim, {
        toValue: 0.85,
        duration: 100000,
        useNativeDriver: false,
      });
      animRef.current = crawl;
      crawl.start();
    }

    if (!isProcessing && pickedVideo) {
      animRef.current?.stop();
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }

    if (!isProcessing && !pickedVideo) {
      animRef.current?.stop();
      progressAnim.setValue(0);
    }
  }, [isProcessing, pickedVideo]);

  const handleClose = () => {
    animRef.current?.stop();
    progressAnim.setValue(0);
    setPickedVideo(null);
    setIsProcessing(false);
    setErrorText("");
    onClose();
  };

  const handlePickVideo = async () => {
    if (isProcessing || isUploading) return;

    setErrorText("");
    setIsProcessing(true);
    const video = await pickVideo();
    setIsProcessing(false);
    if (video) setPickedVideo(video);
  };

  const handleUpload = async () => {
    if (!pickedVideo) return;

    setErrorText("");

    if (pickedVideo.fileSize && pickedVideo.fileSize > 2 * 1024 * 1024 * 1024) {
      setErrorText("Video is too large. Please select a video under 2GB.");
      return;
    }
    if (pickedVideo.duration && pickedVideo.duration < 180000) {
      setErrorText(
        "Video is too short. Please upload a full game of at least 3 minutes.",
      );
      return;
    }
    if (pickedVideo.duration && pickedVideo.duration > 900000) {
      setErrorText(
        "Video is too long. Please select a video under 15 minutes.",
      );
      return;
    }

    setIsUploading(true);

    startBackgroundUpload({
      gameId,
      videoUri: pickedVideo.uri,
      competitionName,
      competitionType,
      gamescore,
      date,
      postedBy: {
        userId: currentUser.userId,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        username: currentUser.username,
        profileImage: currentUser.profileImage,
      },
      teams,
    });

    setIsUploading(false);
    onClose();
  };

  const hasVideo = !!pickedVideo;
  const showProgress = isProcessing || hasVideo;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const progressLabel = isProcessing
    ? "Processing — this may take a couple of minutes"
    : hasVideo
      ? "Ready to upload"
      : "";

  const addLaterScreen =
    competitionType === COMPETITION_TYPES.LEAGUE ? "Scoreboard" : "Fixtures";

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Overlay intensity={50} tint="dark">
        <PopupContent>
          {/* ── Close button ── */}
          <CloseButton onPress={handleClose}>
            <AntDesign name="closecircleo" size={30} color="red" />
          </CloseButton>

          <Ionicons name={icon} size={75} color={iconColor} />
          <Title>{title}</Title>
          <Subtitle>{subtitle}</Subtitle>

          {showAddLaterHint && (
            <>
              <Divider />
              <VideoQuestion>
                Would you like to upload a video of this game?
              </VideoQuestion>
              <Subtitle>
                Or add later by tapping a game card on the {addLaterScreen}{" "}
                screen.
              </Subtitle>
            </>
          )}

          <Divider />

          {/* ── Video picker button ── */}
          <VideoPickerButton
            onPress={handlePickVideo}
            hasVideo={hasVideo}
            disabled={isProcessing || isUploading}
          >
            <Ionicons
              name={hasVideo ? "videocam" : "videocam-outline"}
              size={20}
              color={hasVideo ? "#00A2FF" : "rgba(255,255,255,0.5)"}
            />
            <VideoPickerText hasVideo={hasVideo}>
              {isProcessing
                ? "Processing..."
                : hasVideo
                  ? "Video selected ✓"
                  : "Select a video"}
            </VideoPickerText>
            {isProcessing && <ActivityIndicator size="small" color="#00A2FF" />}
            {hasVideo && !isProcessing && <VideoAttachedDot />}
          </VideoPickerButton>

          {/* ── Simulated progress bar ── */}
          {showProgress && (
            <ProgressContainer>
              <ProgressLabel isProcessing={isProcessing}>
                {progressLabel}
              </ProgressLabel>
              <ProgressTrack>
                <Animated.View
                  style={{
                    height: "100%",
                    width: progressWidth,
                    backgroundColor: hasVideo ? "#00C853" : "#00A2FF",
                    borderRadius: 3,
                  }}
                />
              </ProgressTrack>
            </ProgressContainer>
          )}

          {errorText ? <ErrorText>{errorText}</ErrorText> : null}

          {/* ── Upload button ── */}
          <UploadButton
            onPress={handleUpload}
            disabled={!hasVideo || isUploading || isProcessing}
            style={{
              backgroundColor: !hasVideo ? "#444" : "#00A2FF",
              opacity: !hasVideo ? 0.6 : 1,
            }}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <UploadText>Upload</UploadText>
            )}
          </UploadButton>
        </PopupContent>
      </Overlay>
    </Modal>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const Overlay = styled(BlurView)({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const PopupContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  padding: 30,
  width: SCREEN_WIDTH - 40,
  borderRadius: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.15)",
});

const CloseButton = styled.TouchableOpacity({
  alignSelf: "flex-end",
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 10,
});

const Title = styled.Text({
  fontSize: 22,
  fontWeight: "bold",
  color: "white",
  marginTop: 12,
  marginBottom: 6,
});

const Subtitle = styled.Text({
  fontSize: 13,
  color: "rgba(255,255,255,0.5)",
  textAlign: "center",
  lineHeight: 18,
  marginTop: 10,
});

const Divider = styled.View({
  width: "100%",
  height: 1,
  backgroundColor: "rgba(255,255,255,0.08)",
  marginVertical: 20,
});

const VideoQuestion = styled.Text({
  fontSize: 14,
  color: "rgba(255,255,255,0.8)",
  textAlign: "center",
  marginBottom: 16,
  fontWeight: "500",
});

const VideoPickerButton = styled.TouchableOpacity<{ hasVideo: boolean }>(
  ({ hasVideo }: { hasVideo: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hasVideo ? "#00A2FF" : "rgba(255,255,255,0.15)",
    backgroundColor: hasVideo
      ? "rgba(0, 162, 255, 0.08)"
      : "rgba(255,255,255,0.04)",
    position: "relative",
  }),
);

const VideoPickerText = styled.Text<{ hasVideo: boolean }>(
  ({ hasVideo }: { hasVideo: boolean }) => ({
    color: hasVideo ? "#00A2FF" : "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  }),
);

const VideoAttachedDot = styled.View({
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#00A2FF",
});

const ProgressContainer = styled.View({
  width: "100%",
  marginTop: 16,
  marginBottom: 8,
});

const ProgressLabel = styled.Text<{ isProcessing: boolean }>(
  ({ isProcessing }: { isProcessing: boolean }) => ({
    fontSize: 11,
    color: isProcessing ? "rgba(255,255,255,0.5)" : "#00C853",
    marginBottom: 8,
    textAlign: "center",
    fontStyle: isProcessing ? "italic" : "normal",
  }),
);

const ProgressTrack = styled.View({
  width: "100%",
  height: 6,
  backgroundColor: "rgba(255,255,255,0.08)",
  borderRadius: 3,
  overflow: "hidden",
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 11,
  fontStyle: "italic",
  textAlign: "center",
  marginTop: 8,
  marginBottom: 4,
});

const UploadButton = styled.TouchableOpacity({
  width: "100%",
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#00A2FF",
  marginTop: 20,
});

const UploadText = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "600",
});

export default VideoUploadModal;
