import React from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

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
 * the same court straight away, let the opponent answer, then link to it.
 */
const PlayMatchTwoHere: React.FC<PlayMatchTwoHereProps> = ({
  ladderId,
  firstMatch,
  secondMatch,
  userId,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
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
    const court = firstMatch.court?.courtName ?? "this court";
    return (
      <MatchRequestBanner
        testID="play-match-two"
        message={`Play match 2 here now? Your opponent needs to accept.`}
        awaiting={false}
        acceptLabel="Play match 2 here"
        onAccept={() =>
          Alert.alert(
            "Play match 2 here now?",
            `Match 2 starts now at ${court}, and your opponent is asked to accept. You're both already checked in.`,
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

  if (!second.playNow) return null;

  if (second.matchStatus === LADDER_MATCH_STATUS.POSTED) {
    return (
      <PlayoffMatchConfirmBanner
        ladderId={ladderId}
        match={second}
        userId={userId}
      />
    );
  }

  return (
    <MatchRequestBanner
      testID="play-match-two-ready"
      message="Match 2 is on, and you're both checked in."
      awaiting={false}
      acceptLabel="Open match 2"
      onAccept={() =>
        navigation.navigate("MatchDetails", {
          ladderId,
          matchId: second.ladderMatchId,
          match: second,
        })
      }
    />
  );
};

export default PlayMatchTwoHere;
