import React from "react";

import type { LadderMatch } from "@shared/types";
import {
  LADDER_MATCH_CANCEL_ACTION,
  getLadderMatchRescheduleAction,
} from "../../helpers/ladderMatchCancellation";
import {
  formatMatchSlot,
  useLadderMatchChanges,
} from "../../hooks/useLadderMatchChanges";
import MatchRequestBanner from "./MatchRequestBanner";

interface MatchRescheduleBannerProps {
  ladderId: string;
  match: LadderMatch;
  userId: string | undefined;
}

const MatchRescheduleBanner: React.FC<MatchRescheduleBannerProps> = ({
  ladderId,
  match,
  userId,
}) => {
  const { respondToReschedule } = useLadderMatchChanges();
  const action = getLadderMatchRescheduleAction(match, userId);
  const request = match.rescheduleRequest;
  if (!request) return null;
  const slot = formatMatchSlot(request);

  if (action === LADDER_MATCH_CANCEL_ACTION.AWAITING_RESPONSE) {
    return (
      <MatchRequestBanner
        testID="match-reschedule"
        message={`Waiting for your opponent to accept ${slot}`}
        awaiting
      />
    );
  }

  if (action !== LADDER_MATCH_CANCEL_ACTION.RESPOND) return null;

  return (
    <MatchRequestBanner
      testID="match-reschedule"
      message={`Your opponent asked to move this match to ${slot}`}
      awaiting={false}
      onDecline={() => respondToReschedule({ ladderId, match, accept: false })}
      onAccept={() => respondToReschedule({ ladderId, match, accept: true })}
    />
  );
};

export default MatchRescheduleBanner;
