import React, { useEffect, useRef, useState } from "react";
import { TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import styled from "styled-components/native";
import { PendingUpload } from "@shared/types";
import { Ionicons } from "@expo/vector-icons";
import Upload from "react-native-background-upload";

interface UploadToastProps {
  pendingUploads: PendingUpload[];
}

const UploadToast: React.FC<UploadToastProps> = ({ pendingUploads }) => {
  const [showComplete, setShowComplete] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const prevCountRef = useRef(0);
  const opacity = useSharedValue(0);

  const isVisible = pendingUploads.length > 0 || showComplete || showCancelled;

  // ── Detect upload completion ───────────────────────────────────────────────
  useEffect(() => {
    const prevCount = prevCountRef.current;
    const currentCount = pendingUploads.length;

    if (prevCount > 0 && currentCount === 0) {
      opacity.value = withSpring(0);
      setIsExpanded(false);
      if (!showCancelled) {
        setShowComplete(true);
        setTimeout(() => setShowComplete(false), 3000);
      }
    }

    prevCountRef.current = currentCount;
  }, [pendingUploads.length]);

  // ── Dropdown opacity animation ─────────────────────────────────────────────
  const dropdownStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: opacity.value > 0 ? "auto" : "none",
  }));

  const handleToggleExpand = () => {
    const next = !isExpanded;
    opacity.value = withSpring(next ? 1 : 0, { damping: 15, stiffness: 120 });
    setIsExpanded(next);
  };

  const handleCancel = async (upload: PendingUpload) => {
    try {
      if (!upload.uploadId) {
        console.warn(
          "[UploadToast] No uploadId available yet for:",
          upload.gameId,
        );
        return;
      }
      await Upload.cancelUpload(upload.uploadId);
      setShowCancelled(true);
      setTimeout(() => setShowCancelled(false), 3000);
    } catch (error) {
      console.error("[UploadToast] Failed to cancel upload:", error);
    }
  };

  if (!isVisible) return null;

  const activeUpload = [...pendingUploads].sort(
    (a, b) => b.progress - a.progress,
  )[0];

  const progress = activeUpload?.progress ?? 0;
  const pendingCount = pendingUploads.length;
  const label =
    pendingCount === 1
      ? "Uploading video..."
      : `Uploading video... (${pendingCount} pending)`;

  return (
    <ToastWrapper>
      {showCancelled ? (
        // ── Cancelled state ────────────────────────────────────────────────
        <ToastContent>
          <CancelledIcon>
            <Ionicons name="close" size={18} color="white" />
          </CancelledIcon>
          <LabelText>Upload cancelled</LabelText>
        </ToastContent>
      ) : showComplete ? (
        // ── Success state ──────────────────────────────────────────────────
        <ToastContent>
          <SuccessIcon>
            <Ionicons name="checkmark" size={18} color="white" />
          </SuccessIcon>
          <LabelText>Video uploaded successfully</LabelText>
        </ToastContent>
      ) : (
        // ── Upload in progress ─────────────────────────────────────────────
        <>
          <TouchableOpacity onPress={handleToggleExpand} activeOpacity={0.8}>
            <ToastContent>
              <IconWrapper>
                <Ionicons
                  name="cloud-upload-outline"
                  size={18}
                  color="#00A2FF"
                />
              </IconWrapper>
              <TextAndProgress>
                <LabelRow>
                  <LabelText numberOfLines={1}>{label}</LabelText>
                  <ChevronRow>
                    <PercentText>{progress ?? 0}%</PercentText>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="rgba(255,255,255,0.5)"
                    />
                  </ChevronRow>
                </LabelRow>
                <ProgressBarTrack>
                  <ProgressBarFill progress={progress} />
                </ProgressBarTrack>
              </TextAndProgress>
            </ToastContent>
          </TouchableOpacity>

          {/* ── Dropdown — absolute, no layout shift ── */}
          <DropdownWrapper style={dropdownStyle}>
            {pendingUploads.map((upload) => (
              <UploadRow key={upload.gameId}>
                <UploadInfo>
                  <UploadName numberOfLines={1}>
                    {upload.competitionName}
                  </UploadName>
                  <UploadProgress>{upload.progress}%</UploadProgress>
                </UploadInfo>
                <MiniProgressTrack>
                  <MiniProgressFill progress={upload.progress} />
                </MiniProgressTrack>
                <TouchableOpacity
                  onPress={() => handleCancel(upload)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="rgba(255,255,255,0.4)"
                  />
                </TouchableOpacity>
              </UploadRow>
            ))}
          </DropdownWrapper>
        </>
      )}
    </ToastWrapper>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const ToastWrapper = styled.View({
  backgroundColor: "rgba(2, 13, 24, 0.97)",
  borderBottomWidth: 1,
  borderBottomColor: "rgba(0, 162, 255, 0.2)",
  paddingHorizontal: 16,
  paddingVertical: 12,
  zIndex: 9999,
});

const ToastContent = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
});

const IconWrapper = styled.View({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
});

const SuccessIcon = styled.View({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "#00C853",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
});

const CancelledIcon = styled.View({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "red",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
});

const TextAndProgress = styled.View({
  flex: 1,
});

const LabelRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
});

const ChevronRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
});

const LabelText = styled.Text({
  color: "white",
  fontSize: 13,
  fontWeight: "600",
  flex: 1,
});

const PercentText = styled.Text({
  color: "#00A2FF",
  fontSize: 12,
  fontWeight: "bold",
});

const ProgressBarTrack = styled.View({
  width: "100%",
  height: 4,
  backgroundColor: "rgba(255,255,255,0.1)",
  borderRadius: 2,
  overflow: "hidden",
});

const ProgressBarFill = styled.View<{ progress: number }>(
  ({ progress }: { progress: number }) => ({
    height: 4,
    width: `${progress}%`,
    backgroundColor: "#00A2FF",
    borderRadius: 2,
  }),
);

// ── Dropdown ──────────────────────────────────────────────────────────────────

const DropdownWrapper = styled(Animated.View)({
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  backgroundColor: "rgba(2, 13, 24, 0.97)",
  borderBottomWidth: 1,
  borderBottomColor: "rgba(0, 162, 255, 0.2)",
  paddingHorizontal: 16,
  paddingBottom: 12,
  marginTop: 25,
  zIndex: 9998,
});

const Divider = styled.View({
  height: 1,
  backgroundColor: "rgba(255,255,255,0.06)",
  marginBottom: 8,
});

const UploadRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingVertical: 6,
});

const UploadInfo = styled.View({
  flex: 1,
});

const UploadName = styled.Text({
  color: "rgba(255,255,255,0.8)",
  fontSize: 12,
  fontWeight: "500",
  marginBottom: 4,
});

const UploadProgress = styled.Text({
  color: "#00A2FF",
  fontSize: 10,
  fontWeight: "600",
});

const MiniProgressTrack = styled.View({
  width: 60,
  height: 3,
  backgroundColor: "rgba(255,255,255,0.1)",
  borderRadius: 2,
  overflow: "hidden",
  alignSelf: "center",
});

const MiniProgressFill = styled.View<{ progress: number }>(
  ({ progress }: { progress: number }) => ({
    height: 3,
    width: `${progress}%`,
    backgroundColor: "#00A2FF",
    borderRadius: 2,
  }),
);

export default UploadToast;
