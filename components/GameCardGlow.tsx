import React from "react";
import { Animated, Easing } from "react-native";
import styled from "styled-components/native";

interface GameGlowProps {
  glowAnim: Animated.Value;
  color?: string;
}

const GameGlow: React.FC<GameGlowProps> = ({ glowAnim, color = "#FFA500" }) => {
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
