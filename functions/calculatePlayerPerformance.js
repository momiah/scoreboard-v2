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
      };
    }
  }

  function updateResultLog(player, result) {
    players[player].resultLog.push(result);
    if (players[player].resultLog.length > 10) {
      players[player].resultLog.shift();
    }
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

        players[team1.player1].XP += 20;
        players[team1.player2].XP += 20;
        players[team2.player1].XP -= 10;
        players[team2.player2].XP -= 10;

        updateResultLog(team1.player1, "W");
        updateResultLog(team1.player2, "W");
        updateResultLog(team2.player1, "L");
        updateResultLog(team2.player2, "L");
      } else {
        players[team1.player1].numberOfLosses += 1;
        players[team1.player2].numberOfLosses += 1;
        players[team2.player1].numberOfWins += 1;
        players[team2.player2].numberOfWins += 1;

        players[team1.player1].XP -= 10;
        players[team1.player2].XP -= 10;
        players[team2.player1].XP += 20;
        players[team2.player2].XP += 20;

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
