import React, { useContext, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { RevealContext } from "./HowToPlayReveal";

const SLOTS = 4;
const PLAYOFF_SLOTS = 2;
const OPPONENT_BARS = [0.9, 0.75, 0.6];
const USER_BAR_START = 0.35;
const STEP_MS = 650;
const BLUE = "#00A2FF";
const GOLD = "#FFC800";

/** The user's row climbs a four-player ladder, earning CP with each win, into the playoff places. */
const HowToPlayLadderClimb: React.FC<{ rowHeight: number }> = ({
  rowHeight,
}) => {
  const active = useContext(RevealContext);
  const climb = useRef(new Animated.Value(0)).current;
  const gain = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const steps = Array.from({ length: SLOTS - 1 }, (_, step) =>
      Animated.sequence([
        Animated.timing(gain, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
        Animated.parallel([
          Animated.timing(climb, {
            toValue: step + 1,
            duration: STEP_MS,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(gain, {
            toValue: 1,
            duration: STEP_MS + 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
        Animated.delay(350),
      ]),
    );
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        ...steps,
        Animated.delay(1800),
        Animated.timing(fade, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(climb, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
        Animated.timing(gain, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, climb, gain, fade]);

  const lastStep = SLOTS - 1;
  const userTop = climb.interpolate({
    inputRange: [0, lastStep],
    outputRange: [lastStep * rowHeight, 0],
  });
  const userBar = climb.interpolate({
    inputRange: [0, lastStep],
    outputRange: [`${USER_BAR_START * 100}%`, "100%"],
  });
  const opponentTop = (slot: number) =>
    climb.interpolate({
      inputRange: [lastStep - 1 - slot, lastStep - slot],
      outputRange: [slot * rowHeight, (slot + 1) * rowHeight],
      extrapolate: "clamp",
    });

  return (
    <Animated.View
      testID="how-to-play-ladder-climb"
      style={{ width: 280, height: SLOTS * rowHeight, opacity: fade }}
    >
      {Array.from({ length: SLOTS }, (_, slot) => (
        <SlotMarks
          key={slot}
          style={{ top: slot * rowHeight, height: rowHeight }}
        >
          <Rank playoff={slot < PLAYOFF_SLOTS}>{slot + 1}</Rank>
          {slot < PLAYOFF_SLOTS ? (
            <Ionicons name="trophy" size={16} color={GOLD} />
          ) : null}
        </SlotMarks>
      ))}
      <PlayoffCut style={{ top: PLAYOFF_SLOTS * rowHeight - 1 }} />

      {OPPONENT_BARS.map((bar, slot) => (
        <Animated.View
          key={slot}
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            top: opponentTop(slot),
          }}
        >
          <Row style={{ height: rowHeight - 6 }}>
            <Avatar>
              <Ionicons name="person" size={13} color="#7f97a8" />
            </Avatar>
            <BarTrack>
              <Bar
                style={{ width: `${bar * 100}%`, backgroundColor: "#33445a" }}
              />
            </BarTrack>
          </Row>
        </Animated.View>
      ))}

      <Animated.View
        style={{ position: "absolute", left: 30, right: 30, top: userTop }}
      >
        <Row user style={{ height: rowHeight - 6 }}>
          <Avatar user>
            <Ionicons name="person" size={13} color="white" />
          </Avatar>
          <BarTrack>
            <Animated.View
              style={{
                width: userBar,
                height: "100%",
                borderRadius: 3,
                backgroundColor: BLUE,
              }}
            />
          </BarTrack>
        </Row>
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: 6,
            top: -8,
            opacity: gain.interpolate({
              inputRange: [0, 0.2, 0.7, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateY: gain.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -18],
                }),
              },
            ],
          }}
        >
          <Gain>+CP</Gain>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const SlotMarks = styled.View({
  position: "absolute",
  left: 0,
  right: 0,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 4,
});

const Rank = styled.Text<{ playoff: boolean }>(
  ({ playoff }: { playoff: boolean }) => ({
    width: 18,
    color: playoff ? GOLD : "#7f97a8",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  }),
);

const PlayoffCut = styled.View({
  position: "absolute",
  left: 0,
  right: 0,
  borderTopWidth: 1,
  borderStyle: "dashed",
  borderColor: "rgba(255, 200, 0, 0.6)",
});

const Row = styled.View<{ user?: boolean }>(({ user }: { user?: boolean }) => ({
  marginTop: 3,
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingHorizontal: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: user ? BLUE : "transparent",
  backgroundColor: user
    ? "rgba(0, 162, 255, 0.18)"
    : "rgba(255, 255, 255, 0.05)",
}));

const Avatar = styled.View<{ user?: boolean }>(
  ({ user }: { user?: boolean }) => ({
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: user ? BLUE : "#1e2b3d",
  }),
);

const BarTrack = styled.View({
  flex: 1,
  height: 6,
  borderRadius: 3,
  backgroundColor: "rgba(255, 255, 255, 0.06)",
});

const Bar = styled.View({
  height: "100%",
  borderRadius: 3,
});

const Gain = styled.Text({
  color: GOLD,
  fontSize: 13,
  fontWeight: "bold",
});

export default HowToPlayLadderClimb;
