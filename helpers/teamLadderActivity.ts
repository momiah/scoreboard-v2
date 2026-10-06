import { LADDER_STATUS } from "@shared/types";
import type { Ladder, LadderMatch } from "@shared/types";

// A team is "actively playing" once it has ANY match in a ladder — posted
// (scheduled), accepted, or completed. A match belongs to the team when any of
// the team's members is one of its participants (a user is only ever on one
// team per ladder, so a member appearing in a match means the team is in it).
export const teamHasLadderMatch = (
  matches: Pick<LadderMatch, "participants">[],
  playerIds: string[],
): boolean => {
  if (playerIds.length === 0) return false;
  const memberIds = new Set(playerIds);
  return matches.some((match) =>
    (match.participants ?? []).some((id) => memberIds.has(id)),
  );
};

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
