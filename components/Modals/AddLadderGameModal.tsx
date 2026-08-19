import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dimensions, Modal } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign } from "@expo/vector-icons";
import { useForm } from "react-hook-form";

import {
  LADDER_GAME_BEST_OF_OPTIONS,
  SHUTTLE_TYPE,
  PLATFORM_FEE,
} from "@shared";
import type {
  Court,
  Ladder,
  LadderGameInput,
  ShuttleType,
} from "@shared/types";

import OptionSelector from "../OptionSelector";
import SearchCourt from "./SearchLocationModal";
import type { CourtDetails, CourtListItem } from "./SearchLocationModal";
import { formatCourtDetailsForList } from "../../helpers/formatCourtDetails";
import { LadderContext } from "../../context/LadderContext";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";

const screenWidth = Dimensions.get("window").width;

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

const currencySymbol = (currencyType: string): string =>
  CURRENCY_SYMBOLS[currencyType] ?? "";

const formatCurrency = (amount: number, currencyType: string): string => {
  const symbol = currencySymbol(currencyType);
  return symbol
    ? `${symbol}${amount.toFixed(2)}`
    : `${amount.toFixed(2)} ${currencyType}`;
};

const PLATFORM_FEE_PERCENT = Math.round(PLATFORM_FEE * 100);

interface AddLadderGameFormValues {
  bestOf: number;
  courtFee: string;
  shuttleType: ShuttleType;
}

interface AddLadderGameModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  ladder: Ladder;
}

