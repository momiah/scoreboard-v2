import { normalizeTeamKey } from "@shared";
import type { TeamMember, TeamStats } from "@shared/types";

const memberDisplayName = (member: TeamMember): string =>
  [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
  member.username;

export interface RosterPatch {
  players: TeamMember[];
  playerIds: string[];
  team: string[];
  teamKey: string;
}

const buildPatch = (players: TeamMember[]): RosterPatch => {
  const playerIds = players.map((player) => player.userId);
  return {
    players,
    playerIds,
    team: players.map(memberDisplayName),
    teamKey: normalizeTeamKey(playerIds),
  };
};

export const addMember = (
  team: Pick<TeamStats, "players">,
  member: TeamMember,
): RosterPatch => {
  const current = team.players ?? [];
  const players = current.some((player) => player.userId === member.userId)
    ? current
    : [...current, member];
  return buildPatch(players);
};

export const removeMember = (
  team: Pick<TeamStats, "players">,
  userId: string,
): RosterPatch =>
  buildPatch((team.players ?? []).filter((player) => player.userId !== userId));
