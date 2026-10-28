import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import HowToPlayBackdrop from "../ladder/HowToPlayBackdrop";

export const SCREEN_BG = "rgb(3, 16, 31)";
export const BLUE = "#00A2FF";
export const GOLD = "#FFC800";
export const MUTED = "#aaa";
export const BODY = "#c9d6e3";
export const SHEET = "rgb(9, 24, 42)";
export const FIELD_BG = "rgb(22, 24, 28)";
export const FIELD_BORDER = "rgb(38, 42, 49)";
export const BRONZE = "rgb(194, 106, 46)";

/** Same backdrop the How to Play guide uses: gradient, dot grid, drifting waves. */
const SignupChrome: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <View style={styles.screen}>
    <LinearGradient
      pointerEvents="none"
      colors={["rgb(3, 16, 31)", "#020b17", "#01060d"]}
      locations={[0, 0.5, 1]}
      style={StyleSheet.absoluteFill}
    />
    <HowToPlayBackdrop />
    {children}
  </View>
);

let glowCounter = 0;

/** A soft colour halo, centred in its parent. Drawn with a radial gradient so it looks the same on iOS and Android. */
export const GlowDisc: React.FC<{
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
