import React, { useState } from "react";
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
          <Ionicons name="time-outline" size={20} color="#f5c451" />
          <BannerText>
            You asked to cancel this match. Waiting for your opponent to
            respond.
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
        <Ionicons name="alert-circle-outline" size={20} color="#f5c451" />
        <BannerText>
          Your opponent has asked to cancel this match. If you decline, the
          match goes ahead and must be played. Use the Chat Room to talk it
          over.
        </BannerText>
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
          <AcceptText>Accept Cancellation</AcceptText>
        </AcceptButton>
      </Actions>
    </Banner>
  );
};

export default MatchCancellationBanner;

const Banner = styled.View({
  gap: 14,
  marginHorizontal: 20,
  marginTop: 16,
  marginBottom: 16,
  padding: 14,
  borderRadius: 12,
  backgroundColor: "rgba(245, 196, 81, 0.1)",
  borderWidth: 1,
  borderColor: "rgba(245, 196, 81, 0.4)",
});

const MessageRow = styled.View({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
});

const BannerText = styled.Text({
  flex: 1,
  color: "#f5c451",
  fontSize: 13,
  lineHeight: 19,
});

const Actions = styled.View({
  flexDirection: "row",
  gap: 10,
});

const DeclineButton = styled.TouchableOpacity({
  flex: 1,
  minHeight: 44,
  paddingHorizontal: 8,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#f5c451",
  alignItems: "center",
  justifyContent: "center",
});

const DeclineText = styled.Text({
  color: "#f5c451",
  fontWeight: "bold",
  fontSize: 14,
});

const AcceptButton = styled.TouchableOpacity({
  flex: 1,
  minHeight: 44,
  paddingHorizontal: 8,
  borderRadius: 10,
  backgroundColor: "#FF4B6E",
  alignItems: "center",
  justifyContent: "center",
});

const AcceptText = styled.Text({
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: 14,
  textAlign: "center",
});
