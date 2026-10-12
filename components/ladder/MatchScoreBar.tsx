import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import styled from "styled-components/native";

import type { LadderMatchOutcome } from "../../helpers/ladderMatchProgress";

const SCORE_COLORS: Record<LadderMatchOutcome, string> = {
  win: "#19a800ff",
  loss: "#FF4B6E",
  undecided: "#64748b",
};

interface MatchScoreBarProps {
  label: string;
  leftNames: string[];
  rightNames: string[];
  leftScore: number;
  rightScore: number;
  outcome: LadderMatchOutcome;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const MatchScoreBar: React.FC<MatchScoreBarProps> = ({
  label,
  leftNames,
  rightNames,
  leftScore,
  rightScore,
  outcome,
  style,
  testID,
}) => (
  <ScoreBar style={style} testID={testID}>
    <ScoreLabel>{label}</ScoreLabel>
    <ScoreRow>
      <SideCol>
        {leftNames.map((name, i) => (
          <SideName key={`${i}-${name}`} numberOfLines={1}>
            {name}
          </SideName>
        ))}
      </SideCol>
      <ScoreValue outcome={outcome}>
        {leftScore} - {rightScore}
      </ScoreValue>
      <SideCol align="right">
        {rightNames.map((name, i) => (
          <SideName key={`${i}-${name}`} numberOfLines={1} align="right">
            {name}
          </SideName>
        ))}
      </SideCol>
    </ScoreRow>
  </ScoreBar>
);

export default MatchScoreBar;

const ScoreBar = styled.View({
  backgroundColor: "rgba(0, 162, 255, 0.08)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  borderRadius: 12,
  paddingVertical: 12,
  alignItems: "center",
});

const ScoreLabel = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "600",
  letterSpacing: 0.6,
  textTransform: "uppercase",
});

const ScoreRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "stretch",
  paddingHorizontal: 14,
  marginTop: 6,
});

const SideCol = styled.View<{ align?: "left" | "right" }>(
  ({ align }: { align?: "left" | "right" }) => ({
    flex: 1,
    gap: 2,
    alignItems: align === "right" ? "flex-end" : "flex-start",
  }),
);

const SideName = styled.Text<{ align?: "left" | "right" }>(
  ({ align }: { align?: "left" | "right" }) => ({
    maxWidth: "100%",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: align === "right" ? "right" : "left",
  }),
);

const ScoreValue = styled.Text<{ outcome: LadderMatchOutcome }>(
  ({ outcome }: { outcome: LadderMatchOutcome }) => ({
    color: SCORE_COLORS[outcome],
    fontSize: 32,
    fontWeight: "bold",
    marginHorizontal: 12,
    fontVariant: ["tabular-nums"],
  }),
);
