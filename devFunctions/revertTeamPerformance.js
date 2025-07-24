export const revertTeamPerformance = async (game, retrieveTeams, leagueId) => {
  const allTeams = await retrieveTeams(leagueId);

  const normalizeTeamKey = (key) => key.join("-").split("-").sort().join("-");

  const { result } = game;
  const winnerTeamKey = normalizeTeamKey(result.winner.players);
  const loserTeamKey = normalizeTeamKey(result.loser.players);

  const winnerTeam = allTeams.find(
    (team) => normalizeTeamKey(team.team) === winnerTeamKey
  );
  const loserTeam = allTeams.find(
    (team) => normalizeTeamKey(team.team) === loserTeamKey
  );

  if (!winnerTeam || !loserTeam) return []; // No teams found to revert

  const pointDifference = result.winner.score - result.loser.score;

  reverseTeamStats(winnerTeam, "W", pointDifference);
  reverseTeamStats(loserTeam, "L", -pointDifference);

  // Revert lossesTo count
  if (loserTeam.lossesTo[winnerTeamKey]) {
    loserTeam.lossesTo[winnerTeamKey] -= 1;
    if (loserTeam.lossesTo[winnerTeamKey] <= 0) {
      delete loserTeam.lossesTo[winnerTeamKey];
    }
  }

  // Re-calculate rival
  const lossesToEntries = Object.entries(loserTeam.lossesTo);
  if (lossesToEntries.length > 0) {
    const [maxKey] = lossesToEntries.reduce((max, entry) =>
      entry[1] > max[1] ? entry : max
    );
    loserTeam.rival = { rivalKey: maxKey, rivalPlayers: winnerTeam.team };
  } else {
    loserTeam.rival = null;
  }

  return [winnerTeam, loserTeam];
};

function reverseTeamStats(team, result, pointDifference) {
  if (result === "W") {
    team.numberOfWins -= 1;
    if (pointDifference >= 10 && team.demonWin > 0) {
      team.demonWin -= 1;
    }
  } else {
    team.numberOfLosses -= 1;
  }

  team.numberOfGamesPlayed -= 1;

  if (team.resultLog.length) team.resultLog.pop();
  if (team.pointDifferenceLog.length) team.pointDifferenceLog.pop();

  team.totalPointDifference -= pointDifference;
  team.averagePointDifference =
    team.pointDifferenceLog.length > 0
      ? team.pointDifferenceLog.reduce((sum, pd) => sum + pd, 0) /
        team.pointDifferenceLog.length
      : 0;

  recalculateStreaks(team);
}

function recalculateStreaks(team) {
  let streak = 0;
  let highestWinStreak = 0;
  let highestLossStreak = 0;

  team.resultLog.forEach((result) => {
    if (result === "W") {
      streak = streak >= 0 ? streak + 1 : 1;
      highestWinStreak = Math.max(highestWinStreak, streak);
    } else if (result === "L") {
      streak = streak <= 0 ? streak - 1 : -1;
      highestLossStreak = Math.max(highestLossStreak, Math.abs(streak));
    }
  });

  team.currentStreak = streak;
  team.highestWinStreak = highestWinStreak;
  team.highestLossStreak = highestLossStreak;
}
