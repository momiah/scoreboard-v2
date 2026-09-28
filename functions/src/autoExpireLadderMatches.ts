import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";
import type { LadderMatch } from "courtchamps-shared/types";
import { isLadderMatchExpired } from "courtchamps-shared/helpers";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";

export const autoExpireLadderMatches = onSchedule(
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
          let expired = 0;
          matchesSnapshot.docs.forEach((matchDoc) => {
            const match = matchDoc.data() as LadderMatch;
            if (isLadderMatchExpired(match, now)) {
              batch.update(matchDoc.ref, {
                matchStatus: LADDER_MATCH_STATUS.EXPIRED,
                expiredAt: new Date(),
              });
              expired += 1;
            }
          });
          if (expired > 0) await batch.commit();
          return expired;
        }),
      );

      const expired = counts.reduce((sum, n) => sum + n, 0);
      console.log(
        `✅ Auto-expire finished. Expired ${expired} inactive match(es).`,
      );
    } catch (error) {
      console.log("❌ Auto-expire function failed:", error);
    }
  },
);
