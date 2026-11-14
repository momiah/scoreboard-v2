import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

import type { Court, Ladder } from "courtchamps-shared/types";
import {
  LADDER_ELIGIBILITY_COLLECTION,
  checkLadderEligibilityReading,
  getLadderEligibilityId,
  getLadderEligibilityRadiusMiles,
  requiresLadderLocationCheck,
} from "courtchamps-shared/helpers";
import type {
  LadderEligibilityResult,
  LadderArrivalReading,
} from "courtchamps-shared/helpers";

import { toReading } from "./recordLadderArrival";

export const verifyEligibility = async ({
  db,
  userId,
  ladderId,
  reading,
  nowMs,
}: {
  db: admin.firestore.Firestore;
  userId: string;
  ladderId: string;
  reading: LadderArrivalReading;
  nowMs: number;
}): Promise<LadderEligibilityResult> => {
  const ladderSnap = await db.doc(`ladders/${ladderId}`).get();
  if (!ladderSnap.exists) throw new HttpsError("not-found", "Ladder not found");
  const ladder = ladderSnap.data() as Ladder;
  if (!requiresLadderLocationCheck(ladder)) {
    throw new HttpsError("failed-precondition", "This ladder has no location check");
  }

  const courtIds = (ladder.courtIds ?? []).filter(Boolean);
  const courtSnaps = courtIds.length
    ? await db.getAll(...courtIds.map((id) => db.doc(`courts/${id}`)))
    : [];
  const courts = courtSnaps
    .filter((snap) => snap.exists)
    .map((snap) => ({ ...(snap.data() as Court), courtId: snap.id }));

  const radiusMiles = getLadderEligibilityRadiusMiles(ladder);
  const result = checkLadderEligibilityReading({ reading, courts, radiusMiles, nowMs });
  if (!result.ok) return result;

  await db
    .collection(LADDER_ELIGIBILITY_COLLECTION)
    .doc(getLadderEligibilityId(ladderId, userId))
    .set({
      userId,
      ladderId,
      distanceMiles: result.distanceMiles,
      nearestCourtId: result.nearestCourtId,
      radiusMiles,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  return result;
};

/**
 * Checks a fresh device reading puts the user within a free ladder's radius of
 * one of its courts and records that they may join. The coordinates are used
 * only to measure the distance and are never stored.
 */
export const verifyLadderEligibility = onCall(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError("unauthenticated", "Sign in to join a ladder");
  const { ladderId } = (request.data ?? {}) as { ladderId?: unknown };
  const reading = toReading((request.data as { reading?: unknown })?.reading);
  if (typeof ladderId !== "string" || !reading) {
    throw new HttpsError("invalid-argument", "A ladder and a location are required");
  }
  return verifyEligibility({
    db: admin.firestore(),
    userId,
    ladderId,
    reading,
    nowMs: Date.now(),
  });
});
