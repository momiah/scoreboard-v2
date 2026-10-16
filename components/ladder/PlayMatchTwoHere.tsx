import React from "react";
import { Alert } from "react-native";

import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";
import { isLadderMatchCalledOff } from "../../helpers/ladderMatchCancellation";
import { usePlayoffMatchScheduling } from "../../hooks/usePlayoffMatchScheduling";
import MatchRequestBanner from "./MatchRequestBanner";
import PlayoffMatchConfirmBanner from "./PlayoffMatchConfirmBanner";

interface PlayMatchTwoHereProps {
  ladderId: string;
  firstMatch: LadderMatch;
  secondMatch: LadderMatch | null;
  userId: string | undefined;
}

/**
 * On match 1 of a playoff game, once it's complete: offer to play match 2 at
 * the same court straight away, and let the opponent answer it.
 */
const PlayMatchTwoHere: React.FC<PlayMatchTwoHereProps> = ({
  ladderId,
  firstMatch,
  secondMatch,
  userId,
}) => {
  const { offerHere } = usePlayoffMatchScheduling();
  if (
    !userId ||
    firstMatch.playoffLeg !== 1 ||
    firstMatch.matchStatus !== LADDER_MATCH_STATUS.COMPLETED ||
    !(firstMatch.participants ?? []).includes(userId)
  ) {
    return null;
  }

  const second =
    secondMatch && !isLadderMatchCalledOff(secondMatch) ? secondMatch : null;

  if (!second) {
    return (
      <MatchRequestBanner
        testID="play-match-two"
        awaiting={false}
        acceptLabel="Play match 2 here"
        onAccept={() =>
          Alert.alert(
            "Play your 2nd match in this court",
            "Your opponent must accept to continue. You do not need to re-check in.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Play match 2",
                onPress: () => offerHere({ ladderId, firstMatch }),
              },
            ],
          )
        }
      />
    );
  }

  if (!second.playNow || second.matchStatus !== LADDER_MATCH_STATUS.POSTED) {
    return null;
  }

  return (
    <PlayoffMatchConfirmBanner
      ladderId={ladderId}
      match={second}
      userId={userId}
    />
  );
};

export default PlayMatchTwoHere;
