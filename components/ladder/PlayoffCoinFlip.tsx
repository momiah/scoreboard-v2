import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import styled from "styled-components/native";

import type { LadderPlayoffTieSide } from "@shared/types";

import { courtChampsLogo, ladders } from "../../mockImages";

const ladderTrophy = ladders[0];

const COIN_SIZE = 96;
const SPIN_MS_PER_TURN = 260;
const LANDING_TURNS = 4;
const LANDING_MS = 2400;
const ENGRAVING = "#8a6400";

type CoinFace = LadderPlayoffTieSide;

const faceTurn = (face: CoinFace): number => (face === "team1" ? 0 : 0.5);

interface PlayoffCoinFlipProps {
  result: CoinFace | null;
  team1Name: string;
  team2Name: string;
  canFlip: boolean;
  onFlip: () => Promise<boolean>;
}

const PlayoffCoinFlip: React.FC<PlayoffCoinFlipProps> = ({
  result,
  team1Name,
  team2Name,
  canFlip,
  onFlip,
}) => {
  const turns = useRef(
    new Animated.Value(result ? faceTurn(result) : 0),
  ).current;
  const lift = useRef(new Animated.Value(0)).current;
  const spinning = useRef(false);
  const spinStartedAt = useRef(0);
  const initialResult = useRef(result);
  const [phase, setPhase] = useState<"idle" | "tossing" | "landed">(
    result ? "landed" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

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

  const land = (face: CoinFace) => {
    const spun = (Date.now() - spinStartedAt.current) / SPIN_MS_PER_TURN;
    turns.stopAnimation();
    turns.setValue(spun);
    Animated.parallel([
      Animated.timing(turns, {
        toValue: Math.ceil(spun) + LANDING_TURNS + faceTurn(face),
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
    if (!result || result === initialResult.current) return;
    initialResult.current = result;
    if (!spinning.current) startSpin();
    land(result);
  }, [result]);

  const handleFlip = async () => {
    if (spinning.current || result) return;
    setError(null);
    startSpin();
    const ok = await onFlip();
    if (!ok) {
      turns.stopAnimation();
      lift.stopAnimation();
      turns.setValue(0);
      lift.setValue(0);
      spinning.current = false;
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
    outputRange: [0, -56],
  });
  const shadowScale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });

  const hostName = result === "team1" ? team1Name : team2Name;
  const caption = (() => {
    if (phase === "landed" && result)
      return `Coin toss: ${hostName} hosts the first match`;
    if (phase === "tossing") return "Flipping…";
    if (!canFlip) return "Waiting for the coin toss";
    return "Tap the coin to decide who hosts first";
  })();
  const testID =
    phase === "landed" && result
      ? "playoff-coin-result"
      : !canFlip && phase === "idle"
        ? "playoff-coin-waiting"
        : undefined;

  return (
    <FlipArea testID={testID}>
      <CoinButton
        activeOpacity={0.9}
        onPress={handleFlip}
        disabled={!canFlip || !!result || phase !== "idle"}
        accessible={false}
        testID={canFlip && !result ? "playoff-coin-flip" : undefined}
      >
        <Animated.View style={{ transform: [{ translateY }] }}>
          <Face style={faceStyle(rotation(0))}>
            <Engraving source={courtChampsLogo} />
          </Face>
          <Face style={[StyleSheet.absoluteFill, faceStyle(rotation(0.5))]}>
            <Engraving source={ladderTrophy} />
          </Face>
        </Animated.View>
        <Shadow style={{ transform: [{ scaleX: shadowScale }] }} />
      </CoinButton>
      {phase === "idle" && !result ? (
        <Sides>
          Heads: {team1Name} hosts first · Tails: {team2Name} hosts first
        </Sides>
      ) : null}
      <Caption>{caption}</Caption>
      {error ? (
        <ErrorText testID="playoff-coin-error">{error}</ErrorText>
      ) : null}
    </FlipArea>
  );
};

export default PlayoffCoinFlip;

const faceStyle = (rotateX: Animated.AnimatedInterpolation<string>) => ({
  backfaceVisibility: "hidden" as const,
  transform: [{ perspective: 800 }, { rotateX }],
});

const FlipArea = styled.View({
  alignItems: "center",
  gap: 8,
  paddingTop: 48,
  paddingBottom: 4,
});

const CoinButton = styled.TouchableOpacity({
  alignItems: "center",
});

const Face = styled(Animated.View)({
  width: COIN_SIZE,
  height: COIN_SIZE,
  borderRadius: COIN_SIZE / 2,
  backgroundColor: "#FFC800",
  borderWidth: 5,
  borderColor: "#e0a800",
  alignItems: "center",
  justifyContent: "center",
});

const Engraving = styled.Image.attrs({ resizeMode: "contain" })({
  width: COIN_SIZE * 0.58,
  height: COIN_SIZE * 0.58,
  tintColor: ENGRAVING,
});

const Shadow = styled(Animated.View)({
  width: COIN_SIZE * 0.8,
  height: 8,
  marginTop: 8,
  borderRadius: 4,
  backgroundColor: "rgba(0, 0, 0, 0.35)",
});

const Sides = styled.Text({
  color: "#9fb8c8",
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
