import React, { useState, useEffect, useContext } from "react";
import { Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  setDoc,
} from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import { GameVideo } from "@shared/types";
import { UserContext } from "../../context/UserContext";
import { getFunctions, httpsCallable } from "firebase/functions";

interface VideoRemovedModalProps {
  visible: boolean;
  onClose: () => void;
  video: GameVideo;
  onVideoDeleted?: () => void;
}

interface VideoReportSummary {
  reason: string;
  count: number;
}

const VideoRemovedModal: React.FC<VideoRemovedModalProps> = ({
  visible,
  onClose,
  video,
  onVideoDeleted,
}) => {
  const { currentUser } = useContext(UserContext);
  const [reportSummary, setReportSummary] = useState<VideoReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appealVisible, setAppealVisible] = useState(false);

  const [hasExistingAppeal, setHasExistingAppeal] = useState(false);
  const docId = `${video.gameId}_${video.postedBy.userId}`;

  useEffect(() => {
    if (visible) {
      fetchReportSummary();
      checkExistingAppeal();
    }
  }, [visible]);

  const checkExistingAppeal = async () => {
    if (!currentUser) return;
    try {
      const db = getFirestore();
      const existing = await getDocs(
        query(
          collection(db, COLLECTION_NAMES.videoReportAppeals),
          where("videoId", "==", docId),
          where("appealedBy.userId", "==", currentUser.userId),
          limit(1),
        ),
      );
      setHasExistingAppeal(!existing.empty);
    } catch (error) {
      console.error("[VideoRemovedModal] Failed to check appeal:", error);
    }
  };

  const fetchReportSummary = async () => {
    setIsLoading(true);
    try {
      const db = getFirestore();
      const snap = await getDocs(
        query(
          collection(db, COLLECTION_NAMES.reportedVideos),
          where("videoId", "==", docId),
        ),
      );

      // ── Group by reason and count ─────────────────────────────────────────
      const reasonCounts: Record<string, number> = {};
      snap.docs.forEach((document) => {
        const reason = document.data().reason as string;
        reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
      });

      const summary: VideoReportSummary[] = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((reportA, reportB) => reportB.count - reportA.count);

      setReportSummary(summary);
    } catch (error) {
      console.error("[VideoRemovedModal] Failed to fetch reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const functions = getFunctions();
      const deleteVideo = httpsCallable(functions, "deleteVideo");
      await deleteVideo({ docId, videoUrl: video.videoUrl });
      onClose();
      onVideoDeleted?.();
    } catch (error) {
      console.error("[VideoRemovedModal] Failed to delete video:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={onClose}
      >
        <Overlay intensity={50} tint="dark">
          <ModalContent>
            {/* ── Header ── */}
            <ModalHeader>
              <HeaderLeft>
                <Ionicons name="warning-outline" size={20} color="#FF4B6E" />
                <ModalTitle>Video Removed</ModalTitle>
              </HeaderLeft>
              <TouchableOpacity onPress={onClose}>
                <AntDesign name="close-circle" size={26} color="red" />
              </TouchableOpacity>
            </ModalHeader>

            {/* ── Subtitle ── */}
            <SubTitle>
              Your video was removed by the community for the following reasons
              and its number of reports:
            </SubTitle>

            {/* ── Report reasons ── */}
            {isLoading ? (
              <ActivityIndicator
                size="small"
                color="#00A2FF"
                style={{ paddingVertical: 32 }}
              />
            ) : (
              reportSummary.map(({ reason, count }) => (
                <ReasonRow key={reason}>
                  <ReasonText>{reason}</ReasonText>
                  <ReasonCount>{count}</ReasonCount>
                </ReasonRow>
              ))
            )}

            {/* ── Actions ── */}
            <ActionsContainer>
              <AppealButton
                onPress={() => !hasExistingAppeal && setAppealVisible(true)}
                style={{
                  opacity: hasExistingAppeal ? 0.5 : 1,
                  borderColor: hasExistingAppeal
                    ? "rgba(0,162,255,0.5)"
                    : "#00A2FF",
                }}
              >
                <AppealButtonText>
                  {hasExistingAppeal ? "Appeal Pending..." : "Appeal"}
                </AppealButtonText>
              </AppealButton>
              <DeleteButton onPress={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <DeleteButtonText>Delete Video</DeleteButtonText>
                )}
              </DeleteButton>
            </ActionsContainer>
          </ModalContent>
        </Overlay>
      </Modal>
      {appealVisible && (
        <VideoAppealModal
          visible={appealVisible}
          onClose={() => setAppealVisible(false)}
          video={video}
          onAppealSubmitted={() => setHasExistingAppeal(true)}
        />
      )}
    </>
  );
};

interface VideoReportAppeal {
  appealId: string;
  videoId: string;
  gameId: string;
  competitionId: string;
  competitionName: string;
  appealedBy: {
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  appealText: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

interface VideoAppealModalProps {
  visible: boolean;
  onClose: () => void;
  video: GameVideo;
  onAppealSubmitted: () => void;
}

const VideoAppealModal: React.FC<VideoAppealModalProps> = ({
  visible,
  onClose,
  video,
  onAppealSubmitted,
}) => {
  const { currentUser } = useContext(UserContext);
  const [appealText, setAppealText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [alreadyAppealed, setAlreadyAppealed] = useState(false);

  const docId = `${video.gameId}_${video.postedBy.userId}`;

  const handleSubmit = async () => {
    if (!appealText.trim() || !currentUser) return;
    setIsSubmitting(true);

    try {
      const db = getFirestore();

      // ── Check if already appealed ─────────────────────────────────────────
      const existingAppeal = await getDocs(
        query(
          collection(db, COLLECTION_NAMES.videoReportAppeals),
          where("videoId", "==", docId),
          where("appealedBy.userId", "==", currentUser.userId),
          limit(1),
        ),
      );

      if (!existingAppeal.empty) {
        setAlreadyAppealed(true);
        setIsSubmitted(true);
        return;
      }

      // ── Write appeal ──────────────────────────────────────────────────────
      const newDocRef = doc(
        collection(db, COLLECTION_NAMES.videoReportAppeals),
      );

      const appeal: VideoReportAppeal = {
        appealId: newDocRef.id,
        videoId: docId,
        gameId: video.gameId,
        competitionId: video.competitionId,
        competitionName: video.competitionName,
        appealedBy: {
          userId: currentUser.userId,
          username: currentUser.username,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
        },
        appealText: appealText.trim(),
        status: "pending",
        createdAt: new Date(),
      };

      await setDoc(newDocRef, appeal);
      onAppealSubmitted();
      setIsSubmitted(true);
    } catch (error) {
      console.error("[VideoAppealModal] Failed to submit appeal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAppealText("");
    setIsSubmitted(false);
    setAlreadyAppealed(false);
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
            <HeaderLeft>
              <Ionicons name="shield-outline" size={20} color="#00A2FF" />
              <ModalTitle>Appeal Removal</ModalTitle>
            </HeaderLeft>
            <TouchableOpacity onPress={handleClose}>
              <AntDesign name="close-circle" size={26} color="red" />
            </TouchableOpacity>
          </ModalHeader>

          {isSubmitted ? (
            // ── Success / already appealed state ──────────────────────────
            <SuccessContainer>
              <Ionicons
                name={
                  alreadyAppealed
                    ? "alert-circle-outline"
                    : "checkmark-circle-outline"
                }
                size={60}
                color={alreadyAppealed ? "#FFA500" : "#00C853"}
              />
              <SuccessText>
                {alreadyAppealed
                  ? "You have already submitted an appeal for this video."
                  : "Your appeal has been submitted. We will review it and get back to you."}
              </SuccessText>
              <DoneButton onPress={handleClose}>
                <DoneButtonText>Done</DoneButtonText>
              </DoneButton>
            </SuccessContainer>
          ) : (
            <>
              <SubTitle>
                Explain why you believe this video was removed unfairly. Please
                provide as much detail as possible.
              </SubTitle>

              {/* ── Appeal text input ── */}
              <InputContainer>
                <AppealInput
                  placeholder="Write your appeal here..."
                  placeholderTextColor="#555"
                  value={appealText}
                  onChangeText={setAppealText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <CharacterCount>{appealText.length} / 500</CharacterCount>
              </InputContainer>

              <SubmitButton
                onPress={handleSubmit}
                disabled={
                  !appealText.trim() || isSubmitting || appealText.length > 500
                }
                style={{
                  opacity:
                    !appealText.trim() ||
                    isSubmitting ||
                    appealText.length > 500
                      ? 0.5
                      : 1,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <SubmitButtonText>Submit Appeal</SubmitButtonText>
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

const InputContainer = styled.View({
  paddingHorizontal: 20,
  marginBottom: 8,
});

const AppealInput = styled.TextInput({
  backgroundColor: "#0d1f30",
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 12,
  color: "white",
  fontSize: 14,
  minHeight: 140,
  borderWidth: 1,
  borderColor: "#1a2b3d",
});

const CharacterCount = styled.Text({
  color: "rgba(255,255,255,0.3)",
  fontSize: 11,
  textAlign: "right",
  marginTop: 6,
});

const SubmitButton = styled.TouchableOpacity({
  marginHorizontal: 20,
  marginTop: 16,
  paddingVertical: 14,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#00A2FF",
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

const Overlay = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: "rgba(2, 13, 24, 0.9)",
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

const HeaderLeft = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
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

const ReasonRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#1a2b3d",
});

const ReasonText = styled.Text({
  color: "white",
  fontSize: 14,
  flex: 1,
});

const ReasonCount = styled.Text({
  color: "#FF4B6E",
  fontSize: 14,
  fontWeight: "bold",
});

const ActionsContainer = styled.View({
  flexDirection: "row",
  gap: 12,
  paddingHorizontal: 20,
  paddingTop: 24,
});

const AppealButton = styled.TouchableOpacity({
  flex: 1,
  paddingVertical: 14,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "#00A2FF",
});

const AppealButtonText = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "600",
});

const DeleteButton = styled.TouchableOpacity({
  flex: 1,
  paddingVertical: 14,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FF4B6E",
});

const DeleteButtonText = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "600",
});

export default VideoRemovedModal;
