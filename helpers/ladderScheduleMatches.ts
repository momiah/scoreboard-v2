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

export const getOpenMatchmakingMatches = (
  matches: LadderMatch[],
): LadderMatch[] =>
  matches.filter((match) => match.matchStatus === LADDER_MATCH_STATUS.POSTED);
