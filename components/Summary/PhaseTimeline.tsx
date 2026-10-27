import React, { useMemo } from "react";
import styled from "styled-components/native";

import { getLadderPhaseState, type LadderPhaseState } from "@shared";
import type { Ladder } from "@shared/types";
import { getLadderPhases, formatPhaseRange } from "../../helpers/ladderPhases";

interface PhaseTimelineProps {
  ladder: Ladder;
  header?: string;
}

const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  ladder,
  header = "Phase Timeline",
}) => {
  const phases = useMemo(() => getLadderPhases(ladder), [ladder]);

  return (
    <Timeline>
      <TimelineHeader>{header}</TimelineHeader>
      {phases.map((phase, index) => {
        const state = getLadderPhaseState(ladder.status, phase.status);
        const isFirst = index === 0;
        const isLast = index === phases.length - 1;
        return (
          <TimelineRow
            key={phase.status}
            testID={`ladder-phase-${phase.status}`}
          >
            <Gutter>
              {!isFirst && (
                <LineTop filled={state === "completed" || state === "active"} />
              )}
              {!isLast && <LineBottom filled={state === "completed"} />}
              <Dot state={state} />
            </Gutter>
            <PhaseContent last={isLast}>
              <PhaseLabel state={state}>{phase.label}</PhaseLabel>
              <PhaseRange>{formatPhaseRange(phase)}</PhaseRange>
              <PhaseDescription>{phase.description}</PhaseDescription>
            </PhaseContent>
          </TimelineRow>
        );
      })}
    </Timeline>
  );
};

export default PhaseTimeline;

const GUTTER_WIDTH = 24;
const DOT_SIZE = 14;
const DOT_TOP = 10;
const DOT_CENTER_Y = DOT_TOP + DOT_SIZE / 2;
const LINE_LEFT = GUTTER_WIDTH / 2 - 1;

const LINE_DIM = "#22384f";
const LINE_FILLED = "#D4AF37";
const DOT_COLORS: Record<LadderPhaseState, string> = {
  completed: "#D4AF37",
  active: "#FFD700",
  upcoming: "#22384f",
};

const Timeline = styled.View({
  marginTop: 30,
});

const TimelineHeader = styled.Text({
  color: "#6b8199",
  fontSize: 12,
  fontWeight: "600",
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 18,
});

const TimelineRow = styled.View({
  flexDirection: "row",
});

const Gutter = styled.View({
  width: GUTTER_WIDTH,
  position: "relative",
});

const LineTop = styled.View<{ filled: boolean }>(
  ({ filled }: { filled: boolean }) => ({
    position: "absolute",
    top: 0,
    left: LINE_LEFT,
    width: 2,
    height: DOT_CENTER_Y,
    backgroundColor: filled ? LINE_FILLED : LINE_DIM,
  }),
);

const LineBottom = styled.View<{ filled: boolean }>(
  ({ filled }: { filled: boolean }) => ({
    position: "absolute",
    top: DOT_CENTER_Y,
    bottom: 0,
    left: LINE_LEFT,
    width: 2,
    backgroundColor: filled ? LINE_FILLED : LINE_DIM,
  }),
);

const Dot = styled.View<{ state: LadderPhaseState }>(
  ({ state }: { state: LadderPhaseState }) => ({
    position: "absolute",
    top: DOT_TOP,
    left: GUTTER_WIDTH / 2 - DOT_SIZE / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    zIndex: 1,
    backgroundColor: DOT_COLORS[state],
    ...(state === "active"
      ? {
          shadowColor: "#ffb700ff",
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }
      : {}),
  }),
);

const PhaseContent = styled.View<{ last: boolean }>(
  ({ last }: { last: boolean }) => ({
    flex: 1,
    paddingLeft: 8,
    paddingBottom: last ? 0 : 24,
  }),
);

const PhaseLabel = styled.Text<{ state: LadderPhaseState }>(
  ({ state }: { state: LadderPhaseState }) => ({
    color: state === "upcoming" ? "#6b8199" : "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  }),
);

const PhaseRange = styled.Text({
  color: "#5f7d99",
  fontSize: 12,
  marginTop: 3,
});

const PhaseDescription = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  marginTop: 5,
});
