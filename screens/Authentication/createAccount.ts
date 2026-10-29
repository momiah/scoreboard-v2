import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { AppEventsLogger } from "react-native-fbsdk-next";
import {
  ccImageEndpoint,
  notificationSchema,
  notificationTypes,
  profileDetailSchema,
  socialMediaPlatforms,
  userProfileSchema,
} from "@shared";
import type { UserProfile } from "@shared/types";

import { auth, db } from "../../services/firebase.config";
import { registerForPushNotificationsAsync } from "../../services/pushNotifications";
import { uploadProfileImage } from "../../utils/ProfileImageUploadToFirebase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export type SignupFieldError = true | string;

export function validateEmail(email: string): SignupFieldError {
  if (!email) return "Email is required";
  if (!EMAIL_PATTERN.test(email)) return "Invalid email format";
  return true;
}

export function validatePassword(password: string): SignupFieldError {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (!/^[\w\W]*$/.test(password)) return "Invalid characters in password";
  return true;
}

export function validatePersonName(value: string): SignupFieldError {
  if (!value) return "This field is required";
  if (!/^[a-zA-Z]+$/.test(value)) {
    return "Only letters are allowed (no spaces, numbers, or special characters)";
  }
  return true;
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    const usersRef = collection(db, "users");
    const usernameQuery = query(
      usersRef,
      where("usernameLower", "==", username.toLowerCase()),
    );
    const querySnapshot = await getDocs(usernameQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking username:", error);
    return true;
  }
}

export async function validateUsername(
  value: string,
): Promise<SignupFieldError> {
  if (!value) return "Username is required";
  if (value.length < 4) return "Username must be at least 4 characters";
  if (value.length > 10) return "Username cannot exceed 10 characters";
  if (/\s/.test(value)) return "Spaces are not allowed";
  if (!/^[a-zA-Z0-9-]+$/.test(value)) {
    return "Only letters, numbers, and dashes (-) are allowed";
  }
  if (await checkUsernameExists(value)) return "Username already exists";
  return true;
}

export function splitFullName(
  fullName: string,
): { firstName: string; lastName: string } | { error: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { error: "Full name is required" };
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return { error: "Enter your first and last name" };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  const firstError = validatePersonName(firstName);
  const lastError = validatePersonName(lastName);
  if (firstError !== true) return { error: firstError };
  if (lastError !== true) return { error: lastError };
  return { firstName, lastName };
}

export function signupErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "Email already registered",
    "auth/weak-password": "Password is too weak",
    "auth/invalid-email": "Invalid email address",
    "auth/network-request-failed":
      "Network error. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/operation-not-allowed": "Email sign-up is not available right now.",
    "signup/username-taken": "Username already exists",
  };
  if (messages[code]) return messages[code];
  if (error instanceof Error && error.message) return error.message;
  return "Could not create your account";
}

export interface CreateAccountInput {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  username: string;
  country: string;
  city: string;
  countryCode?: string | null;
  handPreference?: string;
  /** Local image uri chosen during sign-up. Uploaded after the user exists. */
  photoUri?: string | null;
  socialId?: string;
  socialProvider?: string;
  setCurrentUser?: (user: UserProfile) => void;
}

export interface CreateAccountResult {
  profile: UserProfile;
  isSocialSignup: boolean;
}

/**
 * Creates the Firebase user (unless this is a social sign-up that already
 * did) and writes the same profile document the original Signup screen writes.
 */
export async function createCourtChampsAccount(
  input: CreateAccountInput,
): Promise<CreateAccountResult> {
  const {
    email,
    password,
    firstName,
    lastName,
    username,
    country,
    city,
    countryCode,
    handPreference = "",
    photoUri,
    socialId,
    socialProvider,
    setCurrentUser,
  } = input;

  const isSocialSignup = !!socialId;
  const cleanEmail = normaliseEmail(email || "");
  let uid = socialId;
  let createdUser: User | null = null;

  // Re-check right before writing: the username could have been taken since the
  // live check on the form, and doing it first avoids orphaning a new auth user.
  if (await checkUsernameExists(username)) {
    throw Object.assign(new Error("Username already exists"), {
      code: "signup/username-taken",
    });
  }

  if (!isSocialSignup) {
    if (!password) throw new Error("Password is required");
    const { user } = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      password,
    );
    createdUser = user;
    uid = user.uid;
    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.error("Could not send the verification email:", error);
    }
  }

  if (!uid) throw new Error("Missing user id");

  let profileImage = ccImageEndpoint;
  if (photoUri) {
    try {
      profileImage = await uploadProfileImage(photoUri, uid);
    } catch (error) {
      console.error("Profile photo upload failed, using the default:", error);
      profileImage = ccImageEndpoint;
    }
  }

  const profileToSave: UserProfile = {
    ...userProfileSchema,
    firstName,
    lastName,
    username,
    email: cleanEmail,
    handPreference,
    usernameLower: username.toLowerCase(),
    location: {
      ...userProfileSchema.location,
      country,
      city,
      countryCode: countryCode || "",
    },
    userId: uid,
    profileDetail: profileDetailSchema,
    profileImage,
    provider: isSocialSignup ? socialProvider || "" : "email_password",
  };

  try {
    await setDoc(doc(db, "users", uid), profileToSave);
  } catch (error) {
    // Without a profile document the account is unusable and the email would
    // be blocked from retrying, so remove the half-created auth user.
    if (createdUser) {
      await createdUser.delete().catch(() => undefined);
    }
    throw error;
  }

  const welcomeNotification = {
    ...notificationSchema,
    createdAt: new Date(),
    message: notificationTypes.WELCOME.MESSAGE,
    type: notificationTypes.WELCOME.TYPE,
    recipientId: profileToSave.userId,
    data: {
      image: ccImageEndpoint,
      header: notificationTypes.WELCOME.MESSAGE,
      body:
        "You've just joined the ultimate community for competitive players. " +
        "Track your games, climb the ranks, and prove you're the best on the court. " +
        "Join or create leagues now and start your journey to the top. " +
        "Keep an eye out for exciting updates and features coming your way soon! 🏸🔥",
      footer: "Follow us on",
      buttons: socialMediaPlatforms,
    },
  };

  try {
    await addDoc(
      collection(db, "users", uid, "notifications"),
      welcomeNotification,
    );
  } catch (error) {
    console.error("Could not add the welcome notification:", error);
  }

  AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedRegistration, {
    [AppEventsLogger.AppEventParams.RegistrationMethod]: isSocialSignup
      ? socialProvider || "social"
      : "email",
  });

  if (isSocialSignup && setCurrentUser) {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userId", uid);
      await registerForPushNotificationsAsync(uid);
      setCurrentUser(profileToSave);
    }
  }

  return { profile: profileToSave, isSocialSignup };
}
