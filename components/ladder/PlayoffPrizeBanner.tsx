import React from "react";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import type {
  LadderPlacePrize,
  LadderTiePrizes,
} from "../../helpers/ladderPlayoffPrizes";
import { formatCurrency } from "../../helpers/formatCurrency";

interface PlayoffPrizeBannerProps {
  prizes: LadderTiePrizes;
  currencyType: string;
  isPaid: boolean;
}

const PrizeAmount: React.FC<{
  prize: LadderPlacePrize;
  currencyType: string;
  isPaid: boolean;
  testID: string;
}> = ({ prize, currencyType, isPaid, testID }) => {
  if (prize.cash <= 0 && prize.cp <= 0) {
    return <Muted testID={testID}>No prize yet</Muted>;
  }
  return (
    <Amounts testID={testID}>
      {isPaid && prize.cash > 0 ? (
        <Cash>{formatCurrency(prize.cash, currencyType)}</Cash>
      ) : null}
      {prize.cp > 0 ? <Points>{prize.cp} CP</Points> : null}
    </Amounts>
  );
};

const PlayoffPrizeBanner: React.FC<PlayoffPrizeBannerProps> = ({
  prizes,
  currencyType,
  isPaid,
}) => (
  <Banner testID="playoff-prize-banner">
    <Half>
      <Label>Secured</Label>
      <PrizeAmount
        prize={prizes.secured}
        currencyType={currencyType}
        isPaid={isPaid}
        testID="playoff-prize-secured"
      />
      <Caption numberOfLines={1}>For reaching the {prizes.roundName}</Caption>
    </Half>
    <Divider>
      <Ionicons name="chevron-forward" size={18} color="#FFC800" />
    </Divider>
    <Half>
      <Label>Next round</Label>
      <PrizeAmount
        prize={prizes.next}
        currencyType={currencyType}
        isPaid={isPaid}
        testID="playoff-prize-next"
      />
      <Caption numberOfLines={1}>{prizes.nextName}</Caption>
    </Half>
  </Banner>
);

export default PlayoffPrizeBanner;

const Banner = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginHorizontal: 16,
  marginTop: 4,
  padding: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "rgba(255, 200, 0, 0.45)",
  backgroundColor: "rgba(255, 200, 0, 0.08)",
});

const Half = styled.View({
  flex: 1,
  alignItems: "center",
  gap: 3,
});

const Divider = styled.View({
  paddingHorizontal: 6,
});

const Label = styled.Text({
  color: "#FFC800",
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 0.6,
  textTransform: "uppercase",
});

const Amounts = styled.View({
  alignItems: "center",
});

const Cash = styled.Text({
  color: "#ffffff",
  fontSize: 20,
  fontWeight: "bold",
});

const Points = styled.Text({
  color: "#e6d28a",
  fontSize: 14,
  fontWeight: "600",
});

const Muted = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
});

const Caption = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
});
