import React, { useContext, useState } from "react";
import { Dimensions, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";

import { LADDER_TYPE } from "@shared/types";
import type { Ladder } from "@shared/types";
import { LadderContext } from "../../context/LadderContext";
import { UserContext } from "../../context/UserContext";

const screenWidth = Dimensions.get("window").width;

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

const SERVICE_CHARGE_RATE = 0.1;

const currencySymbol = (currencyType: string): string =>
  CURRENCY_SYMBOLS[currencyType] ?? "";

const formatCurrency = (amount: number, currencyType: string): string => {
  const symbol = currencySymbol(currencyType);
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
  const isDoubles = ladder.ladderType === LADDER_TYPE.DOUBLES;
  const serviceCharge = ladder.entryFee * SERVICE_CHARGE_RATE;

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

  const handleActionPress = () => {
    if (!acceptedTerms) return;
    if (isPaid) {
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

  const actionLabel = processing ? "Processing…" : isPaid ? "Pay" : "Join";

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <ModalContainer>
        <ModalContent testID="join-ladder-modal">
          <CloseButton onPress={resetAndClose} testID="join-ladder-close">
            <AntDesign name="close-circle" size={30} color="red" />
          </CloseButton>

          <Title>{ladder.name}</Title>
          {!!ladder.region && <Subtitle>{ladder.region}</Subtitle>}

          <TopRow>
            <TagsColumn>
              <Pill>
                <Ionicons name="shuffle" size={14} color="#9fb8c8" />
                <PillText>{ladder.ladderType}</PillText>
              </Pill>
              <Pill>
                <Ionicons
                  name={isPaid ? "cash-outline" : "gift-outline"}
                  size={14}
                  color="#9fb8c8"
                />
                <PillText>{isPaid ? "Cash Prize" : "Free Entry"}</PillText>
              </Pill>
            </TagsColumn>

            <PriceColumn>
              {isPaid ? (
                <>
                  <Price>
                    {formatCurrency(ladder.entryFee, ladder.currencyType)}
                  </Price>
                  <ServiceNote>
                    {currencySymbol(ladder.currencyType)}
                    {serviceCharge.toFixed(2)} platform fee included
                  </ServiceNote>
                </>
              ) : (
                <Price>Free</Price>
              )}
            </PriceColumn>
          </TopRow>

          {isDoubles && (
            <TeamSelect testID="join-ladder-team-selector" activeOpacity={0.8}>
              <TeamSelectText>Select Team</TeamSelectText>
              <Ionicons name="chevron-down" size={20} color="#9fb8c8" />
            </TeamSelect>
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

          {isPaid && (
            <PayNote>
              Payment will be processed once request has been accepted
            </PayNote>
          )}

          <ActionButton
            testID="join-ladder-confirm"
            activeOpacity={0.85}
            disabled={!acceptedTerms || processing}
            isDisabled={!acceptedTerms || processing}
            onPress={handleActionPress}
          >
            <ActionButtonText>{actionLabel}</ActionButtonText>
          </ActionButton>
        </ModalContent>
      </ModalContainer>

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
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <ModalContainer>
      <CentredContent testID="ladder-payment-stub">
        <Ionicons name="card-outline" size={40} color="#00A2FF" />
        <CentredTitle>Payment</CentredTitle>
        <StubBadge>
          <StubBadgeText>Coming soon</StubBadgeText>
        </StubBadge>
        <CentredBody>
          Paying the{" "}
          <Highlight>
            {formatCurrency(ladder.entryFee, ladder.currencyType)}
          </Highlight>{" "}
          entry fee will go through our payment provider. This step isn&apos;t
          wired up yet.
        </CentredBody>
        <ActionButton isDisabled={false} activeOpacity={0.85} onPress={onClose}>
          <ActionButtonText>Close</ActionButtonText>
        </ActionButton>
      </CentredContent>
    </ModalContainer>
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
    <ModalContainer>
      <CentredContent testID="join-ladder-confirmation">
        <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
        <CentredTitle>You&apos;re in!</CentredTitle>
        <CentredBody>
          You&apos;ve joined <Highlight>{ladderName}</Highlight>. Head to Match
          Making to post or accept your first game.
        </CentredBody>
        <ActionButton
          testID="join-ladder-start-playing"
          activeOpacity={0.85}
          isDisabled={false}
          onPress={onStartPlaying}
        >
          <ActionButtonText>Start Playing</ActionButtonText>
        </ActionButton>
      </CentredContent>
    </ModalContainer>
  </Modal>
);

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

const CentredContent = styled.View({
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
  fontSize: 24,
  fontWeight: "bold",
  paddingRight: 30,
});

const Subtitle = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  marginTop: -8,
});

const TopRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
});

const TagsColumn = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  flexShrink: 1,
});

const Pill = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 8,
  backgroundColor: "#152534",
});

const PillText = styled.Text({
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: "500",
});

const PriceColumn = styled.View({
  alignItems: "flex-end",
});

const Price = styled.Text({
  color: "#bcdcf0",
  fontSize: 40,
  fontWeight: "bold",
});

const ServiceNote = styled.Text({
  color: "#7f97a8",
  fontSize: 11,
  textAlign: "right",
});

const TeamSelect = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 18,
  paddingVertical: 16,
  borderRadius: 30,
  backgroundColor: "#1e2b3d",
});

const TeamSelectText = styled.Text({
  color: "#cbd5e1",
  fontSize: 15,
});

const CheckboxRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  marginTop: 25,
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

const PayNote = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  textAlign: "start",
});

const Highlight = styled.Text({
  color: "#00A2FF",
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

const ActionButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1e3a52" : "#007AFF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const ActionButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
