import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
  signInWithCredential,
} from "firebase/auth";
import { Platform } from "react-native";

import {
  signInWithApple,
  signInWithGoogle,
} from "../../screens/Authentication/socialAuth";
import { registerForPushNotificationsAsync } from "../../services/pushNotifications";

const m = (fn: unknown) => fn as jest.Mock;

const firebaseUser = {
  uid: "uid-9",
  email: "relay@privaterelay.appleid.com",
  getIdToken: jest.fn(() => Promise.resolve("tok")),
};

const googleSuccess = {
  type: "success",
  data: {
    idToken: "id-token",
    user: { email: "mo@gmail.com", givenName: "Mo", familyName: "Mia" },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  m(signInWithCredential).mockResolvedValue({ user: firebaseUser });
  m(fetchSignInMethodsForEmail).mockResolvedValue([]);
});

describe("signInWithGoogle", () => {
  it("returns cancelled when the picker is dismissed", async () => {
    m(GoogleSignin.signIn).mockResolvedValueOnce({ type: "cancelled" });
    await expect(signInWithGoogle(jest.fn())).resolves.toEqual({
      status: "cancelled",
    });
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it("blocks an email that already uses another sign-in method", async () => {
    m(GoogleSignin.signIn).mockResolvedValueOnce(googleSuccess);
    m(fetchSignInMethodsForEmail).mockResolvedValueOnce(["password"]);
    const result = await signInWithGoogle(jest.fn());
    expect(result).toMatchObject({
      status: "error",
      title: "Account Already Exists",
    });
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it("returns the existing profile and stores the session", async () => {
    m(GoogleSignin.signIn).mockResolvedValueOnce(googleSuccess);
    const profile = { userId: "uid-9" };
    const result = await signInWithGoogle(jest.fn(() => Promise.resolve(profile)));
    expect(result).toEqual({ status: "existing", method: "google", profile });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("userToken", "tok");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("userId", "uid-9");
    expect(registerForPushNotificationsAsync).toHaveBeenCalledWith("uid-9");
  });

  it("asks for sign-up when there is no profile", async () => {
    m(GoogleSignin.signIn).mockResolvedValueOnce(googleSuccess);
    const result = await signInWithGoogle(jest.fn(() => Promise.resolve(null)));
    expect(result).toEqual({
      status: "needs-signup",
      method: "google",
      params: {
        userName: "Mo",
        userLastName: "Mia",
        userEmail: "mo@gmail.com",
        userId: "uid-9",
        provider: "google",
        isNewUser: false,
      },
    });
  });

  it("flags a Firebase user created by this sign-in as new", async () => {
    m(GoogleSignin.signIn).mockResolvedValueOnce(googleSuccess);
    m(getAdditionalUserInfo).mockReturnValueOnce({ isNewUser: true });
    await expect(
      signInWithGoogle(jest.fn(() => Promise.resolve(null))),
    ).resolves.toMatchObject({
      status: "needs-signup",
      params: { isNewUser: true },
    });
  });

  it("maps account-exists-with-different-credential and generic errors", async () => {
    m(GoogleSignin.signIn).mockRejectedValueOnce({
      code: "auth/account-exists-with-different-credential",
    });
    await expect(signInWithGoogle(jest.fn())).resolves.toMatchObject({
      status: "error",
      title: "Account Already Exists",
    });
    m(GoogleSignin.signIn).mockRejectedValueOnce(new Error("boom"));
    await expect(signInWithGoogle(jest.fn())).resolves.toMatchObject({
      status: "error",
      message: "Google sign-in failed. Please try again.",
    });
  });
});

describe("signInWithApple", () => {
  const originalOS = Platform.OS;
  beforeEach(() => {
    Platform.OS = "ios";
  });
  afterAll(() => {
    Platform.OS = originalOS;
  });

  it("is unavailable off iOS", async () => {
    Platform.OS = "android";
    await expect(signInWithApple(jest.fn())).resolves.toMatchObject({
      status: "error",
      message: "Apple sign-in is available on iOS.",
    });
    expect(AppleAuthentication.signInAsync).not.toHaveBeenCalled();
  });

  it("returns cancelled when the user cancels", async () => {
    m(AppleAuthentication.signInAsync).mockRejectedValueOnce({
      code: "ERR_REQUEST_CANCELED",
    });
    await expect(signInWithApple(jest.fn())).resolves.toEqual({
      status: "cancelled",
    });
  });

  it("caches the name on first sign-in and asks for sign-up", async () => {
    m(AppleAuthentication.signInAsync).mockResolvedValueOnce({
      identityToken: "apple-token",
      fullName: { givenName: "Mo", familyName: "Mia" },
      email: "mo@icloud.com",
      user: "apple-1",
    });
    const result = await signInWithApple(jest.fn(() => Promise.resolve(null)));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "appleUser:apple-1",
      JSON.stringify({
        name: { givenName: "Mo", familyName: "Mia" },
        email: "mo@icloud.com",
      }),
    );
    expect(result).toEqual({
      status: "needs-signup",
      method: "apple",
      params: {
        userName: "Mo",
        userLastName: "Mia",
        userEmail: "mo@icloud.com",
        userId: "uid-9",
        provider: "apple",
        isNewUser: false,
      },
    });
  });

  it("reads the cached name on later sign-ins", async () => {
    await AsyncStorage.setItem(
      "appleUser:apple-2",
      JSON.stringify({
        name: { givenName: "Ali", familyName: "Khan" },
        email: "ali@icloud.com",
      }),
    );
    m(AppleAuthentication.signInAsync).mockResolvedValueOnce({
      identityToken: "apple-token",
      fullName: null,
      email: null,
      user: "apple-2",
    });
    const result = await signInWithApple(jest.fn(() => Promise.resolve(null)));
    expect(result).toMatchObject({
      status: "needs-signup",
      params: { userName: "Ali", userEmail: "ali@icloud.com" },
    });
  });

  it("flags a new Apple user", async () => {
    m(AppleAuthentication.signInAsync).mockResolvedValueOnce({
      identityToken: "apple-token",
      fullName: null,
      email: null,
      user: "apple-5",
    });
    m(getAdditionalUserInfo).mockReturnValueOnce({ isNewUser: true });
    await expect(
      signInWithApple(jest.fn(() => Promise.resolve(null))),
    ).resolves.toMatchObject({ params: { isNewUser: true } });
  });

  it("returns existing when a profile is found", async () => {
    m(AppleAuthentication.signInAsync).mockResolvedValueOnce({
      identityToken: "apple-token",
      fullName: null,
      email: null,
      user: "apple-3",
    });
    const profile = { userId: "uid-9" };
    await expect(
      signInWithApple(jest.fn(() => Promise.resolve(profile))),
    ).resolves.toEqual({ status: "existing", method: "apple", profile });
  });

  it("errors when Apple returns no identity token", async () => {
    m(AppleAuthentication.signInAsync).mockResolvedValueOnce({
      identityToken: null,
      user: "apple-4",
    });
    await expect(signInWithApple(jest.fn())).resolves.toMatchObject({
      status: "error",
      message: "Apple sign-in failed. Please try again.",
    });
    expect(signInWithCredential).not.toHaveBeenCalled();
  });
});
