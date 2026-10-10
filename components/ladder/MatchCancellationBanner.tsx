import React, { useState } from "react";
import { StyleSheet } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { LadderMatch } from "@shared/types";
import {
  LADDER_MATCH_CANCEL_ACTION,
  getLadderMatchCancelAction,
} from "../../helpers/ladderMatchCancellation";
import { useLadderMatchCancellation } from "../../hooks/useLadderMatchCancellation";

interface MatchCancellationBannerProps {
  ladderId: string;
  match: LadderMatch;
  userId: string | undefined;
}

const MatchCancellationBanner: React.FC<MatchCancellationBannerProps> = ({
  ladderId,
  match,
  userId,
}) => {
  const { confirmAcceptCancellation, respondToCancellation } =
    useLadderMatchCancellation();
  const [responding, setResponding] = useState(false);
  const action = getLadderMatchCancelAction(match, userId);

  if (action === LADDER_MATCH_CANCEL_ACTION.AWAITING_RESPONSE) {
    return (
      <Banner testID="match-cancellation-awaiting">
        <MessageRow>
          <Ionicons name="time-outline" size={16} color="#9fb8c8" />
          <BannerText>
            Waiting for your opponent to respond to the cancellation
          </BannerText>
        </MessageRow>
      </Banner>
    );
  }

  if (action !== LADDER_MATCH_CANCEL_ACTION.RESPOND) return null;

  const decline = async () => {
    setResponding(true);
    try {
      await respondToCancellation({ ladderId, match, accept: false });
    } finally {
      setResponding(false);
    }
  };

  return (
    <Banner testID="match-cancellation-request">
      <MessageRow>
        <Ionicons name="alert-circle-outline" size={16} color="#9fb8c8" />
        <BannerText>Your opponent asked to cancel this match</BannerText>
      </MessageRow>
      <Actions>
        <DeclineButton
          disabled={responding}
          onPress={decline}
          testID="match-cancellation-decline"
        >
          <DeclineText>Decline</DeclineText>
        </DeclineButton>
        <AcceptButton
          disabled={responding}
          onPress={() => confirmAcceptCancellation({ ladderId, match })}
          testID="match-cancellation-accept"
        >
          <AcceptText>Accept</AcceptText>
        </AcceptButton>
      </Actions>
    </Banner>
  );
};

export default MatchCancellationBanner;

const Banner = styled.View({
  gap: 10,
  marginHorizontal: 20,
  marginTop: 12,
  marginBottom: 12,
  padding: 12,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(255, 255, 255, 0.15)",
});

const MessageRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const BannerText = styled.Text({
  flex: 1,
  color: "#cbd5e1",
  fontSize: 13,
});

const Actions = styled.View({
  flexDirection: "row",
  gap: 8,
});

const DeclineButton = styled.TouchableOpacity({
  flex: 1,
  height: 36,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.25)",
  alignItems: "center",
  justifyContent: "center",
});

const DeclineText = styled.Text({
  color: "#cbd5e1",
  fontWeight: "600",
  fontSize: 13,
});

const AcceptButton = styled.TouchableOpacity({
  flex: 1,
  height: 36,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(255, 75, 110, 0.6)",
  backgroundColor: "rgba(255, 75, 110, 0.12)",
  alignItems: "center",
  justifyContent: "center",
});

const AcceptText = styled.Text({
  color: "#ff8aa0",
  fontWeight: "600",
  fontSize: 13,
});
