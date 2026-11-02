// React Native's own SafeAreaView. react-native-safe-area-context's version
// measures insets differently and left the home-indicator area unpainted
// under the tab bar, so this stays until the screens move to that library's
// insets together.
import { SafeAreaView } from "react-native";

export default SafeAreaView;
