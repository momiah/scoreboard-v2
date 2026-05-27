import React, { useState } from "react";
import { Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import { GameVideo } from "@shared/types";

const REPORT_REASONS = [
  "Inappropriate content",
  "Fake or edited footage",
  "Wrong game",
  "Harassment",
  "Other",
];

interface ReportVideoModalProps {
  visible: boolean;
  onClose: () => void;
  video: GameVideo;
  reportedBy: { userId: string; username: string };
}

const ReportVideoModal: React.FC<ReportVideoModalProps> = ({
  visible,
  onClose,
  video,
  reportedBy,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      const db = getFirestore();
      const videoId = `${video.gameId}_${video.postedBy.userId}`;

      const existing = await getDocs(
        query(
          collection(db, COLLECTION_NAMES.reportedVideos),
          where("videoId", "==", videoId),
          where("reportedBy.userId", "==", reportedBy.userId),
          limit(1),
        ),
      );

      if (!existing.empty) {
        setIsSubmitted(true);
        return;
      }

      await addDoc(collection(db, COLLECTION_NAMES.reportedVideos), {
        gameId: video.gameId,
        videoId,
        reason: selectedReason,
        reportedBy,
        videoUrl: video.videoUrl,
        competitionId: video.competitionId,
        competitionName: video.competitionName,
        status: "pending",
        createdAt: new Date(),
      });

      setIsSubmitted(true);
    } catch (error) {
      console.error("[ReportVideoModal] Failed to report video:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setIsSubmitted(false);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <Overlay intensity={50} tint="dark">
        <ModalContent>
          {/* ── Header ── */}
          <ModalHeader>
            <ModalTitle>
              {isSubmitted ? "Report Submitted" : "Report Video"}
            </ModalTitle>
            <TouchableOpacity onPress={handleClose}>
              <AntDesign name="closecircleo" size={26} color="red" />
            </TouchableOpacity>
          </ModalHeader>

          {isSubmitted ? (
            // ── Success state ──────────────────────────────────────────────
            <SuccessContainer>
              <Ionicons
                name="checkmark-circle-outline"
                size={60}
                color="#00C853"
              />
              <SuccessText>
                Thank you for your report. Our team will review it shortly.
              </SuccessText>
              <DoneButton onPress={handleClose}>
                <DoneButtonText>Done</DoneButtonText>
              </DoneButton>
            </SuccessContainer>
          ) : (
            // ── Reason selection ───────────────────────────────────────────
            <>
              <SubTitle>Why are you reporting this video?</SubTitle>
              {REPORT_REASONS.map((reason) => (
                <ReasonRow
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  isSelected={selectedReason === reason}
                >
                  <ReasonText isSelected={selectedReason === reason}>
                    {reason}
                  </ReasonText>
                  {selectedReason === reason && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#00A2FF"
                    />
                  )}
                </ReasonRow>
              ))}

              <SubmitButton
                onPress={handleSubmit}
                disabled={!selectedReason || isSubmitting}
                style={{
                  backgroundColor:
                    !selectedReason || isSubmitting ? "#444" : "#FF4B6E",
                  opacity: !selectedReason || isSubmitting ? 0.6 : 1,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <SubmitButtonText>Submit Report</SubmitButtonText>
                )}
              </SubmitButton>
            </>
          )}
        </ModalContent>
      </Overlay>
    </Modal>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Overlay = styled(BlurView)({
  flex: 1,
  justifyContent: "flex-end",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 40,
});

const ModalHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#1a2b3d",
});

const ModalTitle = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

const SubTitle = styled.Text({
  fontSize: 13,
  color: "rgba(255,255,255,0.5)",
  paddingHorizontal: 20,
  paddingVertical: 16,
});

const ReasonRow = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a2b3d",
    backgroundColor: isSelected ? "rgba(0, 162, 255, 0.08)" : "transparent",
  }),
);

const ReasonText = styled.Text<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    color: isSelected ? "#00A2FF" : "white",
    fontSize: 15,
    fontWeight: "500",
  }),
);

const SubmitButton = styled.TouchableOpacity({
  marginHorizontal: 20,
  marginTop: 24,
  paddingVertical: 14,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FF4B6E",
});

const SubmitButtonText = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "600",
});

const SuccessContainer = styled.View({
  alignItems: "center",
  paddingHorizontal: 30,
  paddingVertical: 40,
  gap: 16,
});

const SuccessText = styled.Text({
  color: "rgba(255,255,255,0.7)",
  fontSize: 14,
  textAlign: "center",
  lineHeight: 22,
});

const DoneButton = styled.TouchableOpacity({
  backgroundColor: "#00A2FF",
  paddingHorizontal: 40,
  paddingVertical: 12,
  borderRadius: 8,
  marginTop: 8,
});

const DoneButtonText = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "600",
});

export default ReportVideoModal;
