import React from "react";
import { View } from "react-native";
import { useAndroidTopInset } from "../hooks/useAndroidTopInset";

/** Pushes a screen's content below the Android status bar. Renders nothing on iOS. */
const StatusBarSpacer: React.FC = () => {
  const height = useAndroidTopInset();
  return height ? <View style={{ height }} /> : null;
};

export default StatusBarSpacer;
