import React, { useContext, useEffect, useState } from "react";
import { Dimensions, Modal, ActivityIndicator, Linking } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";

import {
  canAcceptLadderMatch,
  notificationSchema,
  notificationTypes,
} from "@shared";
import type { Ladder, LadderMatch } from "@shared/types";

import { LadderContext } from "../../context/LadderContext";
import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";
import { buildCourtMapsUrl } from "../../helpers/courtMapsUrl";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import MatchCard from "../ladder/MatchCard";
import LadderTermsModal from "./LadderTermsModal";

const screenWidth = Dimensions.get("window").width;

interface AcceptLadderMatchModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  ladder: Ladder;
  match: LadderMatch | null;
  onAccepted?: (match: LadderMatch) => void;
  onUnavailable?: (match: LadderMatch) => void;
}

const AcceptLadderMatchModal: React.FC<AcceptLadderMatchModalProps> = ({
  modalVisible,
  setModalVisible,
  ladder,
  match,
  onAccepted,
  onUnavailable,
}) => {
  const { acceptLadderMatch } = useContext(LadderContext);
  const { currentUser, sendNotification } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [termsVisible, setTermsVisible] = useState(false);

  useEffect(() => {
    if (modalVisible) {
      setAcceptedTerms(false);
      setProcessing(false);
      setErrorMessage(null);
    }
  }, [modalVisible]);

  const resetAndClose = () => {
    setAcceptedTerms(false);
    setProcessing(false);
    setErrorMessage(null);
    setModalVisible(false);
  };


  const userId = currentUser?.userId;
  const isOwnMatch =
    !!match && !!userId && match.participants.includes(userId);
  const canAccept = !!match && !!userId && canAcceptLadderMatch(match, userId);

  const handleOpenMap = () => {
    if (!match) return;
    Linking.openURL(buildCourtMapsUrl(match.court)).catch((err) =>
      console.error("Error opening Google Maps:", err),
    );
  };

  // Tell the poster their match was accepted. Fire-and-forget: a notification
  // failure must not break the accept flow.
  const notifyPosterOfAccept = async (accepted: LadderMatch) => {
    const posterId = accepted.createdBy;
    if (!posterId || posterId === userId) return;
    try {
      await sendNotification({
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: posterId,
        senderId: userId,
        message: `${formatDisplayName(currentUser)} accepted your ladder match at ${
          accepted.court?.courtName ?? "your court"
        }`,
        type: notificationTypes.INFORMATION.LADDER_MATCH_ACCEPTED.TYPE,
        data: {
          ladderId: ladder.ladderId,
          matchId: accepted.ladderMatchId,
          ladderType: ladder.ladderType,
        },
      });
    } catch (error) {
      console.error("Error sending ladder accept notification:", error);
    }
  };

  const handleAccept = async () => {
    if (!acceptedTerms || processing || !match) return;
    if (!userId) {
      setErrorMessage("You need to be signed in to accept a match.");
      return;
    }
    if (!canAcceptLadderMatch(match, userId)) {
      setErrorMessage("This match can no longer be accepted.");
      return;
    }

    setErrorMessage(null);
    setProcessing(true);
    try {
      const { success, reason } = await acceptLadderMatch(
        ladder.ladderId,
        match.ladderMatchId,
        userId,
      );
      if (success) {
        onAccepted?.(match);
        void notifyPosterOfAccept(match);
        resetAndClose();
        showBottomToast("Match accepted — see it in your Schedule", "success");
      } else if (reason === "unavailable") {
        onUnavailable?.(match);
        resetAndClose();
        showBottomToast(
          "This game has been accepted by someone else",
          "error",
        );
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const disableAccept =
    isOwnMatch || !acceptedTerms || processing || !canAccept;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <ModalContainer>
        <ModalContent testID="accept-ladder-match-modal">
          <CloseButton onPress={resetAndClose} testID="accept-ladder-match-close">
            <AntDesign name="close-circle" size={30} color="red" />
          </CloseButton>

          <Title>Accept Match</Title>
          <Subtitle>{ladder.name}</Subtitle>

          {match && (
            <MatchCard
              match={match}
              testID="accept-ladder-match-card"
              onLocationPress={handleOpenMap}
            />
          )}

          {isOwnMatch ? (
            <Disclaimer testID="accept-ladder-own-match">
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#FFA500"
              />
              <DisclaimerText>
                You cannot accept your own match.
              </DisclaimerText>
            </Disclaimer>
          ) : (
            <TermsRow>
              <CheckboxToggle
                testID="accept-ladder-match-terms"
                activeOpacity={0.7}
                onPress={() => setAcceptedTerms((prev) => !prev)}
              >
                <Ionicons
                  name={acceptedTerms ? "checkbox" : "square-outline"}
                  size={22}
                  color={acceptedTerms ? "#00A2FF" : "#64748b"}
                />
                <CheckboxLabel>I accept the</CheckboxLabel>
              </CheckboxToggle>
              <TermsLink
                testID="accept-ladder-match-terms-link"
                activeOpacity={0.7}
                onPress={() => setTermsVisible(true)}
              >
                <CheckboxLink>Terms &amp; Conditions</CheckboxLink>
              </TermsLink>
            </TermsRow>
          )}

          {!!errorMessage && <ErrorText>{errorMessage}</ErrorText>}

          <ActionButton
            testID="accept-ladder-match-confirm"
            activeOpacity={0.85}
            disabled={disableAccept}
            isDisabled={disableAccept}
            onPress={handleAccept}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ActionButtonText>Accept</ActionButtonText>
            )}
          </ActionButton>
        </ModalContent>
      </ModalContainer>

      <LadderTermsModal
        visible={termsVisible}
        onClose={() => setTermsVisible(false)}
      />
    </Modal>
  );
};

export default AcceptLadderMatchModal;

const ModalContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  width: screenWidth - 40,
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderRadius: 16,
  padding: 24,
  gap: 18,
});

const CloseButton = styled.TouchableOpacity({
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 10,
  padding: 2,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 24,
  fontWeight: "bold",
  paddingRight: 30,
});

const Subtitle = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  marginTop: -12,
});

const TermsRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 6,
});

const CheckboxToggle = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
});

const TermsLink = styled.TouchableOpacity({});

const CheckboxLabel = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  flexShrink: 1,
});

const CheckboxLink = styled.Text({
  color: "#00A2FF",
  fontWeight: "bold",
});

const ErrorText = styled.Text({
  color: "#f87171",
  fontSize: 13,
});

const Disclaimer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
  backgroundColor: "rgba(255, 165, 0, 0.12)",
});

const DisclaimerText = styled.Text({
  color: "#FFA500",
  fontSize: 13,
  fontWeight: "600",
  flexShrink: 1,
});

const ActionButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const ActionButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
