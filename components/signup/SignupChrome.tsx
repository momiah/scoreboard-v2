import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { HowToPlayBackground } from "../ladder/HowToPlayBackdrop";
import { SCREEN_BG } from "../ladder/howToPlayTheme";

export { BLUE, BODY, GOLD, MUTED, SCREEN_BG } from "../ladder/howToPlayTheme";
export const SHEET = "rgb(9, 24, 42)";
export const BRONZE = "rgb(194, 106, 46)";

/** A sign-up screen on the How to Play background. */
const SignupChrome: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <View style={styles.screen}>
    <HowToPlayBackground />
    {children}
  </View>
);

let glowCounter = 0;

/** A soft colour halo, centred in its parent. Drawn with a radial gradient so it looks the same on iOS and Android. */
const GlowDiscBase: React.FC<{
  size: number;
  color: string;
  opacity?: number;
  offsetX?: number;
}> = ({ size, color, opacity = 0.55, offsetX = 0 }) => {
  const id = useRef(`glow-${(glowCounter += 1)}`).current;
  return (
    <View pointerEvents="none" style={styles.glowHost}>
      <Svg
        width={size}
        height={size}
        style={{ marginLeft: offsetX * 2, flexShrink: 0 }}
      >
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.5" stopColor={color} stopOpacity={opacity * 0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
};

export const GlowDisc = React.memo(GlowDiscBase);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  glowHost: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SignupChrome;
