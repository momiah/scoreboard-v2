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
        <Ionicons name="time-outline" size={18} color="#f5c451" />
        <BannerText>
          You asked to cancel this match. Waiting for your opponent to respond.
        </BannerText>
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
      <Ionicons name="alert-circle-outline" size={18} color="#f5c451" />
      <BannerBody>
        <BannerText>
          Your opponent has asked to cancel this match. If you decline, the
          match goes ahead and must be played. Use the Chat Room to talk it
          over.
        </BannerText>
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
      </BannerBody>
    </Banner>
  );
};

export default MatchCancellationBanner;

const Banner = styled.View({
  flexDirection: "row",
  gap: 10,
  marginHorizontal: 20,
  marginBottom: 12,
  padding: 12,
  borderRadius: 10,
  backgroundColor: "rgba(245, 196, 81, 0.1)",
  borderWidth: 1,
  borderColor: "rgba(245, 196, 81, 0.4)",
});

const BannerBody = styled.View({
  flex: 1,
  gap: 10,
});

const BannerText = styled.Text({
  flex: 1,
  color: "#f5c451",
  fontSize: 13,
  lineHeight: 18,
});

const Actions = styled.View({
  flexDirection: "row",
  gap: 8,
});

const DeclineButton = styled.TouchableOpacity({
  flex: 1,
  paddingVertical: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#f5c451",
  alignItems: "center",
});

const DeclineText = styled.Text({
  color: "#f5c451",
  fontWeight: "bold",
  fontSize: 13,
});

const AcceptButton = styled.TouchableOpacity({
  flex: 1,
  paddingVertical: 10,
  borderRadius: 8,
  backgroundColor: "#FF4B6E",
  alignItems: "center",
});

const AcceptText = styled.Text({
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: 13,
});
