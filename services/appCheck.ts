// App Check: the native SDK (react-native-firebase) attests the device and the
// token is handed to the Firebase JS SDK, so callables such as
// checkEmailAvailable send it. Native modules only exist in dev / EAS builds,
// so everything is lazy and guarded: Expo Go and Jest just skip it.
import Constants, { ExecutionEnvironment } from "expo-constants";
import { getApp } from "firebase/app";
import { CustomProvider, initializeAppCheck } from "firebase/app-check";

// Initialises the JS Firebase app before getApp() is used.
import "./firebase.config";

// Fallback lifetime when the token's expiry can't be read (App Check tokens
// last 1 hour by default).
const FALLBACK_TTL_MS = 30 * 60 * 1000;

let started = false;

/** Reads `exp` from a JWT, in milliseconds. */
export function tokenExpiryMillis(token: string, now = Date.now()): number {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = JSON.parse(json).exp;
    if (typeof exp === "number") return exp * 1000;
  } catch {
    // fall through
  }
  return now + FALLBACK_TTL_MS;
}

export async function initAppCheck(): Promise<boolean> {
  if (started) return true;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false; // Expo Go has no native Firebase modules
  }
  started = true;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const nativeApp = require("@react-native-firebase/app");
    const nativeAppCheck = require("@react-native-firebase/app-check");
    /* eslint-enable @typescript-eslint/no-require-imports */

    const provider =
      new nativeAppCheck.ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      apple: {
        provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback",
      },
      android: { provider: __DEV__ ? "debug" : "playIntegrity" },
    });
    const appCheck = await nativeAppCheck.initializeAppCheck(
      nativeApp.getApp(),
      { provider, isTokenAutoRefreshEnabled: true },
    );

    initializeAppCheck(getApp(), {
      provider: new CustomProvider({
        getToken: async () => {
          const { token } = await nativeAppCheck.getToken(appCheck, false);
          return { token, expireTimeMillis: tokenExpiryMillis(token) };
        },
      }),
      isTokenAutoRefreshEnabled: true,
    });
    return true;
  } catch (error) {
    started = false;
    console.warn("App Check is not available:", error);
    return false;
  }
}

/** Test-only reset. */
export const __resetAppCheckForTests = () => {
  started = false;
};
