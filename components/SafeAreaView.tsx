import React from "react";
import { Platform, View } from "react-native";
import type { ViewProps } from "react-native";
import { SafeAreaView as InsetSafeAreaView } from "react-native-safe-area-context";

/**
 * Drop-in for React Native's deprecated SafeAreaView: safe-area padding on
 * iOS, a plain View on Android, exactly as before.
 */
const SafeAreaView: React.FC<ViewProps> = (props) =>
  Platform.OS === "ios" ? (
    <InsetSafeAreaView {...props} />
  ) : (
    <View {...props} />
  );

export default SafeAreaView;
