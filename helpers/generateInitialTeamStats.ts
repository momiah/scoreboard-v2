import { Fixtures, TeamStats } from "@shared/types";

export const normalizeTeamKey = (ids: string[]): string =>
  ids.join("-").split("-").sort().join("-");

export const createTeam = (players: string[], teamKey: string): TeamStats => ({
  team: players.slice().sort(),
  teamKey,
  numberOfWins: 0,
  numberOfLosses: 0,
  numberOfGamesPlayed: 0,
  resultLog: [],
  pointDifferenceLog: [],
  averagePointDifference: 0,
  totalPointDifference: 0,
  currentStreak: 0,
  highestWinStreak: 0,
  highestLossStreak: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  demonWin: 0,
  lossesTo: {},
  rival: null,
});

export const generateInitialTeamStats = (fixtures: Fixtures[]): TeamStats[] => {
  const teamMap = new Map<string, TeamStats>();

  fixtures.forEach((round) => {
    round.games.forEach((game) => {
      const team1PlayerIds = [game.team1.player1, game.team1.player2]
        .filter(Boolean)
        .map((p) => p!.userId)
        .filter((id): id is string => !!id);

      const team2PlayerIds = [game.team2.player1, game.team2.player2]
        .filter(Boolean)
        .map((p) => p!.userId)
        .filter((id): id is string => !!id);

      const team1DisplayNames = [game.team1.player1, game.team1.player2]
        .filter(Boolean)
        .map((p) => p?.displayName ?? "")
        .filter(Boolean);

      const team2DisplayNames = [game.team2.player1, game.team2.player2]
        .filter(Boolean)
        .map((p) => p?.displayName ?? "")
        .filter(Boolean);

      const team1Key = normalizeTeamKey(team1PlayerIds);
      const team2Key = normalizeTeamKey(team2PlayerIds);

      if (team1PlayerIds.length && !teamMap.has(team1Key)) {
        teamMap.set(team1Key, createTeam(team1DisplayNames, team1Key));
      }

      if (team2PlayerIds.length && !teamMap.has(team2Key)) {
        teamMap.set(team2Key, createTeam(team2DisplayNames, team2Key));
      }
    });
  });

  return [...teamMap.values()];
};
