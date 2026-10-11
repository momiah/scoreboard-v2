import React from "react";

import type { LadderMatch } from "@shared/types";
import {
  LADDER_MATCH_CANCEL_ACTION,
  getLadderMatchCancelAction,
} from "../../helpers/ladderMatchCancellation";
import { useLadderMatchCancellation } from "../../hooks/useLadderMatchCancellation";
import MatchRequestBanner from "./MatchRequestBanner";

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
  const action = getLadderMatchCancelAction(match, userId);

  if (action === LADDER_MATCH_CANCEL_ACTION.AWAITING_RESPONSE) {
    return (
      <MatchRequestBanner
        testID="match-cancellation"
        message="Waiting for your opponent to respond to the cancellation"
        awaiting
      />
    );
  }

  if (action !== LADDER_MATCH_CANCEL_ACTION.RESPOND) return null;

  return (
    <MatchRequestBanner
      testID="match-cancellation"
      message="Your opponent asked to cancel this match"
      awaiting={false}
      destructive
      onDecline={() =>
        respondToCancellation({ ladderId, match, accept: false })
      }
      onAccept={() => confirmAcceptCancellation({ ladderId, match })}
    />
  );
};

export default MatchCancellationBanner;
