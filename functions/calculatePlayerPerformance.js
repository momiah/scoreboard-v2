export const calculatePlayerPerformance = (games) => {
  const players = {};

  function initializePlayer(player) {
    if (!players[player]) {
      players[player] = {
        numberOfWins: 0,
        numberOfLosses: 0,
        totalPoints: 0,
        numberOfGamesPlayed: 0,
        resultLog: [],
        XP: 0,
        currentStreak: {
          type: null, // "W" for win streak, "L" for loss streak
          count: 0,
        },
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

  games.forEach((game) => {
    const team1 = game.team1;
    const team2 = game.team2;

    if (team1 && team2) {
      initializePlayer(team1.player1);
      initializePlayer(team1.player2);
      initializePlayer(team2.player1);
      initializePlayer(team2.player2);

      players[team1.player1].totalPoints += team1.score;
      players[team1.player2].totalPoints += team1.score;
      players[team2.player1].totalPoints += team2.score;
      players[team2.player2].totalPoints += team2.score;

      players[team1.player1].numberOfGamesPlayed += 1;
      players[team1.player2].numberOfGamesPlayed += 1;
      players[team2.player1].numberOfGamesPlayed += 1;
      players[team2.player2].numberOfGamesPlayed += 1;

      if (team1.score > team2.score) {
        players[team1.player1].numberOfWins += 1;
        players[team1.player2].numberOfWins += 1;
        players[team2.player1].numberOfLosses += 1;
        players[team2.player2].numberOfLosses += 1;

        updateXP(team1.player1, "W");
        updateXP(team1.player2, "W");
        updateXP(team2.player1, "L");
        updateXP(team2.player2, "L");

        updateResultLog(team1.player1, "W");
        updateResultLog(team1.player2, "W");
        updateResultLog(team2.player1, "L");
        updateResultLog(team2.player2, "L");
      } else {
        players[team1.player1].numberOfLosses += 1;
        players[team1.player2].numberOfLosses += 1;
        players[team2.player1].numberOfWins += 1;
        players[team2.player2].numberOfWins += 1;

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

  const playersArray = Object.entries(players).map(([player, stats]) => ({
    player,
    ...stats,
  }));

  // Sort the array by XP in descending order
  playersArray.sort((a, b) => b.XP - a.XP);

  // Convert the sorted array back into an object
  const sortedPlayers = {};
  playersArray.forEach((player) => {
    sortedPlayers[player.player] = {
      XP: player.XP,
      numberOfGamesPlayed: player.numberOfGamesPlayed,
      numberOfLosses: player.numberOfLosses,
      numberOfWins: player.numberOfWins,
      resultLog: player.resultLog,
      totalPoints: player.totalPoints,
    };
  });

  return sortedPlayers;
};
