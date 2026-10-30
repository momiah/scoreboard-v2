import Constants from "expo-constants";
import { CustomProvider, initializeAppCheck } from "firebase/app-check";

import {
  __resetAppCheckForTests,
  initAppCheck,
  tokenExpiryMillis,
} from "../../services/appCheck";

/* eslint-disable @typescript-eslint/no-require-imports */
const nativeAppCheck = require("@react-native-firebase/app-check");
const nativeApp = require("@react-native-firebase/app");
/* eslint-enable @typescript-eslint/no-require-imports */

const m = (fn: unknown) => fn as jest.Mock;
const constants = Constants as unknown as { executionEnvironment: string };

const jwt = (payload: object) =>
  `h.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.s`;

beforeEach(() => {
  jest.clearAllMocks();
  __resetAppCheckForTests();
  constants.executionEnvironment = "standalone";
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

it("skips everything in Expo Go", async () => {
  constants.executionEnvironment = "storeClient";
  await expect(initAppCheck()).resolves.toBe(false);
  expect(nativeAppCheck.initializeAppCheck).not.toHaveBeenCalled();
  expect(initializeAppCheck).not.toHaveBeenCalled();
});

it("starts native App Check with the debug provider in __DEV__ and bridges the token", async () => {
  await expect(initAppCheck()).resolves.toBe(true);

  const provider = m(nativeAppCheck.ReactNativeFirebaseAppCheckProvider).mock
    .results[0].value;
  // Jest runs with __DEV__ true, so both platforms use the debug provider.
  expect(provider.configure).toHaveBeenCalledWith({
    apple: { provider: "debug" },
    android: { provider: "debug" },
  });
  expect(nativeAppCheck.initializeAppCheck).toHaveBeenCalledWith(
    nativeApp.getApp(),
    { provider, isTokenAutoRefreshEnabled: true },
  );
  expect(initializeAppCheck).toHaveBeenCalledWith(
    { name: "[DEFAULT]" },
    expect.objectContaining({ isTokenAutoRefreshEnabled: true }),
  );

  const token = jwt({ exp: 2_000_000_000 });
  nativeAppCheck.getToken.mockResolvedValueOnce({ token });
  const { getToken } = m(CustomProvider).mock.calls[0][0];
  await expect(getToken()).resolves.toEqual({
    token,
    expireTimeMillis: 2_000_000_000_000,
  });
});

it("uses App Attest / Play Integrity outside __DEV__", async () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  g.__DEV__ = false;
  try {
    await initAppCheck();
  } finally {
    g.__DEV__ = true;
  }
  const provider = m(nativeAppCheck.ReactNativeFirebaseAppCheckProvider).mock
    .results[0].value;
  expect(provider.configure).toHaveBeenCalledWith({
    apple: { provider: "appAttestWithDeviceCheckFallback" },
    android: { provider: "playIntegrity" },
  });
});

it("only starts once", async () => {
  await initAppCheck();
  await initAppCheck();
  expect(nativeAppCheck.initializeAppCheck).toHaveBeenCalledTimes(1);
});

it("doesn't crash when the native module fails, and can retry", async () => {
  nativeAppCheck.initializeAppCheck.mockRejectedValueOnce(
    new Error("native module missing"),
  );
  await expect(initAppCheck()).resolves.toBe(false);
  expect(console.warn).toHaveBeenCalled();
  expect(initializeAppCheck).not.toHaveBeenCalled();
  await expect(initAppCheck()).resolves.toBe(true);
});

describe("tokenExpiryMillis", () => {
  it("reads exp from the token", () => {
    expect(tokenExpiryMillis(jwt({ exp: 100 }))).toBe(100_000);
  });

  it("falls back to 30 minutes for an unreadable token", () => {
    expect(tokenExpiryMillis("not-a-jwt", 1000)).toBe(1000 + 30 * 60 * 1000);
    expect(tokenExpiryMillis(jwt({}), 0)).toBe(30 * 60 * 1000);
  });
});
