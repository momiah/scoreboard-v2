export const calculatTeamPerformance = (gameData) => {
  const teamPerformance = {};

  function calculatePointDifferencePercentage(winnerScore, loserScore) {
    const pointDifference = winnerScore - loserScore;
    return (pointDifference / winnerScore) * 100;
  }

  function updateStreaks(team) {
    let currentStreakCount = 0;
    let highestWinStreak = 0;
    let highestLossStreak = 0;
    let isCurrentStreakWin = null;

    team.resultLog.forEach((result) => {
      if (result === "W") {
        if (isCurrentStreakWin === true || isCurrentStreakWin === null) {
          currentStreakCount += 1;
        } else {
          currentStreakCount = 1;
        }
        isCurrentStreakWin = true;
        if (currentStreakCount > highestWinStreak) {
          highestWinStreak = currentStreakCount;
        }
      } else if (result === "L") {
        if (isCurrentStreakWin === false || isCurrentStreakWin === null) {
          currentStreakCount -= 1;
        } else {
          currentStreakCount = -1;
        }
        isCurrentStreakWin = false;
        if (Math.abs(currentStreakCount) > highestLossStreak) {
          highestLossStreak = Math.abs(currentStreakCount);
        }
      }
    });

    team.currentStreak = currentStreakCount;
    team.highestWinStreak = highestWinStreak;
    team.highestLossStreak = highestLossStreak;

    // Update the win streak counts
    if (currentStreakCount >= 3) team.winStreak3++;
    if (currentStreakCount >= 5) team.winStreak5++;
    if (currentStreakCount >= 7) team.winStreak7++;
  }

  function updateRival(team, opponentKey, opponentPlayers) {
    if (!team.lossesTo[opponentKey]) {
      team.lossesTo[opponentKey] = 0;
    }
    team.lossesTo[opponentKey] += 1;
    const maxLosses = Math.max(...Object.values(team.lossesTo));
    const rivalKey = Object.keys(team.lossesTo).find(
      (key) => team.lossesTo[key] === maxLosses
    );
    team.rival = {
      rivalKey: rivalKey,
      rivalPlayers: opponentPlayers,
    };
  }

  gameData.forEach((game) => {
    const winnerTeamKey = game.result.winner.players.join("-");
    const loserTeamKey = game.result.loser.players.join("-");

    if (!teamPerformance[winnerTeamKey]) {
      teamPerformance[winnerTeamKey] = {
        teamKey: winnerTeamKey,
        team: game.result.winner.players,
        numberOfWins: 0,
        numberOfLosses: 0,
        numberOfGamesPlayed: 0,
        resultLog: [],
        pointEfficiency: 0,
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

    if (!teamPerformance[loserTeamKey]) {
      teamPerformance[loserTeamKey] = {
        teamKey: loserTeamKey,
        team: game.result.loser.players,
        numberOfWins: 0,
        numberOfLosses: 0,
        numberOfGamesPlayed: 0,
        resultLog: [],
        pointEfficiency: 0,
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

    // Update performance data for the winning team
    teamPerformance[winnerTeamKey].numberOfWins += 1;
    teamPerformance[winnerTeamKey].numberOfGamesPlayed += 1;
    teamPerformance[winnerTeamKey].resultLog.push("W");
    teamPerformance[winnerTeamKey].resultLog =
      teamPerformance[winnerTeamKey].resultLog.slice(-10);

    // Update point efficiency for the winning team
    const pointEfficiency = calculatePointDifferencePercentage(
      game.result.winner.score,
      game.result.loser.score
    );
    teamPerformance[winnerTeamKey].pointEfficiency += pointEfficiency;

    // Check for demon win
    if (game.result.winner.score - game.result.loser.score >= 10) {
      teamPerformance[winnerTeamKey].demonWin += 1;
    }

    // Update performance data for the losing team
    teamPerformance[loserTeamKey].numberOfLosses += 1;
    teamPerformance[loserTeamKey].numberOfGamesPlayed += 1;
    teamPerformance[loserTeamKey].resultLog.push("L");
    teamPerformance[loserTeamKey].resultLog =
      teamPerformance[loserTeamKey].resultLog.slice(-10);

    // Update streaks for both teams
    updateStreaks(teamPerformance[winnerTeamKey]);
    updateStreaks(teamPerformance[loserTeamKey]);

    // Update rival information for the losing team
    updateRival(
      teamPerformance[loserTeamKey],
      winnerTeamKey,
      game.result.winner.players
    );
  });

  // Calculate the average point efficiency for each team
  Object.values(teamPerformance).forEach((team) => {
    if (team.numberOfWins > 0) {
      team.pointEfficiency = team.pointEfficiency / team.numberOfWins;
    }
  });

  // Convert to array and sort
  const teamPerformanceArray = Object.values(teamPerformance);
  teamPerformanceArray.sort((a, b) => {
    if (b.numberOfWins !== a.numberOfWins) {
      return b.numberOfWins - a.numberOfWins;
    }
    const winRatioA = a.numberOfWins / a.numberOfGamesPlayed;
    const winRatioB = b.numberOfWins / b.numberOfGamesPlayed;
    return winRatioB - winRatioA;
  });

  return teamPerformanceArray;
};
