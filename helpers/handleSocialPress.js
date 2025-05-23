import { Linking, Platform } from "react-native";

import {
  iosAppLinks,
  androidIntentLinks,
  fallbackUrls,
} from "../schemas/schema";

export const handleSocialPress = async (platform) => {
  const appUrl =
    Platform.OS === "ios"
      ? iosAppLinks[platform]
      : androidIntentLinks[platform];
  const fallbackUrl = fallbackUrls[platform];

  try {
    const supported = await Linking.canOpenURL(appUrl);
    if (supported) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(fallbackUrl);
    }
  } catch (err) {
    console.warn("Error opening social link:", err);
    Linking.openURL(fallbackUrl);
  }
};
