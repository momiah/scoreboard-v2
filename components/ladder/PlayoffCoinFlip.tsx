import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import styled from "styled-components/native";

import { LADDER_PLAYOFF_COIN_FACE } from "@shared";
import type {
  LadderPlayoffCoinCall,
  LadderPlayoffCoinFace,
} from "@shared/types";

import { courtChampsLogo, ladders } from "../../mockImages";

const COIN_SIZE = 96;
const CALL_COIN_SIZE = 48;
const SPIN_MS_PER_TURN = 260;
const LANDING_TURNS = 4;
const LANDING_MS = 2400;
const GLOW = "#9be7ff";

const FACE_STYLE = {
  [LADDER_PLAYOFF_COIN_FACE.LOGO]: {
    image: courtChampsLogo,
    fill: "#032462ff",
    rim: "#0040C8",
    engraving: "#ffffff",
  },
  [LADDER_PLAYOFF_COIN_FACE.TROPHY]: {
    image: ladders[0],
    fill: "#FFC800",
    rim: "#e0a800",
    engraving: "#8a6400",
  },
};

const CALLS: { call: LadderPlayoffCoinCall; label: string }[] = [
  { call: LADDER_PLAYOFF_COIN_FACE.LOGO, label: "Heads" },
  { call: LADDER_PLAYOFF_COIN_FACE.TROPHY, label: "Tails" },
];

const faceTurn = (face: LadderPlayoffCoinFace): number =>
  face === LADDER_PLAYOFF_COIN_FACE.LOGO ? 0 : 0.5;

interface PlayoffCoinFlipProps {
  face: LadderPlayoffCoinFace | null;
  call: LadderPlayoffCoinCall | null;
  callerName: string | null;
  canFlip: boolean;
  idleText?: string;
  onFlip: (call: LadderPlayoffCoinCall) => Promise<boolean>;
}

