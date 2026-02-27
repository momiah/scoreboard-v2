const calculateTeamPerformance = async ({ game, allTeams }) => {
  const normalizeTeamKey = (key) => {
    return key.join("-").split("-").sort().join("-");
  };

  const { result } = game;

  const winnerTeamKey = normalizeTeamKey(result.winner.players);
  const loserTeamKey = normalizeTeamKey(result.loser.players);

  const getTeamsByKeys = (teams, winnerKey, loserKey) => {
    let winnerTeam = teams.find(
      (team) => normalizeTeamKey(team.team) === winnerKey
    );
    let loserTeam = teams.find(
      (team) => normalizeTeamKey(team.team) === loserKey
    );
    return [winnerTeam, loserTeam];
  };

  let [winnerTeam, loserTeam] = getTeamsByKeys(
    allTeams,
    winnerTeamKey,
    loserTeamKey
  );

  if (!winnerTeam) {
    winnerTeam = {
      team: result.winner.players.slice().sort(),
      teamKey: winnerTeamKey,
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
    };
  }

  if (!loserTeam) {
    loserTeam = {
      team: result.loser.players.slice().sort(),
      teamKey: loserTeamKey,
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
    };
  }

  const pointDifference = result.winner.score - result.loser.score;

  updateTeamStats(winnerTeam, "W", pointDifference);
  updateTeamStats(loserTeam, "L", -pointDifference);

  if (!loserTeam.lossesTo[winnerTeamKey]) loserTeam.lossesTo[winnerTeamKey] = 0;
  loserTeam.lossesTo[winnerTeamKey] += 1;

  const lossesToValues = Object.values(loserTeam.lossesTo);
  const maxLosses = Math.max(...lossesToValues);

  if (maxLosses > 1) {
    const teamsWithMaxLosses = Object.keys(loserTeam.lossesTo).filter(
      (key) => loserTeam.lossesTo[key] === maxLosses
    );

    if (teamsWithMaxLosses.length === 1) {
      const rivalKey = teamsWithMaxLosses[0];
      loserTeam.rival = { rivalKey, rivalPlayers: winnerTeam.team };
    } else {
      loserTeam.rival = null;
    }
  } else {
    loserTeam.rival = null;
  }

  return [winnerTeam, loserTeam];
};

function updateTeamStats(team, result, pointDifference) {
  const previousWinStreak = team.currentStreak > 0 ? team.currentStreak : 0;

  if (result === "W") {
    team.numberOfWins += 1;

    if (pointDifference >= 10) {
      team.demonWin = (team.demonWin || 0) + 1;
    }
  } else {
    team.numberOfLosses += 1;
  }

  team.numberOfGamesPlayed += 1;

  team.resultLog.push(result);
  team.resultLog = team.resultLog.slice(-10);

  if (!team.pointDifferenceLog) {
    team.pointDifferenceLog = [];
  }

  if (typeof team.totalPointDifference !== "number")
    team.totalPointDifference = 0;

  team.totalPointDifference += pointDifference;
  team.pointDifferenceLog.push(pointDifference);
  team.pointDifferenceLog = team.pointDifferenceLog.slice(-10);

  const totalPointDifference = team.pointDifferenceLog.reduce(
    (sum, pd) => sum + pd,
    0
  );
  team.averagePointDifference =
    totalPointDifference / team.pointDifferenceLog.length;

  updateWinStreaks(team, previousWinStreak);
}

function updateWinStreaks(team, previousWinStreak) {
  const previousResult =
    team.resultLog.length > 1
      ? team.resultLog[team.resultLog.length - 2]
      : null;
  const currentResult = team.resultLog[team.resultLog.length - 1];

  if (currentResult === "W") {
    if (previousResult === "L" || previousResult === null) {
      team.currentStreak = 1;
    } else {
      team.currentStreak += 1;
    }
  } else if (currentResult === "L") {
    if (previousResult === "W" || previousResult === null) {
      team.currentStreak = -1;
    } else {
      team.currentStreak -= 1;
    }
  }

  if (team.currentStreak > 0) {
    team.highestWinStreak = Math.max(
      team.highestWinStreak || 0,
      team.currentStreak
    );
  } else if (team.currentStreak < 0) {
    team.highestLossStreak = Math.max(
      team.highestLossStreak || 0,
      Math.abs(team.currentStreak)
    );
  }

  const currentWinStreak = team.currentStreak > 0 ? team.currentStreak : 0;

  if (typeof team.winStreak3 !== "number") team.winStreak3 = 0;
  if (typeof team.winStreak5 !== "number") team.winStreak5 = 0;
  if (typeof team.winStreak7 !== "number") team.winStreak7 = 0;

  if (previousWinStreak < 3 && currentWinStreak >= 3) {
    team.winStreak3 += 1;
  }
  if (previousWinStreak < 5 && currentWinStreak >= 5) {
    team.winStreak5 += 1;
  }
  if (previousWinStreak < 7 && currentWinStreak >= 7) {
    team.winStreak7 += 1;
  }
}

module.exports = { calculateTeamPerformance };
