import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
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
const ENGRAVING = "#8a6400";

const FACE_IMAGE = {
  [LADDER_PLAYOFF_COIN_FACE.LOGO]: courtChampsLogo,
  [LADDER_PLAYOFF_COIN_FACE.TROPHY]: ladders[0],
};

const CALLS: {
  call: LadderPlayoffCoinCall;
  face: LadderPlayoffCoinFace;
  label: string;
}[] = [
  { call: "home", face: LADDER_PLAYOFF_COIN_FACE.LOGO, label: "Home" },
  { call: "away", face: LADDER_PLAYOFF_COIN_FACE.TROPHY, label: "Away" },
];

const faceTurn = (face: LadderPlayoffCoinFace): number =>
  face === LADDER_PLAYOFF_COIN_FACE.LOGO ? 0 : 0.5;

interface PlayoffCoinFlipProps {
  face: LadderPlayoffCoinFace | null;
  resultText: string | null;
  canFlip: boolean;
  onFlip: (call: LadderPlayoffCoinCall) => Promise<boolean>;
}

const PlayoffCoinFlip: React.FC<PlayoffCoinFlipProps> = ({
  face,
  resultText,
  canFlip,
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
  const [called, setCalled] = useState<LadderPlayoffCoinCall | null>(null);
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

  const handleCall = async (call: LadderPlayoffCoinCall) => {
    if (spinning.current || face) return;
    setError(null);
    setCalled(call);
    startSpin();
    const ok = await onFlip(call);
    if (!ok) {
      turns.stopAnimation();
      lift.stopAnimation();
      turns.setValue(0);
      lift.setValue(0);
      spinning.current = false;
      setCalled(null);
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

  const landed = phase === "landed" && !!face;
  const caption = (() => {
    if (landed) return resultText ?? "";
    if (phase === "tossing") {
      return called
        ? `You called ${called === "home" ? "Home" : "Away"}…`
        : "Flipping…";
    }
    if (!canFlip) return "Waiting for the coin toss";
    return "Choose where you want the first match to be played";
  })();
  const testID = landed
    ? "playoff-coin-result"
    : !canFlip && phase === "idle"
      ? "playoff-coin-waiting"
      : undefined;

  return (
    <FlipArea testID={testID}>
      <CoinStage testID="playoff-coin">
        <Animated.View style={{ transform: [{ translateY }] }}>
          <BigFace style={faceStyle(rotation(0))}>
            <Engraving size={COIN_SIZE} source={FACE_IMAGE.logo} />
          </BigFace>
          <BigFace style={[StyleSheet.absoluteFill, faceStyle(rotation(0.5))]}>
            <Engraving size={COIN_SIZE} source={FACE_IMAGE.trophy} />
          </BigFace>
        </Animated.View>
        <Shadow style={{ transform: [{ scaleX: shadowScale }] }} />
      </CoinStage>

      <Caption>{caption}</Caption>

      {canFlip && phase === "idle" && !face ? (
        <Calls>
          {CALLS.map(({ call, face: callFace, label }) => (
            <CallButton
              key={call}
              activeOpacity={0.8}
              onPress={() => handleCall(call)}
              accessible={false}
              testID={`playoff-coin-call-${call}`}
            >
              <SmallCoin>
                <Engraving
                  size={CALL_COIN_SIZE}
                  source={FACE_IMAGE[callFace]}
                />
              </SmallCoin>
              <CallLabel>{label}</CallLabel>
            </CallButton>
          ))}
        </Calls>
      ) : null}

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

const goldCoin = (size: number) => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  backgroundColor: "#FFC800",
  borderWidth: size > 60 ? 5 : 3,
  borderColor: "#e0a800",
  alignItems: "center" as const,
  justifyContent: "center" as const,
});

const FlipArea = styled.View({
  alignItems: "center",
  gap: 10,
  paddingTop: 48,
  paddingBottom: 4,
});

const CoinStage = styled.View({
  alignItems: "center",
});

const BigFace = styled(Animated.View)(goldCoin(COIN_SIZE));

const SmallCoin = styled.View(goldCoin(CALL_COIN_SIZE));

const Engraving = styled.Image.attrs({ resizeMode: "contain" })(
  ({ size }: { size: number }) => ({
    width: size * 0.58,
    height: size * 0.58,
    tintColor: ENGRAVING,
  }),
);

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

const CallLabel = styled.Text({
  color: "#ffffff",
  fontSize: 13,
  fontWeight: "600",
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
