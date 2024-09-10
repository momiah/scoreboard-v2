export const calculatePlayerPerformance = (games) => {
  const players = {};

  function initializePlayer(player) {
    if (!players[player]) {
      players[player] = {
        lastActive: null,
        numberOfWins: 0, //Added to getPlayersToUpdate
        numberOfLosses: 0, //Added to getPlayersToUpdate
        totalPoints: 0, //Added to getPlayersToUpdate
        numberOfGamesPlayed: 0, //Added to getPlayersToUpdate
        resultLog: [], //Added to getPlayersToUpdate
        highestWinStreak: 0,
        highestLossStreak: 0,
        XP: 0,
        totalPointEfficiency: 0,
        pointEfficiency: 0,
        currentStreak: {
          //Added to getPlayersToUpdate
          type: null, // //Added to getPlayersToUpdate
          count: 0, //Added to getPlayersToUpdate
        },
        winStreak3: 0,
        winStreak5: 0,
        winStreak7: 0,
        demonWin: 0,
      };
    }
  }

  function updateResultLog(player, result) {
    players[player].resultLog.push(result);
    if (players[player].resultLog.length > 10) {
      players[player].resultLog.shift();
    }
  }

  function calculateStreakXP(streakType, streakCount) {
    const baseXP = streakType === "W" ? 20 : -10;
    const multiplier =
      streakCount >= 10
        ? 3
        : streakCount >= 7
        ? 2.5
        : streakCount >= 5
        ? 2
        : streakCount >= 3
        ? 1.5
        : 1;
    return baseXP * multiplier;
  }

  function updateXP(player, result) {
    const streak = players[player].currentStreak;

    if (streak.type === result) {
      streak.count += 1;
    } else {
      streak.type = result;
      streak.count = 1;
    }

    players[player].XP += calculateStreakXP(streak.type, streak.count);
  }

  function calculatePointDifferencePercentage(winnerScore, loserScore) {
    const pointDifference = winnerScore - loserScore;
    return (pointDifference / winnerScore) * 100;
  }

  function updateHighestStreak(player) {
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let highestWinStreak = 0;
    let highestLossStreak = 0;

    players[player].resultLog.forEach((result) => {
      if (result === "W") {
        currentWinStreak += 1;
        currentLossStreak = 0;
        if (currentWinStreak > highestWinStreak) {
          highestWinStreak = currentWinStreak;
        }
      } else if (result === "L") {
        currentLossStreak += 1;
        currentWinStreak = 0;
        if (currentLossStreak > highestLossStreak) {
          highestLossStreak = currentLossStreak;
        }
      }
    });

    players[player].highestWinStreak = highestWinStreak;
    players[player].highestLossStreak = highestLossStreak;

    // Update the win streak counts
    if (currentWinStreak >= 3) players[player].winStreak3++;
    if (currentWinStreak >= 5) players[player].winStreak5++;
    if (currentWinStreak >= 7) players[player].winStreak7++;
  }

  games.forEach((game) => {
    const team1 = game.team1;
    const team2 = game.team2;
    const lastActiveDate = game.date;

    if (team1 && team2) {
      initializePlayer(team1.player1);
      initializePlayer(team1.player2);
      initializePlayer(team2.player1);
      initializePlayer(team2.player2);

      players[team1.player1].lastActive = lastActiveDate;
      players[team1.player2].lastActive = lastActiveDate;
      players[team2.player1].lastActive = lastActiveDate;
      players[team2.player2].lastActive = lastActiveDate;

      players[team1.player1].totalPoints += team1.score;
      players[team1.player2].totalPoints += team1.score;
      players[team2.player1].totalPoints += team2.score;
      players[team2.player2].totalPoints += team2.score;

      players[team1.player1].numberOfGamesPlayed += 1;
      players[team1.player2].numberOfGamesPlayed += 1;
      players[team2.player1].numberOfGamesPlayed += 1;
      players[team2.player2].numberOfGamesPlayed += 1;

      if (team1.score > team2.score) {
        const team1Efficiency = calculatePointDifferencePercentage(
          team1.score,
          team2.score
        );

        players[team1.player1].numberOfWins += 1;
        players[team1.player2].numberOfWins += 1;
        players[team2.player1].numberOfLosses += 1;
        players[team2.player2].numberOfLosses += 1;

        players[team1.player1].totalPointEfficiency += team1Efficiency;
        players[team1.player2].totalPointEfficiency += team1Efficiency;

        if (team1.score - team2.score >= 10) {
          players[team1.player1].demonWin += 1;
          players[team1.player2].demonWin += 1;
        }

        updateXP(team1.player1, "W");
        updateXP(team1.player2, "W");
        updateXP(team2.player1, "L");
        updateXP(team2.player2, "L");

        updateResultLog(team1.player1, "W");
        updateResultLog(team1.player2, "W");
        updateResultLog(team2.player1, "L");
        updateResultLog(team2.player2, "L");
      } else {
        const team2Efficiency = calculatePointDifferencePercentage(
          team2.score,
          team1.score
        );

        players[team1.player1].numberOfLosses += 1;
        players[team1.player2].numberOfLosses += 1;
        players[team2.player1].numberOfWins += 1;
        players[team2.player2].numberOfWins += 1;

        players[team2.player1].totalPointEfficiency += team2Efficiency;
        players[team2.player2].totalPointEfficiency += team2Efficiency;

        if (team2.score - team1.score >= 10) {
          players[team2.player1].demonWin += 1;
          players[team2.player2].demonWin += 1;
        }

        updateXP(team1.player1, "L");
        updateXP(team1.player2, "L");
        updateXP(team2.player1, "W");
        updateXP(team2.player2, "W");

        updateResultLog(team1.player1, "L");
        updateResultLog(team1.player2, "L");
        updateResultLog(team2.player1, "W");
        updateResultLog(team2.player2, "W");
      }
    }
  });

  const playersArray = Object.entries(players).map(([player, stats]) => {
    const averagePointEfficiency = stats.numberOfWins
      ? stats.totalPointEfficiency / stats.numberOfWins
      : 0;
    updateHighestStreak(player);
    return {
      player,
      ...stats,
      pointEfficiency: averagePointEfficiency,
    };
  });

  // Sort the array by XP in descending order
  playersArray.sort((a, b) => b.XP - a.XP);

  // Convert the sorted array back into an object
  const sortedPlayers = {};
  playersArray.forEach((player) => {
    sortedPlayers[player.player] = {
      lastActive: player.lastActive,
      XP: player.XP,
      numberOfGamesPlayed: player.numberOfGamesPlayed,
      numberOfLosses: player.numberOfLosses,
      numberOfWins: player.numberOfWins,
      resultLog: player.resultLog.reverse(),
      totalPoints: player.totalPoints,
      pointEfficiency: player.pointEfficiency,
      currentStreak: player.currentStreak,
      highestWinStreak: player.highestWinStreak,
      highestLossStreak: player.highestLossStreak,
      winStreak3: player.winStreak3,
      winStreak5: player.winStreak5,
      winStreak7: player.winStreak7,
      demonWin: player.demonWin,
    };
  });

  return sortedPlayers;
};
