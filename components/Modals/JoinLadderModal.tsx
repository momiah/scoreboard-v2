import React, { useContext, useState } from "react";
import { Modal, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { Ladder } from "@shared/types";
import { LadderContext } from "../../context/LadderContext";
import { UserContext } from "../../context/UserContext";
import Tag from "../Tag";

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

const JoinLadderModal: React.FC<JoinLadderModalProps> = ({
  modalVisible,
  setModalVisible,
  ladder,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { joinLadder } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);

  const isPaid = ladder.entryFee > 0;

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  const resetAndClose = () => {
    setAcceptedTerms(false);
    setProcessing(false);
    setErrorMessage(null);
    setPaymentVisible(false);
    setConfirmationVisible(false);
    setModalVisible(false);
  };

  const handleJoinFree = async () => {
    if (!acceptedTerms || processing) return;
    if (!currentUser?.userId) {
      setErrorMessage("You need to be signed in to join.");
      return;
    }

    setErrorMessage(null);
    setProcessing(true);
    try {
      const { success } = await joinLadder(ladder.ladderId, currentUser);
      if (success) {
        setConfirmationVisible(true);
      } else {
        setErrorMessage("Something went wrong joining the ladder.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleJoinPress = () => {
    if (!acceptedTerms) return;
    if (isPaid) {
      // Paid ladders route through the payment provider (stubbed).
      setPaymentVisible(true);
    } else {
      handleJoinFree();
    }
  };

  const handleStartPlaying = () => {
    resetAndClose();
    navigation.navigate("Ladder", {
      ladderId: ladder.ladderId,
      tab: "Matchmaking",
    });
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <Backdrop>
        <Sheet testID="join-ladder-modal">
          <HeaderRow>
            <SheetTitle>Join {ladder.name}</SheetTitle>
            <CloseButton onPress={resetAndClose} testID="join-ladder-close">
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

          <CheckboxRow
            testID="join-ladder-terms"
            activeOpacity={0.7}
            onPress={() => setAcceptedTerms((prev) => !prev)}
          >
            <Ionicons
              name={acceptedTerms ? "checkbox" : "square-outline"}
              size={22}
              color={acceptedTerms ? "#00A2FF" : "#64748b"}
            />
            <CheckboxLabel>
              I accept the <CheckboxLink>Terms &amp; Conditions</CheckboxLink>
            </CheckboxLabel>
          </CheckboxRow>

          {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

          <ConfirmButton
            testID="join-ladder-confirm"
            activeOpacity={0.85}
            disabled={!acceptedTerms || processing}
            isDisabled={!acceptedTerms || processing}
            onPress={handleJoinPress}
          >
            <ConfirmButtonText>
              {processing ? "Joining…" : isPaid ? "Pay & Join" : "Join"}
            </ConfirmButtonText>
          </ConfirmButton>

          <View style={{ height: 8 }} />
        </Sheet>
      </Backdrop>

      {/* Paid ladders: payment provider integration is stubbed for now. */}
      <PaymentStubModal
        visible={paymentVisible}
        ladder={ladder}
        onClose={() => setPaymentVisible(false)}
      />

      <JoinConfirmationModal
        visible={confirmationVisible}
        ladderName={ladder.name}
        onStartPlaying={handleStartPlaying}
      />
    </Modal>
  );
};

export default JoinLadderModal;

/* -------------------------------------------------------------------------- */
/* Payment provider — STUB.                                                   */
/* TODO: replace with the real payment provider (e.g. Stripe) checkout flow.  */
/* No participant is written here; the join happens after payment succeeds.   */
/* -------------------------------------------------------------------------- */
interface PaymentStubModalProps {
  visible: boolean;
  ladder: Ladder;
  onClose: () => void;
}

const PaymentStubModal: React.FC<PaymentStubModalProps> = ({
  visible,
  ladder,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Backdrop>
      <CentredSheet testID="ladder-payment-stub">
        <Ionicons name="card-outline" size={40} color="#00A2FF" />
        <CentredTitle>Payment</CentredTitle>
        <StubBadge>
          <StubBadgeText>Coming soon</StubBadgeText>
        </StubBadge>
        <CentredBody>
          Paying the{" "}
          <InfoHighlight>
            {formatCurrency(ladder.entryFee, ladder.currencyType)}
          </InfoHighlight>{" "}
          entry fee will go through our payment provider. This step isn&apos;t
          wired up yet.
        </CentredBody>
        <Tag
          name="Close"
          color="#1e2b3d"
          bold
          width="100%"
          onPress={onClose}
        />
      </CentredSheet>
    </Backdrop>
  </Modal>
);

interface JoinConfirmationModalProps {
  visible: boolean;
  ladderName: string;
  onStartPlaying: () => void;
}

const JoinConfirmationModal: React.FC<JoinConfirmationModalProps> = ({
  visible,
  ladderName,
  onStartPlaying,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <Backdrop>
      <CentredSheet testID="join-ladder-confirmation">
        <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
        <CentredTitle>You&apos;re in!</CentredTitle>
        <CentredBody>
          You&apos;ve joined <InfoHighlight>{ladderName}</InfoHighlight>. Head to
          Match Making to post or accept your first game.
        </CentredBody>
        <ConfirmButton
          testID="join-ladder-start-playing"
          activeOpacity={0.85}
          isDisabled={false}
          onPress={onStartPlaying}
        >
          <ConfirmButtonText>Start Playing</ConfirmButtonText>
        </ConfirmButton>
      </CentredSheet>
    </Backdrop>
  </Modal>
);

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

const CentredSheet = styled.View({
  margin: 24,
  marginTop: "auto",
  marginBottom: "auto",
  padding: 24,
  borderRadius: 20,
  backgroundColor: "#00152B",
  borderWidth: 1,
  borderColor: "#192336",
  alignItems: "center",
  gap: 12,
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

const CentredTitle = styled.Text({
  color: "#ffffff",
  fontSize: 20,
  fontWeight: "bold",
});

const CentredBody = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 20,
  textAlign: "center",
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

const CheckboxRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
});

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

const StubBadge = styled.View({
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  backgroundColor: "rgba(0, 162, 255, 0.15)",
});

const StubBadgeText = styled.Text({
  color: "#00A2FF",
  fontSize: 12,
  fontWeight: "bold",
});

const ConfirmButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const ConfirmButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
