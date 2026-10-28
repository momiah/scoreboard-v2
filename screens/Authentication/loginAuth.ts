import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { AppEventsLogger } from "react-native-fbsdk-next";

import { auth } from "../../services/firebase.config";
import { registerForPushNotificationsAsync } from "../../services/pushNotifications";

type ProfileLookup = (
  userId: string,
) => Promise<Record<string, unknown> | null | undefined>;

type LoginEventNames = {
  AppEvents: { Login: string };
  AppEventParams: { RegistrationMethod: string };
};

export function logLoginEvent(method: string) {
  const { AppEvents, AppEventParams } =
    AppEventsLogger as unknown as LoginEventNames;
  AppEventsLogger.logEvent(AppEvents.Login, {
    [AppEventParams.RegistrationMethod]: method,
  });
}

export type EmailLoginResult =
  | { status: "success"; profile: Record<string, unknown> | null }
  | { status: "error"; title: string; message: string };

const LOGIN_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "Email already registered",
  "auth/weak-password": "Password is too weak",
  "auth/invalid-email": "Invalid email address",
  "auth/invalid-credential": "Invalid credentials",
  "auth/user-not-found": "User not found",
  "auth/wrong-password": "Incorrect password",
  "auth/user-disabled": "User account is disabled",
};

export async function loginWithEmail(
  email: string,
  password: string,
  getUserById: ProfileLookup,
): Promise<EmailLoginResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    if (!user.emailVerified) {
      await auth.signOut();
      return {
        status: "error",
        title: "Verify Email",
        message: "Please verify your email address before logging in.",
      };
    }

    const token = await user.getIdToken();
    const userId = user.uid;
    await AsyncStorage.setItem("userToken", token);
    await AsyncStorage.setItem("userId", userId);
    await registerForPushNotificationsAsync(userId);

    const profile = (await getUserById(userId)) ?? null;

    logLoginEvent("email");

    return { status: "success", profile };
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";
    const reason =
      error instanceof Error && error.message ? error.message : code;
    AppEventsLogger.logEvent("LoginFailed", {
      reason: code || reason,
      method: "email",
    });
    return {
      status: "error",
      title: "Error",
      message: LOGIN_ERRORS[code] || "Login failed.",
    };
  }
}

export async function sendResetLink(
  email: string,
): Promise<{ title: string; message: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      title: "Reset Link Sent",
      message: "Check your inbox for a password reset link.",
    };
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code ?? "")
        : "";
    const messages: Record<string, string> = {
      "auth/invalid-email": "Enter a valid email address.",
      "auth/user-not-found": "No user found with that email.",
    };
    return {
      title: "Error",
      message: messages[code] || "Failed to send reset email.",
    };
  }
}
