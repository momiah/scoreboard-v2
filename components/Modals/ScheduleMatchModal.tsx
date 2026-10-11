import React, { useState } from "react";
import { Dimensions, Modal, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign } from "@expo/vector-icons";
import { useForm } from "react-hook-form";

import type { MatchTime } from "@shared/types";
import MatchDateTimeFields from "../ladder/MatchDateTimeFields";
import type { MatchDateTimeValues } from "../ladder/MatchDateTimeFields";
import { courtTimeHint } from "../../helpers/ladderCourtTime";
import { getMatchStart } from "../../helpers/ladderMatchTime";
import { toMoment } from "../../helpers/ladderPhases";

const { width: screenWidth } = Dimensions.get("window");

interface ScheduleMatchModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  courtName: string;
  bestOf?: number;
  deadline: Date | null;
  submitLabel: string;
  testID: string;
  onSubmit: (time: {
    matchDate: string;
    matchTime: MatchTime;
  }) => Promise<string | null>;
}

const ScheduleMatchModal: React.FC<ScheduleMatchModalProps> = ({
  visible,
  onClose,
  title,
  courtName,
  bestOf,
  deadline,
  submitLabel,
  testID,
  onSubmit,
}) => {
  const { setValue, watch, reset } = useForm<MatchDateTimeValues>({
    defaultValues: { startDate: "", startTime: "18:00" },
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    reset();
    setError(null);
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const matchDate = watch("startDate");
    const matchTime = { start: watch("startTime") };
    if (!matchDate) {
      setError("Pick a date.");
      return;
    }
    const start = getMatchStart({ matchDate, matchTime });
    if (!start || start.getTime() <= Date.now()) {
      setError("Pick a date and time in the future.");
      return;
    }
    if (deadline && start.getTime() > deadline.getTime()) {
      setError(`Pick a time before ${toMoment(deadline)?.format("ddd D MMM, HH:mm")}.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    const failure = await onSubmit({ matchDate, matchTime });
    setSubmitting(false);
    if (failure) {
      setError(failure);
      return;
    }
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Backdrop>
        <Card testID={testID}>
          <Header>
            <Title>{title}</Title>
            <TouchableOpacity
              onPress={close}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID={`${testID}-close`}
            >
              <AntDesign name="close-circle" size={22} color="red" />
            </TouchableOpacity>
          </Header>

          <CourtLine numberOfLines={1}>{courtName}</CourtLine>

          <MatchDateTimeFields
            setValue={setValue}
            watch={watch}
            maxDate={deadline}
            playoffStartDate={null}
            testIDPrefix={testID}
          />

          {bestOf ? (
            <Hint testID={`${testID}-court-time`}>{courtTimeHint(bestOf)}</Hint>
          ) : null}
          {error ? <ErrorText testID={`${testID}-error`}>{error}</ErrorText> : null}

          <SendButton
            activeOpacity={0.85}
            disabled={submitting}
            onPress={handleSubmit}
            testID={`${testID}-send`}
          >
            <SendText>{submitting ? "Sending…" : submitLabel}</SendText>
          </SendButton>
        </Card>
      </Backdrop>
    </Modal>
  );
};

export default ScheduleMatchModal;

const Backdrop = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const Card = styled.View({
  width: screenWidth - 40,
  borderRadius: 16,
  backgroundColor: "rgba(2, 13, 24, 0.95)",
  padding: 20,
  gap: 10,
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const CourtLine = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
});

const Hint = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
});

const ErrorText = styled.Text({
  color: "#ff8aa0",
  fontSize: 12,
});

const SendButton = styled.TouchableOpacity({
  height: 40,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 4,
});

const SendText = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
});
