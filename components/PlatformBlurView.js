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
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={intensity} tint={tint} style={style} {...props}>
        {children}
      </BlurView>
    );
  }

  // Android fallback
  const androidBlurStyle = {
    backgroundColor:
      tint === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.9)",
  };

  return (
    <View style={[style, androidBlurStyle]} {...props}>
      {children}
    </View>
  );
};
