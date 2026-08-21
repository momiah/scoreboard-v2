import React from "react";
import { Dimensions, Modal } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";

import type { Game } from "@shared/types";

const screenWidth = Dimensions.get("window").width;

interface AddLadderGameModalProps {
  visible: boolean;
  game: Game | null;
  onClose: () => void;
}

/**
 * Ladder game shell modal. Modelled on AddTournamentGameModal's centred dark
 * card, but scoring is intentionally NOT wired up yet — recording ladder game
 * results is the next phase. For now this only confirms which game shell was
 * tapped and closes.
 */
const AddLadderGameModal: React.FC<AddLadderGameModalProps> = ({
  visible,
  game,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <ModalContainer>
      <ModalContent testID="add-ladder-game-modal">
        <CloseButton onPress={onClose} testID="add-ladder-game-close">
          <AntDesign name="close-circle" size={30} color="red" />
        </CloseButton>

        <Ionicons name="tennisball-outline" size={44} color="#00A2FF" />
        <Title>Game {game?.gameNumber ?? ""}</Title>
        <Badge>
          <BadgeText>Coming soon</BadgeText>
        </Badge>
        <Body>
          Recording ladder game scores isn&apos;t wired up yet — that&apos;s
          coming in the next update. For now you can line up your matches from
          your Schedule.
        </Body>

        <ActionButton activeOpacity={0.85} onPress={onClose}>
          <ActionButtonText>Close</ActionButtonText>
        </ActionButton>
      </ModalContent>
    </ModalContainer>
  </Modal>
);

export default AddLadderGameModal;

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
  alignItems: "center",
  gap: 14,
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
  fontSize: 20,
  fontWeight: "bold",
});

const Badge = styled.View({
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  backgroundColor: "rgba(0, 162, 255, 0.15)",
});

const BadgeText = styled.Text({
  color: "#00A2FF",
  fontSize: 12,
  fontWeight: "bold",
});

const Body = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 20,
  textAlign: "center",
});

const ActionButton = styled.TouchableOpacity({
  width: "100%",
  paddingVertical: 16,
  borderRadius: 12,
  backgroundColor: "#00A2FF",
  alignItems: "center",
});

const ActionButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
