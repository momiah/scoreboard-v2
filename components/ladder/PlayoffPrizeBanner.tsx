import React from "react";
import styled from "styled-components/native";

import type {
  LadderPlacePrize,
  LadderTiePrizes,
} from "../../helpers/ladderPlayoffPrizes";
import { formatCurrency } from "../../helpers/formatCurrency";

interface PlayoffPrizeBannerProps {
  title: string;
  prizes: LadderTiePrizes;
  currencyType: string;
  isPaid: boolean;
}

const payoutText = (
  prize: LadderPlacePrize,
  currencyType: string,
  isPaid: boolean,
): string =>
  isPaid
    ? `${formatCurrency(prize.cash, currencyType)} · ${prize.cp.toLocaleString()} CP`
    : `${prize.cp.toLocaleString()} CP`;

const PlayoffPrizeBanner: React.FC<PlayoffPrizeBannerProps> = ({
  title,
  prizes,
  currencyType,
  isPaid,
}) => (
  <Card testID="playoff-prize-banner">
    <Title numberOfLines={1}>{title}</Title>
    <PayoutRow>
      <Payout>
        <Label>Current payout</Label>
        <Amount testID="playoff-prize-secured">
          {payoutText(prizes.secured, currencyType, isPaid)}
        </Amount>
      </Payout>
      <Payout style={{ alignItems: "flex-end" }}>
        <Label style={{ textAlign: "right" }}>{prizes.nextName} payout</Label>
        <Amount testID="playoff-prize-next" style={{ textAlign: "right" }}>
          {payoutText(prizes.next, currencyType, isPaid)}
        </Amount>
      </Payout>
    </PayoutRow>
  </Card>
);

export default PlayoffPrizeBanner;

const Card = styled.View({
  marginHorizontal: 16,
  marginTop: 8,
  paddingVertical: 20,
  paddingHorizontal: 18,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const PayoutRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 16,
  marginTop: 18,
});

const Payout = styled.View({
  flex: 1,
  alignItems: "flex-start",
  gap: 6,
});

const Label = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
});

const Amount = styled.Text({
  color: "#FFC800",
  fontSize: 16,
  fontWeight: "bold",
});
