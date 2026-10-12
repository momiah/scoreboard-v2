import React from "react";

import { LADDER_MATCH_STATUS } from "@shared";
import { canDeclineLadderPlayoffMatch } from "@shared/helpers";
import type { LadderMatch } from "@shared/types";
import { getOpponentSideIds } from "../../helpers/ladderMatchCancellation";
import { usePlayoffMatchScheduling } from "../../hooks/usePlayoffMatchScheduling";
import MatchRequestBanner from "./MatchRequestBanner";

interface PlayoffMatchConfirmBannerProps {
  ladderId: string;
  match: LadderMatch;
  userId: string | undefined;
}

const PlayoffMatchConfirmBanner: React.FC<PlayoffMatchConfirmBannerProps> = ({
  ladderId,
  match,
  userId,
}) => {
  const { respond } = usePlayoffMatchScheduling();
  if (
    !userId ||
    !match.playoffTieId ||
    match.matchStatus !== LADDER_MATCH_STATUS.POSTED ||
    !match.participants.includes(userId)
  ) {
    return null;
  }

  if (!getOpponentSideIds(match, match.createdBy).includes(userId)) {
    return (
      <MatchRequestBanner
        testID="playoff-match-confirm"
        message="Waiting for your opponent to confirm this time"
        awaiting
      />
    );
  }

  const canDecline = canDeclineLadderPlayoffMatch(match);
  return (
    <MatchRequestBanner
      testID="playoff-match-confirm"
      message={
        canDecline
          ? "Your opponent arranged this match. Can you make it?"
          : "Your opponent arranged this match. You've used your one decline, so please accept."
      }
      awaiting={false}
      onDecline={
        canDecline
          ? () => respond({ ladderId, match, accept: false })
          : undefined
      }
      onAccept={() => respond({ ladderId, match, accept: true })}
    />
  );
};

export default PlayoffMatchConfirmBanner;
