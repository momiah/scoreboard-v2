// utils/simpleDeviceCheck.js
import * as Device from "expo-device";
import { Platform } from "react-native";

// Simple function to determine if device can handle high quality images
export const canHandleHighQualityImages = () => {
  try {
    // iOS devices generally handle images better
    if (Platform.OS === "ios") {
      // Exclude very old iOS devices
      const modelName = Device.modelName?.toLowerCase() || "";

      // Old devices that should use low quality
      const oldDevices = [
        "iphone 6",
        "iphone 6s",
        "iphone se",
        "iphone 7",
        "ipad mini",
      ];
      const isOldDevice = oldDevices.some((device) =>
        modelName.includes(device)
      );

      if (isOldDevice) {
        console.log("📱 Old iOS device detected, using low quality images");
        return false;
      }

      console.log("📱 Modern iOS device detected, using high quality images");
      return true;
    }

    // Android - check device year and model
    if (Platform.OS === "android") {
      const deviceYear = Device.deviceYearClass;
      const modelName = Device.modelName?.toLowerCase() || "";

      // If device year is available and recent
      if (deviceYear && deviceYear >= 2020) {
        console.log(
          `📱 Recent Android device (${deviceYear}), using high quality images`
        );
        return true;
      }

      // Check for known high-end Android brands/models
      const highEndBrands = [
        "pixel",
        "galaxy s",
        "galaxy note",
        "oneplus",
        "xiaomi mi",
      ];
      const isHighEnd = highEndBrands.some((brand) =>
        modelName.includes(brand)
      );

      if (isHighEnd) {
        console.log(
          "📱 High-end Android device detected, using high quality images"
        );
        return true;
      }

      console.log(
        "📱 Budget/older Android device detected, using low quality images"
      );
      return false;
    }

    // Default to low quality for unknown platforms
    console.log("📱 Unknown platform, using low quality images");
    return false;
  } catch (error) {
    console.warn(
      "Device check failed, defaulting to low quality images:",
      error
    );
    return false;
  }
};

// Get device info for debugging
export const getDeviceInfo = () => {
  return {
    brand: Device.brand,
    modelName: Device.modelName,
    deviceYearClass: Device.deviceYearClass,
    platform: Platform.OS,
    osVersion: Device.osVersion,
  };
};
