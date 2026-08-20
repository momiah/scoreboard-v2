import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";

import {
  LADDER_MATCH_BEST_OF_OPTIONS,
  SHUTTLE_TYPE,
  PLATFORM_FEE,
  COMPETITION_TYPES,
} from "@shared";
import type {
  Court,
  Ladder,
  LadderMatchInput,
  ShuttleType,
} from "@shared/types";

import DatePicker from "../DatePicker";
import OptionSelector from "../OptionSelector";
import SearchCourt from "./SearchLocationModal";
import type { CourtDetails, CourtListItem } from "./SearchLocationModal";
import { formatCourtDetailsForList } from "../../helpers/formatCourtDetails";
import { LadderContext } from "../../context/LadderContext";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";
import { toMoment } from "../../helpers/ladderPhases";

const { width: screenWidth } = Dimensions.get("window");

const PLATFORM_FEE_PERCENT = Math.round(PLATFORM_FEE * 100);
const TIME_STEP_MINUTES = 15;
const MINUTES_IN_DAY = 24 * 60;

const pad = (n: number): string => n.toString().padStart(2, "0");

const shiftTime = (time: string, deltaMinutes: number): string => {
  const [hours, minutes] = time.split(":").map(Number);
  let total = hours * 60 + minutes + deltaMinutes;
  total = ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

interface AddLadderMatchFormValues {
  startDate: string;
  startTime: string;
  bestOf: number;
  shuttleType: ShuttleType;
  courtFee: string;
}

interface AddLadderMatchModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  ladder: Ladder;
}

const AddLadderMatchModal: React.FC<AddLadderMatchModalProps> = ({
  modalVisible,
  setModalVisible,
  ladder,
}) => {
  const { createLadderMatch, addCourtToLadder } = useContext(LadderContext);
  const { getCourts, addCourt } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [courtsList, setCourtsList] = useState<CourtListItem[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showSearchCourtModal, setShowSearchCourtModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Matches can only be posted before the ladder's playoffs begin.
  const playoffStartDate = toMoment(ladder.playoffStartsAt)?.toDate() ?? null;

  // Courts allowed for this ladder. Kept in refs so the add-court flow can
  // read the freshly-updated set synchronously (avoids stale-closure lookups).
  const allowedCourtIdsRef = useRef<string[]>([]);
  const courtsRef = useRef<Court[]>([]);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddLadderMatchFormValues>({
    defaultValues: {
      startDate: "",
      startTime: "18:00",
      bestOf: 5,
      shuttleType: SHUTTLE_TYPE.FEATHER,
      courtFee: "",
    },
  });

  const startDate = watch("startDate");
  const startTime = watch("startTime");

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
      submittedVia: COMPETITION_TYPES.LADDER,
      verified: false,
    };
    const newCourtId = await addCourt(payload);
    if (newCourtId) {
      allowedCourtIdsRef.current = [...allowedCourtIdsRef.current, newCourtId];
      await addCourtToLadder(ladder.ladderId, newCourtId);
    }
    return newCourtId;
  };

  const resetAndClose = () => {
    reset();
    setSelectedCourt(null);
    setShowSearchCourtModal(false);
    setAcceptedTerms(false);
    setErrorMessage(null);
    setSubmitting(false);
    setModalVisible(false);
  };

  const goToTerms = () => {
    setModalVisible(false);
    navigation.navigate("LadderTerms", { ladderId: ladder.ladderId });
  };

  const onSubmit = async (data: AddLadderMatchFormValues) => {
    if (submitting) return;

    if (!currentUser?.userId) {
      setErrorMessage("You need to be signed in to post a match.");
      return;
    }
    if (!selectedCourt) {
      setErrorMessage("Please select a court.");
      return;
    }
    if (!data.startDate) {
      setErrorMessage("Please pick a match date.");
      return;
    }

    const parsedFee = Number(data.courtFee || "0");
    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      setErrorMessage("Please enter a valid court fee.");
      return;
    }

    const input: LadderMatchInput = {
      court: selectedCourt,
      bestOf: data.bestOf,
      matchDate: data.startDate,
      matchTime: { start: data.startTime },
      courtFee: parsedFee,
      currencyType: ladder.currencyType,
      shuttleType: data.shuttleType,
    };

    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { success } = await createLadderMatch(
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

  const confirmDisabled =
    submitting || !selectedCourt || !startDate || !acceptedTerms;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={modalVisible}
      onRequestClose={resetAndClose}
    >
      <ModalContainer>
        <SafeAreaWrapper
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollContainer
            data={[1]}
            keyExtractor={() => "main"}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            renderItem={() => (
              <>
                <ModalTitle>Post a Match</ModalTitle>
                <Subtitle>{ladder.name}</Subtitle>

                <Label style={{ marginLeft: 5 }}>Court</Label>
                <CourtSelector
                  testID="add-ladder-match-court-selector"
                  onPress={() => setShowSearchCourtModal(true)}
                >
                  <CourtSelectorText selected={!!selectedCourt}>
                    {selectedCourt?.courtName || "Select Court"}
                  </CourtSelectorText>
                  <AntDesign name="right" size={16} color="#888" />
                </CourtSelector>
                {!!selectedCourt && !selectedCourt.verified && (
                  <WarningTag testID="add-ladder-match-court-pending">
                    <AntDesign name="clock-circle" size={12} color="#f5a623" />
                    <WarningText>
                      Pending verification — usable once an admin verifies this
                      court.
                    </WarningText>
                  </WarningTag>
                )}

                <DatePicker
                  setValue={setValue}
                  watch={watch}
                  errorText={errors.startDate?.message}
                  hasEndDate={false}
                  labelStyle={{ marginLeft: -5, fontWeight: "bold" }}
                  playoffStartDate={playoffStartDate}
                />

                <Label style={{ marginTop: 15, marginLeft: 5 }}>
                  Start Time
                </Label>
                <TimeStepper>
                  <TouchableOpacity
                    testID="add-ladder-match-start-minus"
                    onPress={() =>
                      setValue(
                        "startTime",
                        shiftTime(startTime, -TIME_STEP_MINUTES),
                      )
                    }
                  >
                    <AntDesign name="minus" size={20} color="#ffffff" />
                  </TouchableOpacity>
                  <TimeText>{startTime}</TimeText>
                  <TouchableOpacity
                    testID="add-ladder-match-start-plus"
                    onPress={() =>
                      setValue(
                        "startTime",
                        shiftTime(startTime, TIME_STEP_MINUTES),
                      )
                    }
                  >
                    <AntDesign name="plus" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </TimeStepper>

                <OptionSelector
                  setValue={setValue}
                  watch={watch}
                  name="bestOf"
                  label="Best of"
                  options={[...LADDER_MATCH_BEST_OF_OPTIONS]}
                />

                <OptionSelector
                  setValue={setValue}
                  watch={watch}
                  name="shuttleType"
                  label="Shuttle Type"
                  options={[SHUTTLE_TYPE.FEATHER, SHUTTLE_TYPE.PLASTIC]}
                />

                <Label style={{ marginTop: 15, marginLeft: 5 }}>
                  Court Fee ({ladder.currencyType})
                </Label>
                <Controller
                  control={control}
                  name="courtFee"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      testID="add-ladder-match-fee"
                      placeholder="0.00"
                      placeholderTextColor="#ccc"
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      style={{
                        // marginTop: 40,
                        marginBottom: 16,
                        marginHorizontal: 10,
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                      }}
                    />
                  )}
                />
                <DisclaimerText>
                  Matches posted with no court fee tend to get accepted faster.
                  If you&apos;d prefer to split the venue cost, set a court fee
                  for this match.
                </DisclaimerText>
                <DisclaimerText>
                  A {PLATFORM_FEE_PERCENT}% platform fee will be deducted.
                </DisclaimerText>

                <TermsRow>
                  <CheckboxToggle
                    testID="add-ladder-match-terms"
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
                    testID="add-ladder-match-terms-link"
                    activeOpacity={0.7}
                    onPress={goToTerms}
                  >
                    <CheckboxLink>Terms &amp; Conditions</CheckboxLink>
                  </TermsLink>
                </TermsRow>

                {!!errorMessage && <ErrorText>{errorMessage}</ErrorText>}

                <ButtonContainer>
                  <CancelButton onPress={resetAndClose}>
                    <CancelText>Cancel</CancelText>
                  </CancelButton>
                  <CreateButton
                    testID="add-ladder-match-submit"
                    disabled={confirmDisabled}
                    onPress={handleSubmit(onSubmit)}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CreateText>Post Match</CreateText>
                    )}
                  </CreateButton>
                </ButtonContainer>
              </>
            )}
          />
        </SafeAreaWrapper>
      </ModalContainer>

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

