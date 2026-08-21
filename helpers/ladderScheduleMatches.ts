import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";

// Statuses that belong in a player's Schedule tab: matches they've committed to.
const SCHEDULE_STATUSES: readonly string[] = [
  LADDER_MATCH_STATUS.ACCEPTED,
  LADDER_MATCH_STATUS.COMPLETED,
];

/**
 * The current user's scheduled matches: those they participate in whose status
 * is accepted (and later completed). Input order is preserved (callers pass
 * matches already ordered newest-first).
 */
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

/**
 * Posted matches available for the current user to accept in Matchmaking:
 * status "posted", regardless of whether the user is the poster (own matches
 * are shown but disabled by the UI). Input order is preserved.
 */
export const getOpenMatchmakingMatches = (
  matches: LadderMatch[],
): LadderMatch[] =>
  matches.filter((match) => match.matchStatus === LADDER_MATCH_STATUS.POSTED);
