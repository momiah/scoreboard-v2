import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useForm } from "react-hook-form";

import {
  LADDER_GAME_BEST_OF_OPTIONS,
  SHUTTLE_TYPE,
  PLATFORM_FEE,
  COURT_SOURCE,
} from "@shared";
import type {
  Court,
  Ladder,
  LadderGameInput,
  MatchTime,
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

const TIME_STEP_MINUTES = 15;
const MINUTES_IN_DAY = 24 * 60;

const pad = (n: number): string => n.toString().padStart(2, "0");

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatMatchDate = (iso: string): string =>
  parseIsoDate(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const shiftTime = (time: string, deltaMinutes: number): string => {
  const [hours, minutes] = time.split(":").map(Number);
  let total = hours * 60 + minutes + deltaMinutes;
  total = ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

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
  const { createLadderGame, addCourtToLadder } = useContext(LadderContext);
  const { getCourts, addCourt } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const [courtsList, setCourtsList] = useState<CourtListItem[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showSearchCourtModal, setShowSearchCourtModal] = useState(false);
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState<MatchTime>({
    start: "18:00",
    end: "20:00",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Courts allowed for this ladder. Kept in refs so the add-court flow can
  // read the freshly-updated set synchronously (avoids stale-closure lookups).
  const allowedCourtIdsRef = useRef<string[]>([]);
  const courtsRef = useRef<Court[]>([]);

  const { watch, setValue, handleSubmit, reset } =
    useForm<AddLadderGameFormValues>({
      defaultValues: {
        bestOf: 5,
        courtFee: "",
        shuttleType: SHUTTLE_TYPE.FEATHER,
      },
    });

  const courtFee = watch("courtFee");

  useEffect(() => {
    allowedCourtIdsRef.current = ladder.courtIds ? [...ladder.courtIds] : [];
  }, [ladder.courtIds]);

  const applyLadderCourts = useCallback((allCourts: Court[]): Court[] => {
    const ladderCourts = allCourts.filter((court) =>
      allowedCourtIdsRef.current.includes(court.courtId),
    );
    courtsRef.current = ladderCourts;
    setCourtsList(formatCourtDetailsForList(ladderCourts));
    return ladderCourts;
  }, []);

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
          courtsRef.current = [];
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
    const court = courtsRef.current.find((c) => c.courtName.trim() === value);
    setSelectedCourt(court ?? null);
    if (court) setErrorMessage(null);
  };

  // Adding a court from the ladder route: create it unverified (submitted by
  // the current user, tagged as ladder-submitted), attach it to this ladder's
  // courtIds so it's selectable straight away, and flag it for verification.
  const handleAddCourt = async (
    courtDetails: CourtDetails,
  ): Promise<string | null> => {
    const payload = {
      ...(courtDetails as Court),
      submittedBy: currentUser?.userId ?? "",
      submittedVia: COURT_SOURCE.LADDER,
      verified: false,
    };
    const newCourtId = await addCourt(payload);
    if (newCourtId) {
      allowedCourtIdsRef.current = [...allowedCourtIdsRef.current, newCourtId];
      await addCourtToLadder(ladder.ladderId, newCourtId);
    }
    return newCourtId;
  };

  const openDatePicker = () => {
    setTempDate(matchDate ? parseIsoDate(matchDate) : new Date());
    setShowDatePicker(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && selected) {
        setMatchDate(toIsoDate(selected));
        setErrorMessage(null);
      }
      return;
    }
    if (selected) setTempDate(selected);
  };

  const confirmIosDate = () => {
    setMatchDate(toIsoDate(tempDate));
    setShowDatePicker(false);
    setErrorMessage(null);
  };

  const adjustTime = (key: keyof MatchTime, deltaMinutes: number) => {
    setMatchTime((prev) => ({
      ...prev,
      [key]: shiftTime(prev[key], deltaMinutes),
    }));
  };

  const feeAmount = useMemo(() => {
    const parsed = Number(courtFee);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [courtFee]);

  const resetAndClose = () => {
    reset();
    setSelectedCourt(null);
    setShowSearchCourtModal(false);
    setShowDatePicker(false);
    setMatchDate("");
    setMatchTime({ start: "18:00", end: "20:00" });
    setErrorMessage(null);
    setSubmitting(false);
    setModalVisible(false);
  };

  const onSubmit = async (values: AddLadderGameFormValues) => {
    if (submitting) return;

    if (!currentUser?.userId) {
      setErrorMessage("You need to be signed in to post a match.");
      return;
    }

    if (!selectedCourt) {
      setErrorMessage("Please select a court.");
      return;
    }

    if (!matchDate) {
      setErrorMessage("Please pick a match date.");
      return;
    }

    if (toMinutes(matchTime.end) <= toMinutes(matchTime.start)) {
      setErrorMessage("Match end time must be after the start time.");
      return;
    }

    const parsedFee = Number(values.courtFee || "0");
    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      setErrorMessage("Please enter a valid court fee.");
      return;
    }

    const input: LadderGameInput = {
      court: selectedCourt,
      bestOf: values.bestOf,
      matchDate,
      matchTime,
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
        showBottomToast("Match posted", "success");
        resetAndClose();
      } else {
        setErrorMessage("Something went wrong posting the match.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = submitting ? "Posting…" : "Post Match";

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

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16, paddingBottom: 4 }}
          >
            <Header>
              <Title>Post a Match</Title>
              <Subtitle>{ladder.name}</Subtitle>
            </Header>

            <Field>
              <Label>Court</Label>
              <Selector
                testID="add-ladder-game-court-selector"
                activeOpacity={0.8}
                onPress={() => setShowSearchCourtModal(true)}
              >
                <SelectorText selected={!!selectedCourt}>
                  {selectedCourt?.courtName || "Select Court"}
                </SelectorText>
                <AntDesign name="right" size={16} color="#9fb8c8" />
              </Selector>
              {!!selectedCourt && !selectedCourt.verified && (
                <WarningTag testID="add-ladder-game-court-pending">
                  <AntDesign name="clock-circle" size={12} color="#f5a623" />
                  <WarningText>
                    Pending verification — usable once an admin verifies this
                    court.
                  </WarningText>
                </WarningTag>
              )}
            </Field>

            <Field>
              <Label>Match Date</Label>
              <Selector
                testID="add-ladder-game-date"
                activeOpacity={0.8}
                onPress={openDatePicker}
              >
                <SelectorText selected={!!matchDate}>
                  {matchDate ? formatMatchDate(matchDate) : "Select date"}
                </SelectorText>
                <AntDesign name="calendar" size={16} color="#9fb8c8" />
              </Selector>
            </Field>

            <Field>
              <Label>Match Time</Label>
              <TimeRow>
                <TimeColumn>
                  <TimeCaption>Start</TimeCaption>
                  <TimeStepper>
                    <TouchableOpacity
                      testID="add-ladder-game-start-minus"
                      onPress={() => adjustTime("start", -TIME_STEP_MINUTES)}
                    >
                      <AntDesign name="minus" size={18} color="#ffffff" />
                    </TouchableOpacity>
                    <TimeText>{matchTime.start}</TimeText>
                    <TouchableOpacity
                      testID="add-ladder-game-start-plus"
                      onPress={() => adjustTime("start", TIME_STEP_MINUTES)}
                    >
                      <AntDesign name="plus" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </TimeStepper>
                </TimeColumn>

                <TimeColumn>
                  <TimeCaption>End</TimeCaption>
                  <TimeStepper>
                    <TouchableOpacity
                      testID="add-ladder-game-end-minus"
                      onPress={() => adjustTime("end", -TIME_STEP_MINUTES)}
                    >
                      <AntDesign name="minus" size={18} color="#ffffff" />
                    </TouchableOpacity>
                    <TimeText>{matchTime.end}</TimeText>
                    <TouchableOpacity
                      testID="add-ladder-game-end-plus"
                      onPress={() => adjustTime("end", TIME_STEP_MINUTES)}
                    >
                      <AntDesign name="plus" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </TimeStepper>
                </TimeColumn>
              </TimeRow>
            </Field>

            <OptionSelector
              name="bestOf"
              label="Best of"
              watch={watch}
              setValue={setValue}
              options={[...LADDER_GAME_BEST_OF_OPTIONS]}
              keyExtractor={(opt: number) => opt}
              display={(opt: number) => `Best of ${opt}`}
              errorText=""
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

            <Field>
              <Label>Court Fee</Label>
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
                Matches posted with no court fee tend to get accepted faster. If
                you&apos;d prefer to split the venue cost, set a court fee for
                this match.
              </HelperText>
              <HelperText>A {PLATFORM_FEE_PERCENT}% platform fee will be deducted.</HelperText>
              {Number.isFinite(feeAmount) && feeAmount > 0 && (
                <HelperText>
                  Platform fee:{" "}
                  {formatCurrency(feeAmount * PLATFORM_FEE, ladder.currencyType)}
                </HelperText>
              )}
            </Field>

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
          </ScrollView>
        </ModalContent>
      </ModalContainer>

      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          onChange={onDateChange}
        />
      )}

      {showDatePicker && Platform.OS === "ios" && (
        <Modal transparent animationType="fade">
          <PickerBackdrop>
            <PickerCard>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                themeVariant="dark"
              />
              <PickerActions>
                <PickerAction
                  onPress={() => setShowDatePicker(false)}
                  testID="add-ladder-game-date-cancel"
                >
                  <PickerActionText muted>Cancel</PickerActionText>
                </PickerAction>
                <PickerAction
                  onPress={confirmIosDate}
                  testID="add-ladder-game-date-done"
                >
                  <PickerActionText>Done</PickerActionText>
                </PickerAction>
              </PickerActions>
            </PickerCard>
          </PickerBackdrop>
        </Modal>
      )}

      {showSearchCourtModal && (
        <SearchCourt
          visible={showSearchCourtModal}
          onClose={() => setShowSearchCourtModal(false)}
          courts={courtsList}
          selectedCourtKey={selectedCourt?.courtId}
          onSelectCourt={handleCourtSelect}
          getCourts={getCourts}
          addCourt={handleAddCourt}
          onCourtsRefreshed={(rawCourtData: Court[]) =>
            applyLadderCourts(rawCourtData)
          }
          showCountryIcon={false}
          highlightUnverified
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
  maxHeight: "85%",
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderRadius: 16,
  padding: 24,
});

const CloseButton = styled.TouchableOpacity({
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 10,
  padding: 2,
});

const Header = styled.View({
  gap: 2,
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
});

const Field = styled.View({
  gap: 8,
});

const Label = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
});

