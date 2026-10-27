import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import HowToPlayBackdrop from "../ladder/HowToPlayBackdrop";

export const SCREEN_BG = "rgb(3, 16, 31)";
export const BLUE = "#00A2FF";
export const GOLD = "#FFC800";
export const MUTED = "#aaa";
export const BODY = "#c9d6e3";
export const SHEET = "#071422";

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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
});

export default SignupChrome;
