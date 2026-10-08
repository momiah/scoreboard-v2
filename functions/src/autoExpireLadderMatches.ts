import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";
import type { LadderMatch } from "courtchamps-shared/types";
import { isLadderMatchExpired } from "courtchamps-shared/helpers";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";

const BATCH_LIMIT = 400;

export const autoExpireLadderMatches = onSchedule(
  { schedule: "every 30 minutes", timeoutSeconds: 540, memory: "512MiB" },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    try {
      const laddersSnapshot = await db.collection(LADDERS).get();
      const results = await Promise.allSettled(
        laddersSnapshot.docs.map(async (ladderDoc) => {
          const matchesSnapshot = await ladderDoc.ref
            .collection(LADDER_MATCHES)
            .where("matchStatus", "==", LADDER_MATCH_STATUS.ACCEPTED)
            .get();

          const expiredRefs = matchesSnapshot.docs
            .filter((matchDoc) =>
              isLadderMatchExpired(matchDoc.data() as LadderMatch, now),
            )
            .map((matchDoc) => matchDoc.ref);
          for (let i = 0; i < expiredRefs.length; i += BATCH_LIMIT) {
            const batch = db.batch();
            expiredRefs.slice(i, i + BATCH_LIMIT).forEach((ref) =>
              batch.update(ref, {
                matchStatus: LADDER_MATCH_STATUS.EXPIRED,
                expiredAt: new Date(),
              }),
            );
            await batch.commit();
          }
          return expiredRefs.length;
        }),
      );
      const counts = results.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        console.error(
          `❌ Auto-expire failed for ${laddersSnapshot.docs[index].id}:`,
          result.reason,
        );
        return 0;
      });

      const expired = counts.reduce((sum, n) => sum + n, 0);
      console.log(
        `✅ Auto-expire finished. Expired ${expired} inactive match(es).`,
      );
    } catch (error) {
      console.log("❌ Auto-expire function failed:", error);
    }
  },
);
