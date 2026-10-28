import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  fetchSignInMethodsForEmail,
  signInWithCredential,
} from "firebase/auth";
import { sha256 } from "js-sha256";
import { Platform } from "react-native";
import {
  AccessToken,
  AuthenticationToken,
  LoginManager,
} from "react-native-fbsdk-next";
// @ts-expect-error GOOGLE_WEB_CLIENT_ID is defined in the .env file
import { GOOGLE_WEB_CLIENT_ID } from "@env";

import { auth } from "../../services/firebase.config";
import { registerForPushNotificationsAsync } from "../../services/pushNotifications";

export type SocialProvider = "google" | "apple" | "facebook";

export interface SocialSignupParams {
  userName: string;
  userLastName: string;
  userEmail: string;
  userId: string;
  provider: SocialProvider;
}

export type SocialSignInResult =
  | { status: "cancelled" }
  | {
      status: "existing";
      method: SocialProvider;
      profile: Record<string, unknown>;
    }
  | {
      status: "needs-signup";
      method: SocialProvider;
      params: SocialSignupParams;
    }
  | {
      status: "error";
      title: string;
      message: string;
      logLabel: string;
      logMessage: string;
    };

type ProfileLookup = (
  userId: string,
) => Promise<Record<string, unknown> | null | undefined>;

type AuthError = { code?: string; message?: string };

const asAuthError = (error: unknown): AuthError => {
  if (typeof error === "object" && error) return error as AuthError;
  return { message: String(error) };
};

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
}

async function rememberSession(userId: string, token: string) {
  await AsyncStorage.setItem("userToken", token);
  await AsyncStorage.setItem("userId", userId);
  await registerForPushNotificationsAsync(userId);
}

export async function signInWithGoogle(
  getUserById: ProfileLookup,
): Promise<SocialSignInResult> {
  try {
    configureGoogleSignIn();
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signOut();

    const response = await GoogleSignin.signIn();
    if (response.type !== "success") {
      return { status: "cancelled" };
    }

    const googleCredential = GoogleAuthProvider.credential(
      response.data.idToken,
    );
    const email = response.data.user.email;
    const existingMethods = await fetchSignInMethodsForEmail(auth, email);
    if (existingMethods.length > 0 && !existingMethods.includes("google.com")) {
      return {
        status: "error",
        title: "Account Already Exists",
        message:
          "An account with this email already exists. Please log in with your original method and connect Google from your profile.",
        logLabel: "Google Login Error:",
        logMessage: "account-exists-with-different-credential",
      };
    }

    const userCredential = await signInWithCredential(auth, googleCredential);
    const user = userCredential.user;
    const token = await user.getIdToken();
    const userId = user.uid;
    await rememberSession(userId, token);

    const profile = await getUserById(userId);
    if (profile) {
      return { status: "existing", method: "google", profile };
    }

    const userData = response.data.user;
    return {
      status: "needs-signup",
      method: "google",
      params: {
        userName: userData.givenName || "",
        userLastName: userData.familyName || "",
        userEmail: userData.email || "",
        userId,
        provider: "google",
      },
    };
  } catch (error) {
    const authError = asAuthError(error);
    if (authError.code === "auth/account-exists-with-different-credential") {
      return {
        status: "error",
        title: "Account Already Exists",
        message:
          "An account with this email already exists. Please log in with your original method.",
        logLabel: "Google Login Error:",
        logMessage: authError.message || "",
      };
    }
    return {
      status: "error",
      title: "Error",
      message: "Google sign-in failed. Please try again.",
      logLabel: "Google Login Error:",
      logMessage: authError.message || "",
    };
  }
}

