import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

const SPIN_MS = 350;

interface PlayoffCoinFlipProps {
  hostName: string | null;
  canFlip: boolean;
  onFlip: () => Promise<boolean>;
}

const PlayoffCoinFlip: React.FC<PlayoffCoinFlipProps> = ({
  hostName,
  canFlip,
  onFlip,
}) => {
  const spin = useRef(new Animated.Value(0)).current;
  const loop = useRef<Animated.CompositeAnimation | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hostName || !loop.current) return;
    loop.current.stop();
    loop.current = null;
    spin.setValue(0);
    setFlipping(false);
  }, [hostName, spin]);

  const handleFlip = async () => {
    if (flipping) return;
    setError(null);
    setFlipping(true);
    loop.current = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.current.start();
    const ok = await onFlip();
    if (!ok) {
      loop.current?.stop();
      loop.current = null;
      spin.setValue(0);
      setFlipping(false);
      setError("Couldn't flip the coin. Try again.");
    }
  };

  const scaleX = spin.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, -1, 1],
  });

  if (hostName) {
    return (
      <ResultRow testID="playoff-coin-result">
        <Ionicons name="ellipse" size={14} color="#FFC800" />
        <ResultText>Coin toss: {hostName} hosts the first match</ResultText>
      </ResultRow>
    );
  }

  if (!canFlip) {
    return (
      <ResultRow testID="playoff-coin-waiting">
        <ResultText>Waiting for the coin toss</ResultText>
      </ResultRow>
    );
  }

  return (
    <FlipArea>
      <CoinButton
        activeOpacity={0.85}
        onPress={handleFlip}
        disabled={flipping}
        accessible={false}
        testID="playoff-coin-flip"
      >
        <Coin style={{ transform: [{ scaleX }] }}>
          <Ionicons name="trophy" size={28} color="#5c4500" />
        </Coin>
      </CoinButton>
      <FlipText>
        {flipping ? "Flipping…" : "Tap the coin to decide who hosts first"}
      </FlipText>
      {error ? <ErrorText testID="playoff-coin-error">{error}</ErrorText> : null}
    </FlipArea>
  );
};

export default PlayoffCoinFlip;

const FlipArea = styled.View({
  alignItems: "center",
  gap: 8,
  paddingVertical: 8,
});

const CoinButton = styled.TouchableOpacity({});

const Coin = styled(Animated.View)({
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: "#FFC800",
  borderWidth: 3,
  borderColor: "#e0a800",
  alignItems: "center",
  justifyContent: "center",
});

const FlipText = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
});

const ErrorText = styled.Text({
  color: "#ff8aa0",
  fontSize: 12,
});

const ResultRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const ResultText = styled.Text({
  color: "#cbd5e1",
  fontSize: 13,
});
