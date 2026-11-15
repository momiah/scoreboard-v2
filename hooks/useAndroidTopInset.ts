import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// iOS screens already sit below the status bar; Android draws edge to edge.
export const useAndroidTopInset = (): number => {
  const { top } = useSafeAreaInsets();
  return Platform.OS === "android" ? top : 0;
};
