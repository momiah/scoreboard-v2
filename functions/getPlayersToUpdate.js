export const getPlayersToUpdate = async (
  game,
  retrievePlayers,
  setPreviousPlayerRecord,
  previousPlayerRecord
) => {
  const allPlayers = await retrievePlayers(); // Fetch all players

  const playersToUpdate = allPlayers.filter((player) =>
    game.result.winner.players
      .concat(game.result.loser.players)
      .includes(player.id)
  );

  const previousRecord = JSON.parse(JSON.stringify(playersToUpdate));
  setPreviousPlayerRecord([...previousPlayerRecord, previousRecord]);

  const updatePlayerStats = (player, isWinner) => {
    player.newPlayer.numberOfGamesPlayed += 1;

    if (isWinner) {
      player.newPlayer.numberOfWins += 1;
    } else {
      player.newPlayer.numberOfLosses += 1;
    }

    // Calculate win percentage if needed
    player.newPlayer.winPercentage =
      (player.newPlayer.numberOfWins / player.newPlayer.numberOfGamesPlayed) *
      100;

    return player;
  };

  const updatePlayerResultLogAndStreak = (player, isWinner) => {
    const currentResult = isWinner ? "W" : "L";
    player.newPlayer.resultLog.push(currentResult);

    if (player.newPlayer.resultLog.length > 10) {
      player.newPlayer.resultLog = player.newPlayer.resultLog.slice(-10);
    }

    const resultLog = player.newPlayer.resultLog;
    const lastResult =
      resultLog.length > 1 ? resultLog[resultLog.length - 2] : null;

    // Initialize the win/loss streak variables
    let winStreak3 = player.newPlayer.winStreak3 || 0;
    let winStreak5 = player.newPlayer.winStreak5 || 0;
    let winStreak7 = player.newPlayer.winStreak7 || 0;

    let highestWinStreak = player.newPlayer.highestWinStreak || 0;
    let highestLossStreak = player.newPlayer.highestLossStreak || 0;

    // Update streak based on current result and last result
    if (currentResult === "W") {
      if (lastResult === "W") {
        player.newPlayer.currentStreak.count += 1; // Continue winning streak
      } else {
        player.newPlayer.currentStreak.type = "W"; // Reset to win streak
        player.newPlayer.currentStreak.count = 1;
      }

      // Track specific win streaks
      if (player.newPlayer.currentStreak.count === 3) winStreak3 += 1;
      if (player.newPlayer.currentStreak.count === 5) winStreak5 += 1;
      if (player.newPlayer.currentStreak.count === 7) winStreak7 += 1;

      // Update the highest win streak if the current one exceeds the previous
      highestWinStreak = Math.max(
        highestWinStreak,
        player.newPlayer.currentStreak.count
      );
    } else {
      if (lastResult === "L") {
        player.newPlayer.currentStreak.count -= 1; // Continue losing streak
      } else {
        player.newPlayer.currentStreak.type = "L"; // Reset to loss streak
        player.newPlayer.currentStreak.count = -1;
      }

      // Update the highest loss streak
      highestLossStreak = Math.min(
        highestLossStreak,
        player.newPlayer.currentStreak.count
      );
    }

    // Save back the calculated streaks
    player.newPlayer.highestWinStreak = highestWinStreak;
    player.newPlayer.highestLossStreak = Math.abs(highestLossStreak); // Store as positive value
    player.newPlayer.winStreak3 = winStreak3;
    player.newPlayer.winStreak5 = winStreak5;
    player.newPlayer.winStreak7 = winStreak7;

    return player;
  };

  const updatePlayerTotalPoints = (player, points) => {
    player.newPlayer.totalPoints += points;
    return player;
  };

  // Update stats for winning players
  game.result.winner.players.forEach((winnerId) => {
    const player = playersToUpdate.find((p) => p.id === winnerId);
    if (player) {
      updatePlayerStats(player, true); // true indicates the player is a winner
      updatePlayerTotalPoints(player, game.result.winner.score);
      updatePlayerResultLogAndStreak(player, true);
    }
  });

  // Update stats for losing players
  game.result.loser.players.forEach((loserId) => {
    const player = playersToUpdate.find((p) => p.id === loserId);
    if (player) {
      updatePlayerStats(player, false);
      updatePlayerTotalPoints(player, game.result.loser.score);
      updatePlayerResultLogAndStreak(player, false);
    }
  });

  return playersToUpdate;
};