const AddLadderGameModal: React.FC<AddLadderGameModalProps> = ({
  modalVisible,
  setModalVisible,
  ladder,
}) => {
  const { createLadderGame } = useContext(LadderContext);
  const { getCourts, addCourt } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const [courts, setCourts] = useState<Court[]>([]);
  const [courtsList, setCourtsList] = useState<CourtListItem[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showSearchCourtModal, setShowSearchCourtModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { watch, setValue, handleSubmit, reset } =
    useForm<AddLadderGameFormValues>({
      defaultValues: {
        bestOf: 5,
        courtFee: "",
        shuttleType: SHUTTLE_TYPE.FEATHER,
      },
    });

  const courtFee = watch("courtFee");

  const applyLadderCourts = useCallback(
    (allCourts: Court[]): Court[] => {
      const ladderCourts = allCourts.filter((court) =>
        ladder.courtIds?.includes(court.courtId),
      );
      setCourts(ladderCourts);
      setCourtsList(formatCourtDetailsForList(ladderCourts));
      return ladderCourts;
    },
    [ladder.courtIds],
  );

  useEffect(() => {
    if (!modalVisible) return;
    let active = true;
    const loadCourts = async () => {
      try {
        const allCourts = await getCourts();
        if (active) applyLadderCourts(allCourts);
      } catch (error) {
        console.error("Error loading ladder courts:", error);
        if (active) {
          setCourts([]);
          setCourtsList([]);
        }
      }
    };
    loadCourts();
    return () => {
      active = false;
    };
  }, [modalVisible, getCourts, applyLadderCourts]);

  const handleCourtSelect = (value: string) => {
    const item = courtsList.find((court) => court.value === value);
    const court = item
      ? courts.find((c) => c.courtId === item.key)
      : undefined;
    setSelectedCourt(court ?? null);
    if (court) setErrorMessage(null);
  };

  const feeAmount = useMemo(() => {
    const parsed = Number(courtFee);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [courtFee]);

  const resetAndClose = () => {
    reset();
    setSelectedCourt(null);
    setShowSearchCourtModal(false);
    setErrorMessage(null);
    setSubmitting(false);
    setModalVisible(false);
  };

  const onSubmit = async (values: AddLadderGameFormValues) => {
    if (submitting) return;

    if (!currentUser?.userId) {
      setErrorMessage("You need to be signed in to post a game.");
      return;
    }

    if (!selectedCourt) {
      setErrorMessage("Please select a court.");
      return;
    }

    const parsedFee = Number(values.courtFee);
    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      setErrorMessage("Please enter a valid court fee.");
      return;
    }

    const input: LadderGameInput = {
      court: selectedCourt,
      bestOf: values.bestOf,
      courtFee: parsedFee,
      currencyType: ladder.currencyType,
      shuttleType: values.shuttleType,
    };

    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { success } = await createLadderGame(
        ladder.ladderId,
        input,
        currentUser.userId,
      );
      if (success) {
        showBottomToast("Game posted", "success");
        resetAndClose();
      } else {
        setErrorMessage("Something went wrong posting the game.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = submitting ? "Posting…" : "Post Game";
  const feeDisclaimer = `A ${PLATFORM_FEE_PERCENT}% platform fee will be deducted.`;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <ModalContainer>
        <ModalContent testID="add-ladder-game-modal">
          <CloseButton onPress={resetAndClose} testID="add-ladder-game-close">
            <AntDesign name="close-circle" size={30} color="red" />
          </CloseButton>

          <Title>Post a Game</Title>
          <Subtitle>{ladder.name}</Subtitle>

          <Section>
            <SectionLabel>Court</SectionLabel>
            <CourtSelector
              testID="add-ladder-game-court-selector"
              activeOpacity={0.8}
              onPress={() => setShowSearchCourtModal(true)}
            >
              <CourtSelectorText selected={!!selectedCourt}>
                {selectedCourt?.courtName || "Select Court"}
              </CourtSelectorText>
              <AntDesign name="right" size={16} color="#9fb8c8" />
            </CourtSelector>
          </Section>

          <OptionSelector
            name="bestOf"
            label="Best of"
            watch={watch}
            setValue={setValue}
            options={[...LADDER_GAME_BEST_OF_OPTIONS]}
            keyExtractor={(opt: number) => opt}
            display={(opt: number) => String(opt)}
            errorText=""
            roundButtons
          />

          <OptionSelector
            name="shuttleType"
            label="Shuttle Type"
            watch={watch}
            setValue={setValue}
            options={[SHUTTLE_TYPE.FEATHER, SHUTTLE_TYPE.PLASTIC]}
            keyExtractor={(opt: string) => opt}
            display={(opt: string) => opt}
            errorText=""
          />

          <Section>
            <SectionLabel>Court Fee</SectionLabel>
            <FeeRow>
              {!!currencySymbol(ladder.currencyType) && (
                <FeePrefix>{currencySymbol(ladder.currencyType)}</FeePrefix>
              )}
              <FeeInput
                testID="add-ladder-game-fee"
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#5b7488"
                value={courtFee}
                onChangeText={(text: string) =>
                  setValue("courtFee", text, { shouldValidate: true })
                }
              />
              <FeeCurrency>{ladder.currencyType}</FeeCurrency>
            </FeeRow>
            <HelperText>
              The total court-hire cost the players split. {feeDisclaimer}
            </HelperText>
            {Number.isFinite(feeAmount) && feeAmount > 0 && (
              <HelperText>
                Platform fee:{" "}
                {formatCurrency(feeAmount * PLATFORM_FEE, ladder.currencyType)}
              </HelperText>
            )}
          </Section>

          {!!errorMessage && <ErrorText>{errorMessage}</ErrorText>}

          <ActionButton
            testID="add-ladder-game-submit"
            activeOpacity={0.85}
            disabled={submitting}
            isDisabled={submitting}
            onPress={handleSubmit(onSubmit)}
          >
            <ActionButtonText>{submitLabel}</ActionButtonText>
          </ActionButton>
        </ModalContent>
      </ModalContainer>

      {showSearchCourtModal && (
        <SearchCourt
          visible={showSearchCourtModal}
          onClose={() => setShowSearchCourtModal(false)}
          courts={courtsList}
          selectedCourtKey={selectedCourt?.courtId}
          onSelectCourt={handleCourtSelect}
          getCourts={getCourts}
          addCourt={(courtDetails: CourtDetails) =>
            addCourt(courtDetails as Court)
          }
          onCourtsRefreshed={(rawCourtData: Court[]) =>
            applyLadderCourts(rawCourtData)
          }
        />
      )}
    </Modal>
  );
};

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

const Section = styled.View({
  gap: 8,
});

const SectionLabel = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
});

const CourtSelector = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 14,
  paddingVertical: 14,
  borderRadius: 10,
  backgroundColor: "#00152B",
  borderWidth: 1,
  borderColor: "#414141",
});

const CourtSelectorText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? "#ffffff" : "#5b7488",
    fontSize: 15,
  }),
);

const FeeRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 14,
  paddingVertical: 4,
  borderRadius: 10,
  backgroundColor: "#00152B",
  borderWidth: 1,
  borderColor: "#414141",
});

const FeePrefix = styled.Text({
  color: "#bcdcf0",
  fontSize: 18,
  fontWeight: "bold",
});

const FeeInput = styled.TextInput({
  flex: 1,
  color: "#ffffff",
  fontSize: 16,
  paddingVertical: 10,
});

const FeeCurrency = styled.Text({
  color: "#7f97a8",
  fontSize: 13,
});

const HelperText = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
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
    backgroundColor: isDisabled ? "#1e3a52" : "#007AFF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
    marginTop: 4,
  }),
);

const ActionButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
