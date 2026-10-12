import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";
import type { LadderMatch } from "courtchamps-shared/types";
import {
  getLadderMatchExtensionDaysLeft,
  isLadderMatchExpired,
} from "courtchamps-shared/helpers";

import {
  ladderMatchNotificationTarget,
  notifyLadderPlayers,
} from "./helpers/notifyLadderPlayers";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";

const BATCH_LIMIT = 400;

const toMs = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return null;
};

export const isLadderMatchExtensionEnding = (
  match: Pick<LadderMatch, "extension">,
  now: number,
): boolean => {
  const expiresAt = toMs(match.extension?.expiresAt);
  return (
    expiresAt !== null &&
    expiresAt > now &&
    getLadderMatchExtensionDaysLeft(expiresAt, now) === 1
  );
};

export const remindEndingLadderMatchExtensions = async (
  ladderId: string,
  matches: LadderMatch[],
  now: number,
): Promise<number> => {
  const ending = matches.filter((match) =>
    isLadderMatchExtensionEnding(match, now),
  );
  await Promise.all(
    ending.map((match) =>
      notifyLadderPlayers({
        userIds: match.participants ?? [],
        ladder: { ladderId },
        kind: `extension-ending-${match.ladderMatchId}`,
        title: "Ladder match",
        message: `Your extension has 1 day left to complete your match at ${match.court?.courtName ?? "your court"}.`,
        ...ladderMatchNotificationTarget(match),
      }),
    ),
  );
  return ending.length;
};

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

          await remindEndingLadderMatchExtensions(
            ladderDoc.id,
            matchesSnapshot.docs.map(
              (matchDoc) => matchDoc.data() as LadderMatch,
            ),
            now,
          );

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
