import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";
import type { LadderMatch } from "courtchamps-shared/types";
import {
  checkLadderArrivalReading,
  getLadderOpponentIds,
  hasArrivedForLadderMatch,
} from "courtchamps-shared/helpers";
import type {
  LadderArrivalReading,
  LadderArrivalResult,
} from "courtchamps-shared/helpers";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toReading = (value: unknown): LadderArrivalReading | null => {
  const reading = value as Partial<LadderArrivalReading> | null;
  if (!reading || !isNumber(reading.latitude) || !isNumber(reading.longitude)) {
    return null;
  }
  return {
    latitude: reading.latitude,
    longitude: reading.longitude,
    accuracy: isNumber(reading.accuracy) ? reading.accuracy : null,
    timestamp: isNumber(reading.timestamp) ? reading.timestamp : Number.NaN,
    mocked: reading.mocked === true,
  };
};

export const recordArrival = async ({
  db,
  userId,
  ladderId,
  matchId,
  reading,
  nowMs,
}: {
  db: admin.firestore.Firestore;
  userId: string;
  ladderId: string;
  matchId: string;
  reading: LadderArrivalReading;
  nowMs: number;
}): Promise<LadderArrivalResult> => {
  const ref = db.doc(`ladders/${ladderId}/ladderMatches/${matchId}`);
  return db.runTransaction(async (transaction): Promise<LadderArrivalResult> => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError("not-found", "Match not found");
    const match = snapshot.data() as LadderMatch;
    if (!(match.participants ?? []).includes(userId)) {
      throw new HttpsError("permission-denied", "You're not playing in this match");
    }
    if (match.matchStatus !== LADDER_MATCH_STATUS.ACCEPTED) {
      throw new HttpsError("failed-precondition", "This match isn't open for check-in");
    }
    const check = checkLadderArrivalReading({ reading, court: match.court, nowMs });
    if ("reason" in check) {
      return { ok: false, reason: check.reason, distanceMeters: check.distanceMeters };
    }
    transaction.update(ref, {
      [`arrivals.${userId}`]: {
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        distanceMeters: check.distanceMeters,
        accuracyMeters: reading.accuracy,
      },
    });
    return {
      ok: true,
      distanceMeters: check.distanceMeters,
      opponentArrived: hasArrivedForLadderMatch(match, getLadderOpponentIds(match, userId)),
    };
  });
};

/**
 * Confirms a player is at their match's court from a fresh device reading and
 * records it on the match with the server's clock. Mocked, stale, inaccurate
 * or distant readings are refused and nothing is written.
 */
export const recordLadderArrival = onCall(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError("unauthenticated", "Sign in to check in");
  const { ladderId, matchId } = (request.data ?? {}) as {
    ladderId?: unknown;
    matchId?: unknown;
  };
  const reading = toReading((request.data as { reading?: unknown })?.reading);
  if (typeof ladderId !== "string" || typeof matchId !== "string" || !reading) {
    throw new HttpsError("invalid-argument", "A match and a location are required");
  }
  return recordArrival({
    db: admin.firestore(),
    userId,
    ladderId,
    matchId,
    reading,
    nowMs: Date.now(),
  });
});
