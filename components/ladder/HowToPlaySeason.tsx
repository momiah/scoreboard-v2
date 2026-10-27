import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  LADDER_PLAYOFF_START_DAYS,
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_POSTING_CLOSE_DAYS,
  LADDER_REGISTRATION_CLOSE_DAYS,
  LADDER_STATUS,
  LADDER_STATUS_LABELS,
} from "@shared";

import { Reveal, RevealContext } from "./HowToPlayReveal";

const BLUE = "#00A2FF";
const GOLD = "#FFC800";
const RUN_MS = 6500;
const HOLD_MS = 1600;
const TRACK_HEIGHT = 8;

interface SeasonPhase {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  days: number;
  length: string;
  text: string;
  color: string;
}

const daysLabel = (days: number) => `${days} day${days === 1 ? "" : "s"}`;

/** The season's phases with their lengths, all timed from shared. */
const seasonPhases = (
  noun: "player" | "team",
  playoffSpots: number,
): SeasonPhase[] => {
  const playoffRounds = Math.log2(playoffSpots);
  return [
    {
      key: LADDER_STATUS.REGISTRATION_OPEN,
      icon: "person-add-outline",
      label: LADDER_STATUS_LABELS[LADDER_STATUS.REGISTRATION_OPEN],
      days: LADDER_REGISTRATION_CLOSE_DAYS,
      length: daysLabel(LADDER_REGISTRATION_CLOSE_DAYS),
      text: "Join and start playing.",
      color: BLUE,
    },
    {
      key: LADDER_STATUS.REGISTRATION_CLOSED,
      icon: "lock-closed-outline",
      label: LADDER_STATUS_LABELS[LADDER_STATUS.REGISTRATION_CLOSED],
      days: LADDER_PLAYOFF_START_DAYS - LADDER_REGISTRATION_CLOSE_DAYS,
      length: daysLabel(
        LADDER_PLAYOFF_START_DAYS - LADDER_REGISTRATION_CLOSE_DAYS,
      ),
      text: `No new ${noun}s. Last matches ${daysLabel(LADDER_POSTING_CLOSE_DAYS)} before playoffs.`,
      color: "#5B8CFF",
    },
    {
      key: LADDER_STATUS.PLAYOFFS,
      icon: "git-network-outline",
      label: LADDER_STATUS_LABELS[LADDER_STATUS.PLAYOFFS],
      days: playoffRounds * LADDER_PLAYOFF_TIE_DAYS,
      length: `${playoffRounds} rounds`,
      text: `Top ${playoffSpots} knockout. ${daysLabel(LADDER_PLAYOFF_TIE_DAYS)} a round.`,
      color: "#A66BFF",
    },
  ];
};

