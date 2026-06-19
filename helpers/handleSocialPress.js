import { Linking, Platform } from "react-native";

import { iosAppLinks, androidIntentLinks, fallbackUrls } from "@shared";

export const handleSocialPress = async (platform) => {
  const fallbackUrl = fallbackUrls[platform];

  try {
    if (Platform.OS === "android") {
      await Linking.openURL(androidIntentLinks[platform]);
      return;
    }

    const appUrl = iosAppLinks[platform];
    if (appUrl && (await Linking.canOpenURL(appUrl))) {
      await Linking.openURL(appUrl);
      return;
    }
    await Linking.openURL(fallbackUrl);
  } catch (err) {
    console.warn("Error opening social link:", err);
    if (fallbackUrl) await Linking.openURL(fallbackUrl);
  }
};
