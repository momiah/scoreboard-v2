import { LADDER_STATUS, notificationTypes } from "@shared";
import type { Ladder, LadderMatch } from "@shared/types";

// Once a ladder's registration has closed its entrants are fixed until the
// ladder completes (or is cancelled), so a team in it cannot disband.
const ENTRANTS_LOCKED_STATUSES: string[] = [
  LADDER_STATUS.REGISTRATION_CLOSED,
  LADDER_STATUS.PLAYOFFS,
];

export const isTeamLockedInLadder = (
  ladders: Pick<Ladder, "status">[],
): boolean =>
  ladders.some((ladder) => ENTRANTS_LOCKED_STATUSES.includes(ladder.status));

const FINISHED_LADDER_STATUSES: string[] = [
  LADDER_STATUS.COMPLETED,
  LADDER_STATUS.CANCELLED,
];

export const isLadderFinished = (ladder: Pick<Ladder, "status">): boolean =>
  FINISHED_LADDER_STATUSES.includes(ladder.status);

// A team has played in a ladder once any match it is in has an approved game.
export const teamHasCompletedLadderGame = (
  matches: Pick<LadderMatch, "participants" | "games">[],
  playerIds: string[],
): boolean => {
  if (playerIds.length === 0) return false;
  const memberIds = new Set(playerIds);
  return matches.some(
    (match) =>
      (match.participants ?? []).some((id) => memberIds.has(id)) &&
      (match.games ?? []).some(
        (game) =>
          game.approvalStatus === notificationTypes.RESPONSE.APPROVED_GAME,
      ),
  );
};
