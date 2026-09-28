import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";
import type { LadderMatch } from "courtchamps-shared/types";
import {
  isLadderMatchUnattended,
  isLadderMatchExpired,
} from "courtchamps-shared/helpers";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";

export const autoCancelLadderMatches = onSchedule(
  "every 30 minutes",
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    try {
      const laddersSnapshot = await db.collection(LADDERS).get();
      const counts = await Promise.all(
        laddersSnapshot.docs.map(async (ladderDoc) => {
          const matchesSnapshot = await ladderDoc.ref
            .collection(LADDER_MATCHES)
            .where("matchStatus", "==", LADDER_MATCH_STATUS.ACCEPTED)
            .get();

          const batch = db.batch();
          let cancelled = 0;
          let expired = 0;
          matchesSnapshot.docs.forEach((matchDoc) => {
            const match = matchDoc.data() as LadderMatch;
            // A match that never started is cancelled; one that started then
            // went silent past the window is expired. The two are mutually
            // exclusive, so at most one branch fires per match.
            if (isLadderMatchUnattended(match, now)) {
              batch.update(matchDoc.ref, {
                matchStatus: LADDER_MATCH_STATUS.CANCELLED,
                cancelledAt: new Date(),
                cancelledReason: "Unattended",
              });
              cancelled += 1;
            } else if (isLadderMatchExpired(match, now)) {
              batch.update(matchDoc.ref, {
                matchStatus: LADDER_MATCH_STATUS.EXPIRED,
                expiredAt: new Date(),
              });
              expired += 1;
            }
          });
          if (cancelled + expired > 0) await batch.commit();
          return { cancelled, expired };
        }),
      );

      const cancelled = counts.reduce((sum, c) => sum + c.cancelled, 0);
      const expired = counts.reduce((sum, c) => sum + c.expired, 0);
      console.log(
        `✅ Auto-cancel finished. Cancelled ${cancelled} unattended, expired ${expired} abandoned match(es).`,
      );
    } catch (error) {
      console.log("❌ Auto-cancel function failed:", error);
    }
  },
);