/** The season as a bar sized by each phase's length, with a marker running along it and the matching row lighting up. */
const HowToPlaySeason: React.FC<{
  noun: "player" | "team";
  playoffSpots: number;
  isPaid: boolean;
}> = ({ noun, playoffSpots, isPaid }) => {
  const active = useContext(RevealContext);
  const phases = seasonPhases(noun, playoffSpots);
  const totalDays = phases.reduce((sum, phase) => sum + phase.days, 0);
  const progress = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(progress, {
          toValue: 1,
          duration: RUN_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.delay(HOLD_MS),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  const bounds = phases.reduce<{ start: number; end: number }[]>(
    (acc, phase) => {
      const start = acc.length ? acc[acc.length - 1].end : 0;
      return [...acc, { start, end: start + phase.days / totalDays }];
    },
    [],
  );
  const finish = { start: 0.999, end: 1 };

  const lit = ({ start, end }: { start: number; end: number }) =>
    progress.interpolate({
      inputRange: [0, start, start + 0.001, end, Math.min(end + 0.001, 1)],
      outputRange: [0.4, 0.4, 1, 1, end >= 0.999 ? 1 : 0.4],
      extrapolate: "clamp",
    });

  const onTrackLayout = (event: LayoutChangeEvent) =>
    setTrackWidth(event.nativeEvent.layout.width);

  return (
    <Container>
      <Reveal order={2} from="pop">
        <Bar>
          <Track onLayout={onTrackLayout}>
            {phases.map((phase, index) => (
              <Segment key={phase.key} style={{ flex: phase.days }}>
                <Animated.View
                  style={{
                    height: "100%",
                    backgroundColor: phase.color,
                    width: progress.interpolate({
                      inputRange: [bounds[index].start, bounds[index].end],
                      outputRange: ["0%", "100%"],
                      extrapolate: "clamp",
                    }),
                  }}
                />
              </Segment>
            ))}
          </Track>
          {trackWidth > 0 ? (
            <Marker
              style={{
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, trackWidth],
                    }),
                  },
                ],
              }}
            />
          ) : null}
          <Finish>
            <Ionicons name="trophy" size={22} color={GOLD} />
          </Finish>
        </Bar>
        <Lengths>
          {phases.map((phase) => (
            <LengthCell key={phase.key} style={{ flex: phase.days }}>
              <LengthText style={{ color: phase.color }}>
                {phase.length}
              </LengthText>
            </LengthCell>
          ))}
          <TrophySpacer />
        </Lengths>
      </Reveal>

      <Rows>
        {phases.map((phase, index) => (
          <Reveal key={phase.key} order={3 + index} from="right">
            <Animated.View style={{ opacity: lit(bounds[index]) }}>
              <Row>
                <Dot style={{ borderColor: phase.color }}>
                  <Ionicons name={phase.icon} size={16} color={phase.color} />
                </Dot>
                <RowText>
                  <Label>{phase.label}</Label>
                  <Detail>{phase.text}</Detail>
                </RowText>
              </Row>
            </Animated.View>
          </Reveal>
        ))}
        <Reveal order={3 + phases.length} from="right">
          <Animated.View style={{ opacity: lit(finish) }}>
            <Row>
              <Dot style={{ borderColor: GOLD }}>
                <Ionicons name="trophy-outline" size={16} color={GOLD} />
              </Dot>
              <RowText>
                <Label gold>
                  {LADDER_STATUS_LABELS[LADDER_STATUS.COMPLETED]}
                </Label>
                <Detail>
                  {isPaid
                    ? "The champion crowned. Cash paid. CP awarded."
                    : "The champion crowned. CP awarded."}
                </Detail>
              </RowText>
            </Row>
          </Animated.View>
        </Reveal>
      </Rows>
    </Container>
  );
};

const Container = styled.View({
  alignSelf: "stretch",
  gap: 18,
});

const Bar = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const Track = styled.View({
  flex: 1,
  height: TRACK_HEIGHT,
  flexDirection: "row",
  gap: 3,
});

const Segment = styled.View({
  height: "100%",
  borderRadius: TRACK_HEIGHT / 2,
  overflow: "hidden",
  backgroundColor: "rgba(255, 255, 255, 0.08)",
});

const MARKER_SIZE = 16;

const Marker = styled(Animated.View)({
  position: "absolute",
  left: -MARKER_SIZE / 2,
  width: MARKER_SIZE,
  height: MARKER_SIZE,
  borderRadius: MARKER_SIZE / 2,
  backgroundColor: "white",
  borderWidth: 3,
  borderColor: BLUE,
  shadowColor: BLUE,
  shadowOpacity: 0.9,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 0 },
});

const Finish = styled.View({
  width: 30,
  alignItems: "center",
});

const Lengths = styled.View({
  flexDirection: "row",
  gap: 3,
  marginTop: 8,
});

const LengthCell = styled.View({
  alignItems: "center",
});

const LengthText = styled.Text({
  fontSize: 12,
  fontWeight: "bold",
});

const TrophySpacer = styled.View({
  width: 38,
});

const Rows = styled.View({
  gap: 12,
});

const Row = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
});

const Dot = styled.View({
  width: 34,
  height: 34,
  borderRadius: 17,
  borderWidth: 1.5,
  alignItems: "center",
  justifyContent: "center",
});

const RowText = styled.View({
  flex: 1,
  gap: 1,
});

const Label = styled.Text<{ gold?: boolean }>(
  ({ gold }: { gold?: boolean }) => ({
    color: gold ? GOLD : "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  }),
);

const Detail = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
});

export default HowToPlaySeason;
