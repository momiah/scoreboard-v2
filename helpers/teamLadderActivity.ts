import type { LadderMatch } from "@shared/types";

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
