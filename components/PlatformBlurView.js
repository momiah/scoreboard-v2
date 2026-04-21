// components/PlatformBlurView.js
import React from "react";
import { Platform, View } from "react-native";
import { BlurView } from "expo-blur";

export const PlatformBlurView = ({
  children,
  intensity = 80,
  tint = "dark",
  style,
  ...props
}) => {
  return (
    <BlurView intensity={intensity} tint={tint} style={style} {...props}>
      {children}
    </BlurView>
  );
};
