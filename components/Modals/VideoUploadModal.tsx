import React, { useState, useEffect, useRef, useContext } from "react";
import {
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { File } from "expo-file-system";
import { Video } from "react-native-compressor";
import { COMPETITION_TYPES } from "@shared";
import { UserProfile, Teams } from "@shared/types";
import { useVideoUpload, PickedVideo } from "../../hooks/useVideoUpload";
import { GameContext } from "../../context/GameContext";

// Quality is irrelevant — transcodeVideo re-encodes server-side. We only need
// the file small enough to reliably arrive: maxSize caps the longest edge
// (~720p) and bitrate keeps the output predictably small.
const COMPRESSION_OPTIONS = {
  compressionMethod: "manual",
  maxSize: 1280,
  bitrate: 2_500_000,
  minimumFileSizeForCompress: 0,
} as const;

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

const PROCESSING_MESSAGES = [
  "Processing — this may take a couple of minutes",
  "Please do not close this modal",
  ...(Platform.OS === "ios"
    ? ["Videos stored in iCloud may take longer to load - "]
    : []),
  "Preparing your video for upload",
  "Analysing video quality...",
  "Getting your video ready for the feed",
  "Please ensure you have a stable internet connection",
  "Videos must be full games only - no highlights or clips",
  "Inappropriate videos will be removed",
  "Please ensure your video meets all guidelines",
  "Reported videos may result in account suspension",
  "Almost there...",
  "Thank you for your patience!",
  "Finalizing your upload",
];

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
  // pickedVideo holds the ORIGINAL asset (compression input + videoLength).
  // compressedUri is set only once compression COMPLETES — it gates the
  // "ready"/success UI and enables the Upload button. isCompressing is the
  // modal's single processing flag: compression begins the moment a video is
  // picked and is the only work the modal does before handing off to upload.
  const [pickedVideo, setPickedVideo] = useState<PickedVideo | null>(null);
  const [compressedUri, setCompressedUri] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressPct, setCompressPct] = useState(0);
  // Rotation step, not a raw array index: every third slot shows the live
  // compression %, so the percentage appears after every two status messages.
  const [messageStep, setMessageStep] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const messageOpacity = useRef(new Animated.Value(1)).current;

  // Refs mirror state for use inside async callbacks / the close handler, which
  // can fire at any point relative to React's render cycle.
  const compressProgressRef = useRef(0);
  const cancellationIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const compressedUriRef = useRef<string | null>(null);

  const { pickVideo, startBackgroundUpload } = useVideoUpload({
    competitionId,
  });
  const { recordVideoUploadFailure } = useContext(GameContext);

  // ── Rotating processing messages with fade ────────────────────────────────
  useEffect(() => {
    if (!isCompressing) {
      setMessageStep(0);
      return;
    }
    const interval = setInterval(() => {
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }).start(() => {
        // Wrap over the full interleaved cycle (2 messages + 1 percentage per
        // 3 steps) so both the percentage cadence and the message order stay
        // seamless when it loops.
        setMessageStep((prev) => (prev + 1) % (PROCESSING_MESSAGES.length * 3));
        Animated.timing(messageOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isCompressing]);

  // ── Validate the ORIGINAL before compressing (duration gates game length;
  //    size is a loose sanity bound — the COMPRESSED size is what gets uploaded).
  const getGuardError = (video: PickedVideo): string | null => {
    if (video.fileSize && video.fileSize > 6 * 1024 * 1024 * 1024) {
      return "Video is too large. Please select a video under 6GB.";
    }
    if (video.duration && video.duration < 180000) {
      return "Video is too short. Please upload a full game of at least 3 minutes.";
    }
    if (video.duration && video.duration > 900000) {
      return "Video is too long. Please select a video under 15 minutes.";
    }
    return null;
  };

  // ── Delete a completed-but-not-yet-uploaded compressed file ────────────────
  const cleanupCompressedFile = () => {
    const uri = compressedUriRef.current;
    if (!uri) return;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch (e) {
      console.warn("[VideoUploadModal] Failed to delete compressed file:", e);
    }
    compressedUriRef.current = null;
  };

  // Reset UI state. Intentionally does NOT touch cancelledRef — that flag is
  // owned by runCompression (reset at its start) so the cancel/failure branch
  // in its catch can read it without a race against this reset.
  const resetState = () => {
    cancellationIdRef.current = null;
    compressProgressRef.current = 0;
    progressAnim.setValue(0);
    setCompressPct(0);
    setIsCompressing(false);
    setPickedVideo(null);
    setCompressedUri(null);
    setErrorText("");
  };

  const runCompression = async (video: PickedVideo) => {
    cancelledRef.current = false;
    cancellationIdRef.current = null;
    compressProgressRef.current = 0;
    setCompressPct(0);
    progressAnim.setValue(0);
    setIsCompressing(true);

    try {
      const uri = await Video.compress(
        video.uri,
        {
          ...COMPRESSION_OPTIONS,
          getCancellationId: (id) => {
            cancellationIdRef.current = id;
          },
        },
        (p) => {
          compressProgressRef.current = p;
          progressAnim.setValue(p);
          const pct = Math.round(p * 100);
          setCompressPct((prev) => (prev !== pct ? pct : prev));
        },
      );

      // ── Success — compression complete, ready to upload ──────────────────
      compressedUriRef.current = uri;
      setCompressedUri(uri);
      setIsCompressing(false);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } catch (err) {
      setIsCompressing(false);
      progressAnim.setValue(0);

      // User-initiated cancellation — no failure record, no error text.
      // Any partial output cleanup is handled by the close handler / library.
      if (cancelledRef.current) return;

      // ── Genuine compression failure (OOM, unsupported codec, etc.) ───────
      console.error("[VideoUploadModal] Compression failed:", err, {
        sourceUri: video.uri,
      });
      setPickedVideo(null);
      setErrorText("Compression failed. Please try selecting the video again.");
      await recordVideoUploadFailure({
        gameId,
        competitionId,
        userId: currentUser.userId,
        errorMessage: err instanceof Error ? err.message : "compression failed",
        lastProgress: Math.round(compressProgressRef.current * 100),
      });
    }
  };

  const handleClose = () => {
    if (isCompressing) {
      Alert.alert(
        "Video is processing",
        "Are you sure you want to close? Your video is still being compressed.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Close anyway",
            style: "destructive",
            onPress: () => {
              // Actually stop the native compressor if it's mid-flight.
              if (cancellationIdRef.current) {
                cancelledRef.current = true;
                Video.cancelCompression(cancellationIdRef.current);
              }
              cleanupCompressedFile();
              resetState();
              onClose();
            },
          },
        ],
      );
      return;
    }
    // Not processing — a completed-but-unsent compressed file gets cleaned up.
    cleanupCompressedFile();
    resetState();
    onClose();
  };

  const handlePickVideo = async () => {
    if (isCompressing || isUploading) return;
    setErrorText("");
    // Discard any prior compressed output before starting over.
    cleanupCompressedFile();
    setCompressedUri(null);
    setPickedVideo(null);
    progressAnim.setValue(0);

    const video = await pickVideo();

    // User cancelled the system picker
    if (!video) return;

    const guardError = getGuardError(video);
    if (guardError) {
      setErrorText(guardError);
      return;
    }

    setPickedVideo(video);
    // Compression starts immediately on pick and drives the progress UI.
    await runCompression(video);
  };

  const handleUpload = async () => {
    if (!compressedUri || !pickedVideo) return;
    setErrorText("");

    setIsUploading(true);
    startBackgroundUpload({
      gameId,
      videoUri: compressedUri,
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
      videoLength: pickedVideo.duration
        ? Math.round(pickedVideo.duration / 1000)
        : undefined,
    });
    setIsUploading(false);
    // Ownership of the compressed file passes to the background upload — do NOT
    // clean it up. UploadToast now shows progress in the background.
    compressedUriRef.current = null;
    resetState();
    onClose();
  };

  const hasVideo = !!compressedUri;
  const showProgress = isCompressing || hasVideo;

  // Rotating status text with the live compression % interleaved: every third
  // slot is the percentage, the other two are the next status messages.
  const displayedMessage =
    messageStep % 3 === 2
      ? `Compressing video… ${compressPct}%`
      : PROCESSING_MESSAGES[
          (messageStep - Math.floor(messageStep / 3)) %
            PROCESSING_MESSAGES.length
        ];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const addLaterScreen =
    competitionType === COMPETITION_TYPES.LEAGUE ? "Scoreboard" : "Fixtures";

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Overlay intensity={50} tint="dark">
        <PopupContent>
          {/* ── Close button ── */}
          <CloseButton onPress={handleClose}>
            <AntDesign name="close-circle" size={30} color="red" />
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
            disabled={isCompressing || isUploading}
          >
            <Ionicons
              name={hasVideo ? "videocam" : "videocam-outline"}
              size={20}
              color={hasVideo ? "#00A2FF" : "rgba(255,255,255,0.5)"}
            />
            <VideoPickerText hasVideo={hasVideo}>
              {isCompressing
                ? "Compressing…"
                : hasVideo
                  ? "Video ready ✓"
                  : "Select a video"}
            </VideoPickerText>
            {isCompressing && <ActivityIndicator size="small" color="#00A2FF" />}
            {hasVideo && !isCompressing && <VideoAttachedDot />}
          </VideoPickerButton>

          {/* ── Real compression progress bar ── */}
          {showProgress && (
            <ProgressContainer>
              {isCompressing ? (
                <Animated.Text
                  style={{
                    opacity: messageOpacity,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: 12,
                    textAlign: "center",
                    fontStyle: "italic",
                  }}
                >
                  {displayedMessage}
                </Animated.Text>
              ) : (
                <ProgressLabel isProcessing={false}>
                  Ready to upload
                </ProgressLabel>
              )}
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
            disabled={!hasVideo || isUploading || isCompressing}
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
