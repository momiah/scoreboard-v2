import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch, MatchTime } from "@shared/types";
import { formatMatchDateShort, getMatchStart } from "./ladderMatchTime";

/** Two ladder matches whose start times are closer than this clash. */
export const LADDER_MATCH_CLASH_WINDOW_MINUTES = 60;

export interface LadderMatchSlot {
  matchDate: string;
  matchTime: MatchTime;
}

const BOOKED_STATUSES: string[] = [
  LADDER_MATCH_STATUS.POSTED,
  LADDER_MATCH_STATUS.ACCEPTED,
];

/**
 * The first match in `matches` that books any of `userIds` within
 * {@link LADDER_MATCH_CLASH_WINDOW_MINUTES} of `slot`, across every ladder.
 * Posted and accepted matches hold the slot; called-off and finished ones do not.
 */
export const findLadderMatchClash = ({
  slot,
  userIds,
  matches,
  excludeMatchId,
}: {
  slot: LadderMatchSlot;
  userIds: string[];
  matches: LadderMatch[];
  excludeMatchId?: string;
}): LadderMatch | null => {
  const start = getMatchStart(slot);
  if (!start) return null;
  const windowMs = LADDER_MATCH_CLASH_WINDOW_MINUTES * 60 * 1000;
  return (
    matches.find((match) => {
      if (excludeMatchId && match.ladderMatchId === excludeMatchId) {
        return false;
      }
      if (!BOOKED_STATUSES.includes(match.matchStatus)) return false;
      if (!(match.participants ?? []).some((id) => userIds.includes(id))) {
        return false;
      }
      const other = getMatchStart(match);
      return !!other && Math.abs(other.getTime() - start.getTime()) < windowMs;
    }) ?? null
  );
};

export const formatLadderMatchClashMessage = (
  clash: LadderMatchSlot,
  { team = false }: { team?: boolean } = {},
): string =>
  `${team ? "You or your partner already have" : "You already have"} a ladder match at ${clash.matchTime.start} on ${formatMatchDateShort(clash.matchDate)}, so you can't book another within ${LADDER_MATCH_CLASH_WINDOW_MINUTES} minutes of it.`;
