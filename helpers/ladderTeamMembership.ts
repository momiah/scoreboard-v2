import type { TeamStats, TeamMember } from "@shared/types";

type TeamLike = Pick<TeamStats, "playerIds"> & { players?: TeamMember[] };

export const teamMemberIds = (team: TeamLike): string[] => {
  const ids = team.playerIds?.length
    ? team.playerIds
    : (team.players ?? []).map((player) => player.userId);
  return ids.filter((id): id is string => Boolean(id));
};

export const findLadderMemberConflicts = (
  teamPlayerIds: string[],
  ladderMemberIds: Iterable<string>,
): string[] => {
  const ladderSet = new Set(ladderMemberIds);
  const seen = new Set<string>();
  return teamPlayerIds.filter((id) => {
    if (seen.has(id) || !ladderSet.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const canTeamJoinLadder = (
  teamPlayerIds: string[],
  ladderMemberIds: Iterable<string>,
): boolean =>
  findLadderMemberConflicts(teamPlayerIds, ladderMemberIds).length === 0;
