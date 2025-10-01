import { formatDisplayName } from "./formatDisplayName";

export const formatTeam = (team, leagueType) => {
  return leagueType === "Singles"
    ? [formatDisplayName(team.player1)]
    : [formatDisplayName(team.player1), formatDisplayName(team.player2)];
};
