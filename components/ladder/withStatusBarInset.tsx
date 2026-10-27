import React, { ComponentType } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const withStatusBarInset = <Props extends object>(
  Screen: ComponentType<Props>,
) => {
  const WithStatusBarInset = (props: Props) => {
    const { top } = useSafeAreaInsets();
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#00152B",
          paddingTop: Platform.OS === "android" ? top : 0,
        }}
      >
        <Screen {...props} />
      </View>
    );
  };
  WithStatusBarInset.displayName = `WithStatusBarInset(${Screen.displayName ?? Screen.name})`;
  return WithStatusBarInset;
};
