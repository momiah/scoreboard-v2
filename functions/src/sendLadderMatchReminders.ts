import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import moment from "moment-timezone";

import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";
import type { LadderMatch } from "courtchamps-shared/types";

import {
  ladderMatchNotificationTarget,
  notifyLadderPlayers,
} from "./helpers/notifyLadderPlayers";

const TIMEZONE = "Europe/London";
const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const HOUR_MS = 60 * 60 * 1000;

export type LadderMatchReminder = "day" | "hour";

const matchStart = (
  match: Pick<LadderMatch, "matchDate" | "matchTime">,
): moment.Moment | null => {
  if (!match.matchDate || !match.matchTime?.start) return null;
  const start = moment.tz(
    `${match.matchDate} ${match.matchTime.start}`,
    "DD-MM-YYYY HH:mm",
    true,
    TIMEZONE,
  );
  return start.isValid() ? start : null;
};

export const getDueLadderMatchReminder = (
  match: Pick<LadderMatch, "matchDate" | "matchTime">,
  nowMs: number,
): LadderMatchReminder | null => {
  const start = matchStart(match);
  if (!start) return null;
  const msUntil = start.valueOf() - nowMs;
  if (msUntil <= 0) return null;
  if (msUntil <= HOUR_MS) return "hour";
  if (msUntil <= 24 * HOUR_MS) return "day";
  return null;
};

export const ladderMatchReminderMessage = (
  match: Pick<LadderMatch, "matchDate" | "matchTime" | "court">,
  reminder: LadderMatchReminder,
  nowMs: number,
): string => {
  const court = match.court?.courtName ?? "your court";
  const time = match.matchTime.start;
  if (reminder === "hour") {
    return `Your ladder match at ${court} starts at ${time}. Remember to check in at the court.`;
  }
  const start = matchStart(match);
  const today = moment.tz(nowMs, TIMEZONE).isSame(start, "day");
  return `Reminder: your ladder match at ${court} is ${today ? "today" : "tomorrow"} at ${time}.`;
};

export const runSendLadderMatchReminders = async ({
  db,
  nowMs,
}: {
  db: admin.firestore.Firestore;
  nowMs: number;
}): Promise<number> => {
  const laddersSnapshot = await db.collection(LADDERS).get();
  const results = await Promise.allSettled(
    laddersSnapshot.docs.map(async (ladderDoc) => {
      const matchesSnapshot = await ladderDoc.ref
        .collection(LADDER_MATCHES)
        .where("matchStatus", "==", LADDER_MATCH_STATUS.ACCEPTED)
        .get();
      let sent = 0;
      for (const matchDoc of matchesSnapshot.docs) {
        const match = matchDoc.data() as LadderMatch;
        const reminder = getDueLadderMatchReminder(match, nowMs);
        if (!reminder) continue;
        await notifyLadderPlayers({
          userIds: match.participants ?? [],
          ladder: { ladderId: ladderDoc.id },
          kind: `match-reminder-${reminder}-${match.ladderMatchId}-${match.matchDate}-${match.matchTime.start}`,
          title: "Match reminder",
          message: ladderMatchReminderMessage(match, reminder, nowMs),
          ...ladderMatchNotificationTarget(match),
        });
        sent += 1;
      }
      return sent;
    }),
  );
  return results.reduce((sum, result, index) => {
    if (result.status === "fulfilled") return sum + result.value;
    console.error(
      `❌ Match reminders failed for ${laddersSnapshot.docs[index].id}:`,
      result.reason,
    );
    return sum;
  }, 0);
};

export const sendLadderMatchReminders = onSchedule(
  { schedule: "every 15 minutes", timeZone: TIMEZONE, timeoutSeconds: 540 },
  async () => {
    try {
      const sent = await runSendLadderMatchReminders({
        db: admin.firestore(),
        nowMs: Date.now(),
      });
      console.log(`✅ Match reminders finished. Reminded ${sent} match(es).`);
    } catch (error) {
      console.error("❌ Match reminders failed:", error);
    }
  },
);
