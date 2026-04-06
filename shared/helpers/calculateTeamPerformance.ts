import { Game, TeamStats } from "../types";

const normalizeTeamKey = (key: string[]): string =>
  key.join("-").split("-").sort().join("-");

const createTeam = (players: string[], teamKey: string): TeamStats => ({
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

function updateRival(loserTeam: TeamStats, winnerTeam: TeamStats): void {
  const lossesToValues = Object.values(loserTeam.lossesTo) as number[];
  const maxLosses = Math.max(...lossesToValues);

  if (maxLosses > 1) {
    const teamsWithMaxLosses = Object.keys(loserTeam.lossesTo).filter(
      (key) => loserTeam.lossesTo[key] === maxLosses,
    );
    loserTeam.rival =
      teamsWithMaxLosses.length === 1
        ? { rivalKey: teamsWithMaxLosses[0], rivalPlayers: winnerTeam.team }
        : null;
  } else {
    loserTeam.rival = null;
  }
}

function updateWinStreaks(team: TeamStats, previousWinStreak: number): void {
  const previousResult =
    team.resultLog.length > 1
      ? team.resultLog[team.resultLog.length - 2]
      : null;
  const currentResult = team.resultLog[team.resultLog.length - 1];

  if (currentResult === "W") {
    team.currentStreak =
      previousResult === "L" || previousResult === null
        ? 1
        : team.currentStreak + 1;
  } else if (currentResult === "L") {
    team.currentStreak =
      previousResult === "W" || previousResult === null
        ? -1
        : team.currentStreak - 1;
  }

  if (team.currentStreak > 0) {
    team.highestWinStreak = Math.max(
      team.highestWinStreak || 0,
      team.currentStreak,
    );
  } else if (team.currentStreak < 0) {
    team.highestLossStreak = Math.max(
      team.highestLossStreak || 0,
      Math.abs(team.currentStreak),
    );
  }

  const currentWinStreak = team.currentStreak > 0 ? team.currentStreak : 0;

  if (previousWinStreak < 3 && currentWinStreak >= 3) team.winStreak3 += 1;
  if (previousWinStreak < 5 && currentWinStreak >= 5) team.winStreak5 += 1;
  if (previousWinStreak < 7 && currentWinStreak >= 7) team.winStreak7 += 1;
}

function updateTeamStats(
  team: TeamStats,
  result: "W" | "L",
  pointDifference: number,
): void {
  const previousWinStreak = team.currentStreak > 0 ? team.currentStreak : 0;

  if (result === "W") {
    team.numberOfWins += 1;
    if (pointDifference >= 10) team.demonWin = (team.demonWin || 0) + 1;
  } else {
    team.numberOfLosses += 1;
  }

  team.numberOfGamesPlayed += 1;
  team.resultLog.push(result);
  team.resultLog = team.resultLog.slice(-10);

  team.totalPointDifference =
    (team.totalPointDifference || 0) + pointDifference;
  team.pointDifferenceLog = [
    ...(team.pointDifferenceLog || []),
    pointDifference,
  ].slice(-10);
  team.averagePointDifference =
    team.pointDifferenceLog.reduce((sum, pd) => sum + pd, 0) /
    team.pointDifferenceLog.length;

  updateWinStreaks(team, previousWinStreak);
}

export const calculateTeamPerformance = async ({
  game,
  allTeams,
}: {
  game: Game;
  allTeams: TeamStats[];
}): Promise<[TeamStats, TeamStats]> => {
  const { result } = game;

  const team1PlayerIds = [
    game.team1.player1?.userId,
    game.team1.player2?.userId,
  ].filter((id): id is string => Boolean(id));

  const team2PlayerIds = [
    game.team2.player1?.userId,
    game.team2.player2?.userId,
  ].filter((id): id is string => Boolean(id));

  const winnerPlayerIds = result?.winner.team === "Team 1" ? team1PlayerIds : team2PlayerIds;
  const loserPlayerIds = result?.winner.team === "Team 1" ? team2PlayerIds : team1PlayerIds;

  const winnerTeamKey = normalizeTeamKey(winnerPlayerIds);
  const loserTeamKey = normalizeTeamKey(loserPlayerIds);

  let winnerTeam =
    allTeams.find((team) => normalizeTeamKey(team.team) === winnerTeamKey) ??
    createTeam(winnerPlayerIds, winnerTeamKey);

  let loserTeam =
    allTeams.find((team) => normalizeTeamKey(team.team) === loserTeamKey) ??
    createTeam(loserPlayerIds, loserTeamKey);

  const pointDifference = result!.winner.score - result!.loser.score;

  updateTeamStats(winnerTeam, "W", pointDifference);
  updateTeamStats(loserTeam, "L", -pointDifference);

  loserTeam.lossesTo[winnerTeamKey] =
    ((loserTeam.lossesTo[winnerTeamKey] as number) || 0) + 1;

  updateRival(loserTeam, winnerTeam);

  return [winnerTeam, loserTeam];
};
