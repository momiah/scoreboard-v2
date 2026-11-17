import React from "react";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  LADDER_MIN_ENTRANTS_TO_START,
  LADDER_SEASON_EXTENSION_DAYS,
  getLadderEntrantNoun,
  getLadderEntrantsNeededToStart,
} from "@shared/helpers";
import type { Ladder } from "@shared/types";

import { formatSeasonStart } from "../../helpers/ladderPhases";

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

export const getPreSeasonNoticeBody = (ladder: Ladder): string => {
  const noun = getLadderEntrantNoun(ladder.ladderType);
  const needed = getLadderEntrantsNeededToStart(ladder.participantCount ?? 0);
  if (needed === 0) {
    return `Enough ${noun}s have joined. Matches open when the season starts.`;
  }
  const outcome = ladder.seasonExtendedAt
    ? "the ladder will be cancelled and any entry fees refunded in full"
    : `the season start moves back ${LADDER_SEASON_EXTENSION_DAYS} days`;
  return `${plural(needed, `more ${noun}`)} needed to start. If fewer than ${LADDER_MIN_ENTRANTS_TO_START} ${noun}s have joined by then, ${outcome}.`;
};

const LadderPreSeasonNotice: React.FC<{ ladder: Ladder }> = ({ ladder }) => (
  <Card testID="ladder-preseason-notice">
    <TitleRow>
      <Ionicons name="calendar-outline" size={18} color="#00A2FF" />
      <Title testID="ladder-preseason-title">
        {ladder.seasonExtendedAt ? "Season start moved back" : "Season starts"}{" "}
        {formatSeasonStart(ladder)}
      </Title>
    </TitleRow>
    <Body testID="ladder-preseason-body">{getPreSeasonNoticeBody(ladder)}</Body>
  </Card>
);

export default LadderPreSeasonNotice;

const Card = styled.View({
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(0, 162, 255, 0.08)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.35)",
  gap: 6,
  marginBottom: 12,
});

const TitleRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "bold",
  flexShrink: 1,
});

const Body = styled.Text({
  color: "#cbd5e1",
  fontSize: 13,
  lineHeight: 19,
});