export async function signInWithApple(
  getUserById: ProfileLookup,
): Promise<SocialSignInResult> {
  if (Platform.OS !== "ios") {
    return {
      status: "error",
      title: "Apple sign-in",
      message: "Apple sign-in is available on iOS.",
      logLabel: "Apple Login Error:",
      logMessage: "unavailable-platform",
    };
  }

  try {
    const rawNonce = Math.random().toString(36).substring(2);
    const hashedNonce = sha256(rawNonce);

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const {
      identityToken,
      fullName,
      email: appleEmail,
      user: appleUserId,
    } = appleCredential;
    if (!identityToken) throw new Error("No identity token");

    const storageKey = `appleUser:${appleUserId}`;
    let cachedName = { givenName: "", familyName: "" };
    let cachedEmail = "";

    if (fullName?.givenName || appleEmail) {
      cachedName = {
        givenName: fullName?.givenName || "",
        familyName: fullName?.familyName || "",
      };
      cachedEmail = appleEmail || "";
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ name: cachedName, email: cachedEmail }),
      );
    } else {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          name: { givenName: string; familyName: string };
          email: string;
        };
        cachedName = parsed.name;
        cachedEmail = parsed.email;
      }
    }

    const provider = new OAuthProvider("apple.com");
    const firebaseCredential = provider.credential({
      idToken: identityToken,
      rawNonce,
    });

    const userCredential = await signInWithCredential(auth, firebaseCredential);
    const user = userCredential.user;
    const token = await user.getIdToken();
    const userId = user.uid;
    await rememberSession(userId, token);

    const profile = await getUserById(userId);
    if (profile) {
      return { status: "existing", method: "apple", profile };
    }

    return {
      status: "needs-signup",
      method: "apple",
      params: {
        userName: cachedName.givenName,
        userLastName: cachedName.familyName,
        userEmail: cachedEmail || user.email || "",
        userId,
        provider: "apple",
      },
    };
  } catch (error) {
    const authError = asAuthError(error);
    if (authError.code === "ERR_REQUEST_CANCELED") {
      return { status: "cancelled" };
    }
    if (authError.code === "auth/account-exists-with-different-credential") {
      return {
        status: "error",
        title: "Account Already Exists",
        message:
          "An account with this email already exists. Please log in with your original method.",
        logLabel: "Apple Login Error:",
        logMessage: authError.message || "",
      };
    }
    return {
      status: "error",
      title: "Error",
      message: "Apple sign-in failed. Please try again.",
      logLabel: "Apple Login Error:",
      logMessage: authError.message || "",
    };
  }
}

export async function signInWithFacebook(
  getUserById: ProfileLookup,
): Promise<SocialSignInResult> {
  try {
    let credential;
    if (Platform.OS === "ios") {
      const rawNonce = Math.random().toString(36).substring(2);
      const hashedNonce = sha256(rawNonce);
      const result = await LoginManager.logInWithPermissions(
        ["public_profile", "email"],
        "limited",
        hashedNonce,
      );
      if (result.isCancelled) {
        return {
          status: "error",
          title: "Error",
          message: "Facebook sign-in cancelled. Please try again.",
          logLabel: "Facebook Login Error:",
          logMessage: "cancelled",
        };
      }
      const data = await AuthenticationToken.getAuthenticationTokenIOS();
      if (!data) throw new Error("No access token");
      const provider = new OAuthProvider("facebook.com");
      credential = provider.credential({
        idToken: data.authenticationToken,
        rawNonce,
      });
    } else {
      const result = await LoginManager.logInWithPermissions([
        "public_profile",
        "email",
      ]);
      if (result.isCancelled) {
        return {
          status: "error",
          title: "Error",
          message: "Facebook sign-in cancelled. Please try again.",
          logLabel: "Facebook Login Error:",
          logMessage: "cancelled",
        };
      }
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) throw new Error("No access token");
      credential = FacebookAuthProvider.credential(data.accessToken);
    }

    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    const token = await user.getIdToken();
    const userId = user.uid;
    await rememberSession(userId, token);

    const profile = await getUserById(userId);
    if (profile) {
      return { status: "existing", method: "facebook", profile };
    }

    const [firstName, ...rest] = (user.displayName || "").split(" ");
    return {
      status: "needs-signup",
      method: "facebook",
      params: {
        userName: firstName || "",
        userLastName: rest.join(" "),
        userEmail: user.email || "",
        userId,
        provider: "facebook",
      },
    };
  } catch (error) {
    const authError = asAuthError(error);
    if (authError.code === "auth/account-exists-with-different-credential") {
      return {
        status: "error",
        title: "Account Already Exists",
        message:
          "An account with this email already exists. Please log in with your original method and link Facebook from your profile.",
        logLabel: "Facebook Login Error:",
        logMessage: authError.message || "",
      };
    }
    return {
      status: "error",
      title: "Error",
      message: "Facebook sign-in failed. Please try again.",
      logLabel: "Facebook Login Error:",
      logMessage: authError.message || "",
    };
  }
}
