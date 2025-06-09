// admobUnitId.js
import { Platform } from "react-native";
// import { TestIds } from "react-native-google-mobile-ads";
import { ADMOB_BANNER_IOS_PROD, ADMOB_BANNER_ANDROID_PROD } from "@env";

export const getUnitId = () => {
  if (__DEV__) return TestIds.BANNER;
  const id = Platform.select({
    ios: ADMOB_BANNER_IOS_PROD,
    android: ADMOB_BANNER_ANDROID_PROD,
  });
  return id ?? TestIds.BANNER; // fallback to test banner if something’s off
};
