import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import styled from "styled-components/native";

interface GameGlowProps {
  glowAnim: Animated.Value;
  color?: string;
  testID?: string;
}

const GameGlow: React.FC<GameGlowProps> = ({
  glowAnim,
  color = "#FFA500",
  testID,
}) => {
  const rings = [
    { inset: 0, radius: 8, width: 6, alpha: 0.1 },
    { inset: 0, radius: 8, width: 5, alpha: 0.18 },
    { inset: 0, radius: 8, width: 4, alpha: 0.3 },
    { inset: 0, radius: 8, width: 3, alpha: 0.45 },
    { inset: 0, radius: 8, width: 2, alpha: 0.7 },
    { inset: 0, radius: 8, width: 1.5, alpha: 1 },
  ];
  return (
    <>
      {testID && (
        <View
          testID={testID}
          accessibilityLabel={color}
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
      {rings.map((ring, index) => (
        <Ring
          key={index}
          pointerEvents="none"
          style={{
            opacity: glowAnim,
            top: ring.inset,
            left: ring.inset,
            right: ring.inset,
            bottom: ring.inset,
            borderRadius: ring.radius,
            borderWidth: ring.width,
            borderColor: hexWithAlpha(color, ring.alpha),
          }}
        />
      ))}
    </>
  );
};

// Runs the glow-and-fade sequence on the given animated value.
// onComplete fires when the fade-out finishes (use it to clear the highlight).
export const runGlow = (glowAnim: Animated.Value, onComplete?: () => void) => {
  glowAnim.setValue(0);
  Animated.sequence([
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }),
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 900,
      delay: 100,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }),
  ]).start(() => {
    onComplete?.();
  });
};

// Shared scroll-then-glow hook. Owns the glow anim, highlight state, and
// scroll/glow timing so brackets and fixtures stay in sync.
// Caller supplies its own scroll logic; return false if the game isn't found.
export const useScrollToGameGlow = (
  scrollToGameId: string | undefined,
  scrollToGame: (gameId: string) => boolean,
) => {
  const [highlightedGameId, setHighlightedGameId] = useState<string | null>(
    null,
  );
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scrollToGameId) return;

    const timer = setTimeout(() => {
      const found = scrollToGame(scrollToGameId);
      if (!found) return;

      // Glow after the scroll settles so the card is in its final position.
      setTimeout(() => {
        // The highlight stays set after the fade (its rings sit at opacity 0)
        // so the glow marker remains readable by Maestro on slower devices.
        setHighlightedGameId(scrollToGameId);
        runGlow(glowAnim);
      }, 400);
    }, 400);

    return () => clearTimeout(timer);
  }, [scrollToGameId]);

  return { highlightedGameId, glowAnim };
};

// Convert a hex colour + alpha (0–1) to an rgba string.
const hexWithAlpha = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Ring = styled(Animated.View)({
  position: "absolute",
});

export default GameGlow;