const PlayoffCoinFlip: React.FC<PlayoffCoinFlipProps> = ({
  face,
  call,
  callerName,
  canFlip,
  idleText,
  onFlip,
}) => {
  const turns = useRef(new Animated.Value(face ? faceTurn(face) : 0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const spinning = useRef(false);
  const spinStartedAt = useRef(0);
  const initialFace = useRef(face);
  const [phase, setPhase] = useState<"idle" | "tossing" | "landed">(
    face ? "landed" : "idle",
  );
  const [ownCall, setOwnCall] = useState<LadderPlayoffCoinCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const called = ownCall ?? call;

  const startSpin = () => {
    spinning.current = true;
    spinStartedAt.current = Date.now();
    turns.setValue(0);
    setPhase("tossing");
    Animated.timing(lift, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    Animated.timing(turns, {
      toValue: 1000,
      duration: 1000 * SPIN_MS_PER_TURN,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const land = (landed: LadderPlayoffCoinFace) => {
    const spun = (Date.now() - spinStartedAt.current) / SPIN_MS_PER_TURN;
    turns.stopAnimation();
    turns.setValue(spun);
    Animated.parallel([
      Animated.timing(turns, {
        toValue: Math.ceil(spun) + LANDING_TURNS + faceTurn(landed),
        duration: LANDING_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(LANDING_MS * 0.55),
        Animated.timing(lift, {
          toValue: 0,
          duration: LANDING_MS * 0.45,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      spinning.current = false;
      setPhase("landed");
    });
  };

  useEffect(() => {
    if (!face || face === initialFace.current) return;
    initialFace.current = face;
    if (!spinning.current) startSpin();
    land(face);
  }, [face]);

  const handleCall = async (choice: LadderPlayoffCoinCall) => {
    if (spinning.current || face) return;
    setError(null);
    setOwnCall(choice);
    startSpin();
    const ok = await onFlip(choice);
    if (!ok) {
      turns.stopAnimation();
      lift.stopAnimation();
      turns.setValue(0);
      lift.setValue(0);
      spinning.current = false;
      setOwnCall(null);
      setPhase("idle");
      setError("Couldn't flip the coin. Try again.");
    }
  };

  const rotation = (offset: number) =>
    turns.interpolate({
      inputRange: [0, 1],
      outputRange: [`${offset * 360}deg`, `${offset * 360 + 360}deg`],
    });
  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -36],
  });
  const shadowScale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });

  const landed = phase === "landed" && !!face;
  const prompt =
    phase === "idle" && !face
      ? (idleText ??
        (canFlip
          ? "Flip the coin to see who starts at home first"
          : "Waiting for a player to flip the coin"))
      : null;

  return (
    <FlipArea
      testID={
        landed
          ? "playoff-coin-result"
          : !canFlip && phase === "idle"
            ? "playoff-coin-waiting"
            : undefined
      }
    >
      <CoinStage testID="playoff-coin">
        <Animated.View style={{ transform: [{ translateY }] }}>
          <Coin
            size={COIN_SIZE}
            face={LADDER_PLAYOFF_COIN_FACE.LOGO}
            style={faceStyle(rotation(0))}
          />
          <Coin
            size={COIN_SIZE}
            face={LADDER_PLAYOFF_COIN_FACE.TROPHY}
            style={[StyleSheet.absoluteFill, faceStyle(rotation(0.5))]}
          />
        </Animated.View>
        <Shadow style={{ transform: [{ scaleX: shadowScale }] }} />
      </CoinStage>

      {prompt ? <Caption>{prompt}</Caption> : null}

      <Calls>
        {CALLS.map(({ call: option, label }) => {
          const chosen = called === option;
          return (
            <CallButton
              key={option}
              activeOpacity={0.8}
              onPress={() => handleCall(option)}
              disabled={!canFlip || phase !== "idle" || !!face}
              accessible={false}
              testID={`playoff-coin-call-${label.toLowerCase()}`}
            >
              <CallRing
                chosen={chosen}
                testID={
                  chosen
                    ? `playoff-coin-called-${label.toLowerCase()}`
                    : undefined
                }
              >
                <Coin size={CALL_COIN_SIZE} face={option} />
              </CallRing>
              <CallLabel chosen={chosen}>{label}</CallLabel>
              {chosen && callerName ? (
                <CallerName numberOfLines={1} testID="playoff-coin-caller">
                  {callerName}
                </CallerName>
              ) : null}
            </CallButton>
          );
        })}
      </Calls>
      {error ? (
        <ErrorText testID="playoff-coin-error">{error}</ErrorText>
      ) : null}
    </FlipArea>
  );
};

export default PlayoffCoinFlip;

const Coin = ({
  size,
  face,
  style,
}: {
  size: number;
  face: LadderPlayoffCoinFace;
  style?: React.ComponentProps<typeof Animated.View>["style"];
}) => {
  const look = FACE_STYLE[face];
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: look.fill,
          borderWidth: size > 60 ? 5 : 3,
          borderColor: look.rim,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Engraving
        source={look.image}
        style={{
          width: size * 0.58,
          height: size * 0.58,
          tintColor: look.engraving,
        }}
      />
    </Animated.View>
  );
};

const faceStyle = (rotateX: Animated.AnimatedInterpolation<string>) => ({
  backfaceVisibility: "hidden" as const,
  transform: [{ perspective: 800 }, { rotateX }],
});

const FlipArea = styled.View({
  alignItems: "center",
  gap: 10,
  paddingTop: 16,
  paddingBottom: 4,
});

const CoinStage = styled.View({
  alignItems: "center",
});

const Engraving = styled.Image.attrs({ resizeMode: "contain" })({});

const Shadow = styled(Animated.View)({
  width: COIN_SIZE * 0.8,
  height: 8,
  marginTop: 8,
  borderRadius: 4,
  backgroundColor: "rgba(0, 0, 0, 0.35)",
});

const Calls = styled.View({
  flexDirection: "row",
  gap: 32,
});

const CallButton = styled.TouchableOpacity({
  alignItems: "center",
  gap: 6,
});

const CallRing = ({
  chosen,
  testID,
  children,
}: {
  chosen: boolean;
  testID?: string;
  children: React.ReactNode;
}) => (
  <View
    testID={testID}
    style={{
      padding: 3,
      borderRadius: (CALL_COIN_SIZE + 12) / 2,
      borderWidth: 2,
      borderColor: chosen ? GLOW : "transparent",
      shadowColor: GLOW,
      shadowOpacity: chosen ? 0.9 : 0,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: chosen ? 8 : 0,
    }}
  >
    {children}
  </View>
);

const CallLabel = styled.Text(({ chosen }: { chosen: boolean }) => ({
  color: chosen ? GLOW : "#ffffff",
  fontSize: 13,
  fontWeight: "600",
}));

const CallerName = styled.Text({
  maxWidth: 120,
  color: "#cbd5e1",
  fontSize: 12,
  textAlign: "center",
});

const Caption = styled.Text({
  color: "#cbd5e1",
  fontSize: 13,
  textAlign: "center",
});

const ErrorText = styled.Text({
  color: "#ff8aa0",
  fontSize: 12,
});
