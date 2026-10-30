import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
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

/** Longest address email standards allow (RFC 5321). */
export const EMAIL_MAX_LENGTH = 254;
export const FULL_NAME_MAX_LENGTH = 50;
export const NAME_PART_MAX_LENGTH = 30;
export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 10;

// A name word starts with a letter, then letters, combining accents,
// hyphens, apostrophes (' or ’) and full stops. \p{L} covers every script
// (Hermes supports Unicode property escapes).
const NAME_WORD_PATTERN = /^\p{L}[\p{L}\p{M}'’.-]*$/u;

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

export type SignupFieldError = true | string;

export function validateEmail(email: string): SignupFieldError {
  if (!email) return "Email is required";
  if (email.length > EMAIL_MAX_LENGTH) {
    return `Email must be ${EMAIL_MAX_LENGTH} characters or fewer`;
  }
  if (!EMAIL_PATTERN.test(email)) return "Invalid email format";
  return true;
}

export function validatePassword(password: string): SignupFieldError {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (!/^[\w\W]*$/.test(password)) return "Invalid characters in password";
  return true;
}

/** Single-word, A-Z only. Kept as before; sign-up full names use splitFullName. */
export function validatePersonName(value: string): SignupFieldError {
  if (!value) return "This field is required";
  if (!/^[a-zA-Z]+$/.test(value)) {
    return "Only letters are allowed (no spaces, numbers, or special characters)";
  }
  return true;
}

// Both lookups run in Cloud Functions (functions/src/signupAvailability.ts),
// so the users collection never has to be readable by signed-out clients.
type Availability = { available: boolean };

async function callAvailability(
  name: "checkEmailAvailable" | "checkUsernameAvailable",
  data: Record<string, string>,
): Promise<boolean> {
  const check = httpsCallable<Record<string, string>, Availability>(
    getFunctions(),
    name,
  );
  const result = await check(data);
  if (typeof result.data?.available !== "boolean") {
    throw new Error(`Unexpected ${name} response`);
  }
  return result.data.available;
}

/** Fails closed: any error counts as taken. */
export async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    return !(await callAvailability("checkUsernameAvailable", {
      username: username.trim(),
    }));
  } catch (error) {
    console.error("Error checking username:", error);
    return true;
  }
}

export const EMAIL_CHECK_FAILED_MESSAGE =
  "Couldn't check your email. Please try again.";

// Asks Firebase Auth (via the callable) whether the email has an account, so
// it also catches accounts that never got a profile document.
// Throws (code "signup/email-check-failed") when the lookup fails, so callers
// stop instead of treating an unknown result as "not registered".
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    return !(await callAvailability("checkEmailAvailable", {
      email: normaliseEmail(email),
    }));
  } catch (error) {
    console.error("Error checking email:", error);
    throw Object.assign(new Error(EMAIL_CHECK_FAILED_MESSAGE), {
      code: "signup/email-check-failed",
      cause: error,
    });
  }
}

export async function validateUsername(
  rawValue: string,
): Promise<SignupFieldError> {
  const value = rawValue.trim();
  if (!value) return "Username is required";
  if (value.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (value.length > USERNAME_MAX_LENGTH) {
    return `Username cannot exceed ${USERNAME_MAX_LENGTH} characters`;
  }
  if (/\s/.test(value)) return "Spaces are not allowed";
  if (!/^[a-zA-Z0-9-]+$/.test(value)) {
    return "Only letters, numbers, and dashes (-) are allowed";
  }
  if (value.startsWith("-") || value.endsWith("-")) {
    return "Username can't start or end with a dash";
  }
  if (value.includes("--")) return "Username can't have two dashes in a row";
  if (await checkUsernameExists(value)) return "Username already exists";
  return true;
}

/** Trims and collapses repeated spaces. Capitalisation is left as typed. */
export const normaliseFullName = (fullName: string) =>
  fullName.trim().replace(/\s+/g, " ");

export const FULL_NAME_CHARACTERS_MESSAGE =
  "Names can only use letters, spaces, hyphens, apostrophes and full stops, and each word must start with a letter";

/**
 * Full name rules: at least two words; the first word is the first name and
 * the rest is the last name ("Mary Jane Smith" -> "Mary" / "Jane Smith").
 * Any script's letters, hyphens, apostrophes and full stops are allowed.
 */
export function splitFullName(
  fullName: string,
): { firstName: string; lastName: string } | { error: string } {
  const normalised = normaliseFullName(fullName);
  if (!normalised) return { error: "Full name is required" };
  if (normalised.length > FULL_NAME_MAX_LENGTH) {
    return {
      error: `Full name must be ${FULL_NAME_MAX_LENGTH} characters or fewer`,
    };
  }
  const parts = normalised.split(" ");
  if (parts.length < 2) {
    return { error: "Enter your first and last name" };
  }
  if (!parts.every((part) => NAME_WORD_PATTERN.test(part))) {
    return { error: FULL_NAME_CHARACTERS_MESSAGE };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  if (firstName.length > NAME_PART_MAX_LENGTH) {
    return {
      error: `First name must be ${NAME_PART_MAX_LENGTH} characters or fewer`,
    };
  }
  if (lastName.length > NAME_PART_MAX_LENGTH) {
    return {
      error: `Last name must be ${NAME_PART_MAX_LENGTH} characters or fewer`,
    };
  }
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
    "signup/email-check-failed": EMAIL_CHECK_FAILED_MESSAGE,
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
  /** True when the social sign-in created this Firebase user just now. */
  socialIsNewUser?: boolean;
  setCurrentUser?: (user: UserProfile) => void;
}

/**
 * The social sign-in already signed the user in and saved their session, so a
 * failed profile save would leave them signed in with no profile. Delete the
 * Firebase user only if this sign-up created it, then sign out everywhere.
 */
async function rollBackSocialSignup(
  uid: string,
  provider: string | undefined,
  isNewUser: boolean,
) {
  const user = auth.currentUser;
  if (isNewUser && user && user.uid === uid) {
    await user.delete().catch((error: unknown) => {
      console.error("Could not delete the new social user:", error);
    });
  }
  await auth.signOut().catch(() => undefined);
  if (provider === "google") {
    await GoogleSignin.signOut().catch(() => undefined);
  }
  await AsyncStorage.multiRemove(["userToken", "userId"]).catch(
    () => undefined,
  );
}

const usernameTakenError = () =>
  Object.assign(new Error("Username already exists"), {
    code: "signup/username-taken",
  });

export interface CreateAccountResult {
  profile: UserProfile;
  isSocialSignup: boolean;
}

/** Creates the Firebase user (unless a social sign-in already did) and the profile document. */
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
    socialIsNewUser = false,
    setCurrentUser,
  } = input;

  const isSocialSignup = !!socialId;
  const cleanEmail = normaliseEmail(email || "");
  let uid = socialId;
  let createdUser: User | null = null;

  // Re-check right before writing: the username could have been taken since the
  // live check on the form, and doing it first avoids orphaning a new auth user.
  if (await checkUsernameExists(username)) {
    throw usernameTakenError();
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
    // Check again now the account exists: another sign-up may have taken the
    // username while this one was creating the user or uploading the photo.
    if (await checkUsernameExists(username)) {
      throw usernameTakenError();
    }
    await setDoc(doc(db, "users", uid), profileToSave);
  } catch (error) {
    // Without a profile document the account is unusable and the email would
    // be blocked from retrying, so remove the half-created auth user.
    if (createdUser) {
      await createdUser.delete().catch(() => undefined);
    }
    if (isSocialSignup) {
      await rollBackSocialSignup(uid, socialProvider, socialIsNewUser);
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
