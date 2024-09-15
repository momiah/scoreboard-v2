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

  console.log("game", JSON.stringify(game, null, 2));

  // Function to get player by ID
  const getPlayerById = (id) =>
    playersToUpdate.find((player) => player.id === id);

  // Calculate combined XP for winners
  const combinedWinnerXp = game.result.winner.players.reduce(
    (totalXp, playerId) => {
      const player = getPlayerById(playerId);
      if (player) {
        return totalXp + player.newPlayer.XP;
      }
      return totalXp;
    },
    0
  );

  // Calculate calculateCombined XP for losers
  const combinedLoserXp = game.result.loser.players.reduce(
    (totalXp, playerId) => {
      const player = getPlayerById(playerId);
      if (player) {
        return totalXp + player.newPlayer.XP;
      }
      return totalXp;
    },
    0
  );

  console.log("calculateCombined Winner XP:", combinedWinnerXp); // Should output 570
  console.log("calculateCombined Loser XP:", combinedLoserXp); // Should output -110

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

    let winStreak3 = player.newPlayer.winStreak3 || 0;
    let winStreak5 = player.newPlayer.winStreak5 || 0;
    let winStreak7 = player.newPlayer.winStreak7 || 0;

    let highestWinStreak = player.newPlayer.highestWinStreak || 0;
    let highestLossStreak = player.newPlayer.highestLossStreak || 0;

    if (currentResult === "W") {
      if (lastResult === "W") {
        player.newPlayer.currentStreak.count += 1;
      } else {
        player.newPlayer.currentStreak.type = "W";
        player.newPlayer.currentStreak.count = 1;
      }

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
        player.newPlayer.currentStreak.count -= 1;
      } else {
        player.newPlayer.currentStreak.type = "L";
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
    player.newPlayer.highestLossStreak = Math.abs(highestLossStreak);
    player.newPlayer.winStreak3 = winStreak3;
    player.newPlayer.winStreak5 = winStreak5;
    player.newPlayer.winStreak7 = winStreak7;

    return player;
  };

  function updateXp(
    player,
    streakType,
    streakCount,
    combinedWinnerXp,
    combinedLoserXp
  ) {
    const baseXP = streakType === "W" ? 20 : -10;

    // Multiplier logic based on streak
    const lossMultiplier =
      streakCount <= -7
        ? 3
        : streakCount <= -5
        ? 2.5
        : streakCount <= -3
        ? 2
        : streakCount <= -2
        ? 1.5
        : 1;

    const winMultiplier =
      streakCount >= 7
        ? 3
        : streakCount >= 5
        ? 2.5
        : streakCount >= 3
        ? 2
        : streakCount > 1
        ? 1.5
        : 1;

    // Determine the streak multiplier based on the current streak count
    const multiplier = streakType === "W" ? winMultiplier : lossMultiplier;

    // Calculate the base XP
    const xp = baseXP * multiplier;

    // Calculate rankedXp bonus/penalty
    let rankedXp = 0;
    const difference = combinedWinnerXp - combinedLoserXp;
    const differencePercentage = (difference / combinedWinnerXp) * 100;

    // Winners' bonus for defeating higher-ranked players
    if (streakType === "W" && combinedWinnerXp < combinedLoserXp) {
      const difference = combinedLoserXp - combinedWinnerXp;
      rankedXp = (difference / combinedLoserXp) * 100; // Percentage bonus
    }

    // Losers' penalty for losing to lower-ranked players
    if (streakType === "L" && combinedLoserXp > combinedWinnerXp) {
      const difference = combinedLoserXp - combinedWinnerXp;
      rankedXp = -(difference / combinedLoserXp) * 100; // Percentage penalty (negative)
    }

    // Log the rankedXp for debugging
    console.log("Ranked XP:", rankedXp);

    // Final XP calculation for winners and losers
    const finalXp = xp + (xp * rankedXp) / 100;

    console.log("Final XP:", finalXp);

    // Apply the XP adjustment to the player's XP
    player.newPlayer.XP += finalXp;

    return player;
  }

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
      updateXp(
        player,
        player.newPlayer.currentStreak.type,
        player.newPlayer.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp
      );
    }
  });

  // Update stats for losing players
  game.result.loser.players.forEach((loserId) => {
    const player = playersToUpdate.find((p) => p.id === loserId);
    if (player) {
      updatePlayerStats(player, false);
      updatePlayerTotalPoints(player, game.result.loser.score);
      updatePlayerResultLogAndStreak(player, false);
      updateXp(
        player,
        player.newPlayer.currentStreak.type,
        player.newPlayer.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp
      );
    }
  });

  console.log(JSON.stringify(playersToUpdate, null, 2));

  return playersToUpdate;
};
