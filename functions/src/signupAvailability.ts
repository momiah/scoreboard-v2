import * as functions from "firebase-functions";
import { defineBoolean } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { createHash } from "crypto";
import {
  clientIp,
  isOverLimit,
  nextRateWindow,
  parseEmail,
  parseUsername,
  RateWindow,
} from "./helpers/signupAvailabilityCore";

// Set to false (in functions/.env) only while the app has no App Check
// provider yet; true rejects calls without a valid App Check token.
const ENFORCE_APP_CHECK = defineBoolean("SIGNUP_ENFORCE_APP_CHECK", {
  default: true,
});

const RATE_LIMIT_COLLECTION = "signupRateLimits";

function requireAppCheck(request: functions.https.CallableRequest<unknown>) {
  if (ENFORCE_APP_CHECK.value() && !request.app) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "This request could not be verified.",
    );
  }
}

/** Per-IP counter doc (IP stored hashed) in a fixed window, via Admin. */
async function enforceRateLimit(
  request: functions.https.CallableRequest<unknown>,
) {
  const raw = request.rawRequest;
  const ip = clientIp(raw?.headers?.["x-forwarded-for"], raw?.ip);
  const key = createHash("sha256").update(ip).digest("hex");
  const db = admin.firestore();
  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(key);

  const limited = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data() as RateWindow) : null;
    const next = nextRateWindow(current, Date.now());
    tx.set(ref, next);
    return isOverLimit(next);
  });

  if (limited) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Too many attempts. Please try again later.",
    );
  }
}

export const checkEmailAvailable = functions.https.onCall(
  async (request: functions.https.CallableRequest<unknown>) => {
    requireAppCheck(request);
    const email = parseEmail(request.data);
    if (!email) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid email is required.",
      );
    }
    await enforceRateLimit(request);

    try {
      await admin.auth().getUserByEmail(email);
      return { available: false };
    } catch (error) {
      if ((error as { code?: string }).code === "auth/user-not-found") {
        return { available: true };
      }
      console.error("checkEmailAvailable failed:", error);
      throw new functions.https.HttpsError("internal", "Check failed.");
    }
  },
);

export const checkUsernameAvailable = functions.https.onCall(
  async (request: functions.https.CallableRequest<unknown>) => {
    requireAppCheck(request);
    const usernameLower = parseUsername(request.data);
    if (!usernameLower) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "A valid username is required.",
      );
    }
    await enforceRateLimit(request);

    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("usernameLower", "==", usernameLower)
      .limit(1)
      .get();
    return { available: snapshot.empty };
  },
);
