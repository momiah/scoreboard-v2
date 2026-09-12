import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";

const SCHEDULE_STATUSES: readonly string[] = [
  LADDER_MATCH_STATUS.ACCEPTED,
  LADDER_MATCH_STATUS.COMPLETED,
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
    const dayStartMs = matchDayStartMs(match.matchDate);
    return dayStartMs == null || dayStartMs >= todayStartMs;
  });
};
