import React, { useContext, useEffect, useState } from "react";
import { Dimensions, Modal, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";

import { canAcceptLadderMatch } from "@shared";
import type { Ladder, LadderMatch } from "@shared/types";

import { LadderContext } from "../../context/LadderContext";
import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";
import MatchCard from "../ladder/MatchCard";

const screenWidth = Dimensions.get("window").width;

interface AcceptLadderMatchModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  ladder: Ladder;
  match: LadderMatch | null;
}

const AcceptLadderMatchModal: React.FC<AcceptLadderMatchModalProps> = ({
  modalVisible,
  setModalVisible,
  ladder,
  match,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { acceptLadderMatch } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset the form each time the modal is opened for a match.
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

  const goToTerms = () => {
    setModalVisible(false);
    navigation.navigate("LadderTerms", { ladderId: ladder.ladderId });
  };

  const userId = currentUser?.userId;
  const canAccept = !!match && !!userId && canAcceptLadderMatch(match, userId);

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
      const { success } = await acceptLadderMatch(
        ladder.ladderId,
        match.ladderMatchId,
        userId,
      );
      if (success) {
        resetAndClose();
        showBottomToast("Match accepted — see it in your Schedule", "success");
      } else {
        setErrorMessage("This match can no longer be accepted.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const disableAccept = !acceptedTerms || processing || !canAccept;

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

          {match && <MatchCard match={match} testID="accept-ladder-match-card" />}

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
              onPress={goToTerms}
            >
              <CheckboxLink>Terms &amp; Conditions</CheckboxLink>
            </TermsLink>
          </TermsRow>

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