export default AddLadderMatchModal;

const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const SafeAreaWrapper = styled(KeyboardAvoidingView)({
  width: screenWidth - 40,
  maxHeight: "90%",
  margin: 20,
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: "rgba(2, 13, 24, 0.7)",
});

const ScrollContainer = styled.FlatList({
  padding: "40px 20px",
});

const ModalTitle = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
  textAlign: "center",
});

const Subtitle = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  textAlign: "center",
  marginTop: 4,
  marginBottom: 20,
});

const Label = styled.Text({
  color: "#ccc",
  alignSelf: "flex-start",
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 6,
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
  marginTop: 4,
});

const Input = styled.TextInput({
  height: 40,
  borderRadius: 6,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  color: "white",
  paddingLeft: 12,
  marginBottom: 16,
});

const CourtSelector = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  height: 40,
  borderRadius: 5,
  paddingHorizontal: 12,
  marginHorizontal: 9,
  marginBottom: 16,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
});

const CourtSelectorText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? "#fff" : "#999",
    fontSize: 14,
  }),
);

const TimeStepper = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  height: 40,
  borderRadius: 6,
  paddingHorizontal: 16,
  marginBottom: 10,
  marginHorizontal: 10,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
});

const TimeText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const WarningTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  marginBottom: 16,
  backgroundColor: "rgba(245, 166, 35, 0.12)",
});

const WarningText = styled.Text({
  color: "#f5a623",
  fontSize: 12,
  flexShrink: 1,
});

const DisclaimerText = styled.Text({
  color: "white",
  fontStyle: "italic",
  fontSize: 12,
  marginBottom: 6,
});

const TermsRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 20,
});

const CheckboxToggle = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
});

const CheckboxLabel = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  flexShrink: 1,
});

const TermsLink = styled.TouchableOpacity({});

const CheckboxLink = styled.Text({
  color: "#00A2FF",
  fontWeight: "bold",
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 20,
});

const CancelButton = styled.TouchableOpacity({
  width: "45%",
  padding: 12,
  backgroundColor: "#9e9e9e",
  borderRadius: 6,
});

const CancelText = styled.Text({
  textAlign: "center",
  color: "white",
  fontSize: 16,
});

const CreateButton = styled.TouchableOpacity<{ disabled: boolean }>(
  ({ disabled }: { disabled: boolean }) => ({
    width: "45%",
    padding: 12,
    borderRadius: 6,
    backgroundColor: disabled ? "#9e9e9e" : "#00A2FF",
    opacity: disabled ? 0.6 : 1,
  }),
);

const CreateText = styled.Text({
  textAlign: "center",
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});
