import React, { useState } from "react";
import { Dimensions, Modal, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign } from "@expo/vector-icons";
import { useForm } from "react-hook-form";

import { SHUTTLE_TYPE } from "@shared";
import type { Court, LadderMatchInput } from "@shared/types";
import MatchDateTimeFields from "../ladder/MatchDateTimeFields";
import type { MatchDateTimeValues } from "../ladder/MatchDateTimeFields";
import { courtTimeHint } from "../../helpers/ladderCourtTime";
import { getMatchStart } from "../../helpers/ladderMatchTime";

const { width: screenWidth } = Dimensions.get("window");

interface ArrangePlayoffMatchModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  court: Court;
  bestOf: number;
  deadline: Date | null;
  currencyType: string;
  onSubmit: (
    input: Pick<
      LadderMatchInput,
      "court" | "matchDate" | "matchTime" | "currencyType" | "shuttleType"
    >,
  ) => Promise<string | null>;
}

const ArrangePlayoffMatchModal: React.FC<ArrangePlayoffMatchModalProps> = ({
  visible,
  onClose,
  title,
  court,
  bestOf,
  deadline,
  currencyType,
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
      setError("This match must be played before the deadline.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const failure = await onSubmit({
      court,
      matchDate,
      matchTime,
      currencyType,
      shuttleType: SHUTTLE_TYPE.FEATHER,
    });
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
        <Card testID="arrange-playoff-match">
          <Header>
            <Title>{title}</Title>
            <TouchableOpacity
              onPress={close}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="arrange-playoff-match-close"
            >
              <AntDesign name="close-circle" size={22} color="red" />
            </TouchableOpacity>
          </Header>

          <CourtLine numberOfLines={1}>{court.courtName}</CourtLine>

          <MatchDateTimeFields
            setValue={setValue}
            watch={watch}
            maxDate={deadline}
            playoffStartDate={null}
            testIDPrefix="arrange-playoff-match"
          />

          <Hint testID="arrange-playoff-match-court-time">
            {courtTimeHint(bestOf)}
          </Hint>
          {error ? <ErrorText testID="arrange-playoff-match-error">{error}</ErrorText> : null}

          <SendButton
            activeOpacity={0.85}
            disabled={submitting}
            onPress={handleSubmit}
            testID="arrange-playoff-match-send"
          >
            <SendText>{submitting ? "Sending…" : "Send to opponent"}</SendText>
          </SendButton>
        </Card>
      </Backdrop>
    </Modal>
  );
};

export default ArrangePlayoffMatchModal;

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
