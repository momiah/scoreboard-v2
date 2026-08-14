import React from "react";
import { Modal, View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { LADDER_TYPE } from "@shared/types";
import type { Ladder } from "@shared/types";

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

const formatCurrency = (amount: number, currencyType: string): string => {
  const symbol = CURRENCY_SYMBOLS[currencyType] ?? "";
  return symbol ? `${symbol}${amount}` : `${amount} ${currencyType}`;
};

interface JoinLadderModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  ladder: Ladder;
}

/**
 * Phase 1 stub. Shows what joining will involve (entry fee for paid ladders,
 * team selection for Doubles) but does not yet wire the real payment or
 * team-creation flows.
 */
const JoinLadderModal: React.FC<JoinLadderModalProps> = ({
  modalVisible,
  setModalVisible,
  ladder,
}) => {
  const isPaid = ladder.entryFee > 0;
  const isDoubles = ladder.ladderType === LADDER_TYPE.DOUBLES;

  const close = () => setModalVisible(false);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Backdrop>
        <Sheet testID="join-ladder-modal">
          <HeaderRow>
            <SheetTitle>Join {ladder.name}</SheetTitle>
            <CloseButton onPress={close} testID="join-ladder-close">
              <Ionicons name="close" size={24} color="#ffffff" />
            </CloseButton>
          </HeaderRow>

          {isPaid && (
            <InfoRow>
              <Ionicons name="cash-outline" size={20} color="#00A2FF" />
              <InfoText>
                Entry fee:{" "}
                <InfoHighlight>
                  {formatCurrency(ladder.entryFee, ladder.currencyType)}
                </InfoHighlight>
              </InfoText>
            </InfoRow>
          )}

          {isDoubles && (
            <InfoRow>
              <Ionicons name="people-outline" size={20} color="#00A2FF" />
              <InfoText>This is a Doubles ladder — pick your team.</InfoText>
            </InfoRow>
          )}

          {/* TODO(phase-later): render a real team selector for Doubles ladders,
              sourced from the current user's existing teammates / a picker. */}
          {isDoubles && (
            <TeamSelectorPlaceholder testID="join-ladder-team-selector">
              <PlaceholderText>Team selector coming soon</PlaceholderText>
            </TeamSelectorPlaceholder>
          )}

          {/* TODO(phase-later): wire the real payment flow for paid ladders,
              then write the participant/team into ladders/{id} on success. */}
          <ConfirmButton
            testID="join-ladder-confirm"
            activeOpacity={0.85}
            onPress={close}
          >
            <ConfirmButtonText>
              {isPaid ? "Pay & Join (coming soon)" : "Join (coming soon)"}
            </ConfirmButtonText>
          </ConfirmButton>

          <View style={{ height: 8 }} />
        </Sheet>
      </Backdrop>
    </Modal>
  );
};

export default JoinLadderModal;

const Backdrop = styled.View({
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
});

const Sheet = styled.View({
  backgroundColor: "#00152B",
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 20,
  gap: 16,
});

const HeaderRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const SheetTitle = styled.Text({
  flex: 1,
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
});

const CloseButton = styled.TouchableOpacity({
  padding: 4,
});

const InfoRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
});

const InfoText = styled.Text({
  color: "#cccccc",
  fontSize: 14,
});

const InfoHighlight = styled.Text({
  color: "#00A2FF",
  fontWeight: "bold",
});

const TeamSelectorPlaceholder = styled.View({
  padding: 20,
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "#334155",
  alignItems: "center",
});

const PlaceholderText = styled.Text({
  color: "#64748b",
  fontSize: 13,
});

const ConfirmButton = styled.TouchableOpacity({
  paddingVertical: 16,
  borderRadius: 12,
  backgroundColor: "#00A2FF",
  alignItems: "center",
});

const ConfirmButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
