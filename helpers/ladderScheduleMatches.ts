import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";

import { getMatchStart } from "./ladderMatchTime";

const SCHEDULE_STATUSES: readonly string[] = [
  LADDER_MATCH_STATUS.ACCEPTED,
  LADDER_MATCH_STATUS.COMPLETED,
  LADDER_MATCH_STATUS.CANCELLED,
];

export const getMyScheduleMatches = (
  matches: LadderMatch[],
  userId: string,
): LadderMatch[] => {
  if (!userId) return [];
  return matches.filter(
    (match) =>
      match.participants.includes(userId) &&
      SCHEDULE_STATUSES.includes(match.matchStatus),
  );
};

const matchDayStartMs = (matchDate: string): number | null => {
  const [day, month, year] = (matchDate ?? "").split("-").map(Number);
  if (![day, month, year].every(Number.isFinite) || !day || !month || !year) {
    return null;
  }
  return new Date(year, month - 1, day).getTime();
};

export const getOpenMatchmakingMatches = (
  matches: LadderMatch[],
  now: Date = new Date(),
): LadderMatch[] => {
  const todayStartMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return matches.filter((match) => {
    if (match.matchStatus !== LADDER_MATCH_STATUS.POSTED) return false;
    // Drop an open post once its start time is reached — a match nobody
    // accepted in time leaves matchmaking. Fall back to the day when the time
    // can't be parsed.
    const start = getMatchStart(match);
    if (start) return start.getTime() > now.getTime();
    const dayStartMs = matchDayStartMs(match.matchDate);
    return dayStartMs == null || dayStartMs >= todayStartMs;
  });
};
