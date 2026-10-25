import React from "react";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { formatLadderPrizeWon, ordinalPlace } from "@shared/helpers";
import type { LadderPrizePayout } from "@shared/types";

const HeldPrizeNotice: React.FC<{ payout: LadderPrizePayout }> = ({ payout }) => {
  const prize = formatLadderPrizeWon(payout.prize, payout.currencyType);
  const place = `${payout.voided ? "joint " : ""}${ordinalPlace(payout.place)}`;
  return (
    <Card testID="ladder-prize-under-review">
      <Ionicons name="time-outline" size={22} color="#FF9800" />
      <Body>
        <Title>Your prize is under review</Title>
        <Message>
          {`Your prize for ${place} place${prize ? ` (${prize})` : ""} is under review because you were disqualified from the ladder. We'll let you know the outcome.`}
        </Message>
      </Body>
    </Card>
  );
};

export default HeldPrizeNotice;

const Card = styled.View({
  flexDirection: "row",
  gap: 12,
  padding: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "rgba(255, 152, 0, 0.5)",
  backgroundColor: "rgba(255, 152, 0, 0.08)",
});

const Body = styled.View({
  flex: 1,
  gap: 4,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "bold",
});

const Message = styled.Text({
  color: "#cfd8e3",
  fontSize: 13,
  lineHeight: 18,
});