const Selector = styled.TouchableOpacity({
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

const SelectorText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? "#ffffff" : "#5b7488",
    fontSize: 15,
  }),
);

const WarningTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  backgroundColor: "rgba(245, 166, 35, 0.12)",
});

const WarningText = styled.Text({
  color: "#f5a623",
  fontSize: 12,
  flexShrink: 1,
});

const TimeRow = styled.View({
  flexDirection: "row",
  gap: 12,
});

const TimeColumn = styled.View({
  flex: 1,
  gap: 6,
});

const TimeCaption = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
});

const TimeStepper = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 10,
  backgroundColor: "#00152B",
  borderWidth: 1,
  borderColor: "#414141",
});

const TimeText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const FeeRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingHorizontal: 14,
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
  paddingVertical: 12,
});

const FeeCurrency = styled.Text({
  color: "#7f97a8",
  fontSize: 13,
});

const HelperText = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
  lineHeight: 17,
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

const PickerBackdrop = styled.View({
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
});

const PickerCard = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: 16,
});

const PickerActions = styled.View({
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
});

const PickerAction = styled.TouchableOpacity({
  paddingHorizontal: 16,
  paddingVertical: 10,
});

const PickerActionText = styled.Text<{ muted?: boolean }>(
  ({ muted }: { muted?: boolean }) => ({
    color: muted ? "#7f97a8" : "#00A2FF",
    fontSize: 16,
    fontWeight: "bold",
  }),
);
