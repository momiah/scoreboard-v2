import { transformDate } from "../functions/dateTransform";

export const getPlayersToUpdate = async (
  game,
  retrievePlayers
  // setPreviousPlayerRecord,
  // previousPlayerRecord
) => {
  const allPlayers = await retrievePlayers();
  const date = transformDate(game.date);
  const playersToUpdate = allPlayers.filter((player) =>
    game.result.winner.players
      .concat(game.result.loser.players)
      .includes(player.id)
  );

  // console.log("game", JSON.stringify(game, null, 2));

  // Function to get player by ID
  const getPlayerById = (id) =>
    playersToUpdate.find((player) => player.id === id);

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

  // const previousRecord = JSON.parse(JSON.stringify(playersToUpdate));
  // setPreviousPlayerRecord([...previousPlayerRecord, previousRecord]);

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

  const updateXp = (
    player,
    streakType,
    streakCount,
    combinedWinnerXp,
    combinedLoserXp
  ) => {
    // Handle potential division by zero or undefined values
    const baseXP = streakType === "W" ? 20 : -10;

    // Calculate difference multiplier safely
    const differenceMultiplier = combinedLoserXp / combinedWinnerXp;

    // Cap the rank multiplier between 0 and 10
    const rankMultiplier =
      differenceMultiplier < 2
        ? 0
        : differenceMultiplier > 10
        ? 10
        : differenceMultiplier;

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

    const multiplier = streakType === "W" ? winMultiplier : lossMultiplier;
    const xp = baseXP * multiplier;
    const rankXp = (xp * rankMultiplier) / 2;

    const finalXp = xp + rankXp;

    // Update the player's XP
    player.newPlayer.XP += finalXp;
    player.newPlayer.prevGameXP = finalXp;

    // Ensure the player's XP doesn't drop below 1
    if (player.newPlayer.XP < 10) {
      player.newPlayer.XP = 10;
    }

    // Log for debugging
    // console.log(
    //   `Player: ${player.id}, Base XP: ${baseXP}, Multiplier: ${multiplier}, Rank Multiplier: ${rankMultiplier}, Final XP: ${finalXp}, Updated XP: ${player.newPlayer.XP}`
    // );

    return player;
  };

  const updatePlayerTotalPoints = (player, points) => {
    player.newPlayer.totalPoints += points;
    return player;
  };

  const updateDemonWin = (player, winnerGameScore, loserGameScore) => {
    let demonWin = player.newPlayer.demonWin || 0;

    if (winnerGameScore - loserGameScore >= 10) {
      demonWin += 1;
      player.newPlayer.demonWin = demonWin;
    }
    return player;
  };

  const updateLastActive = (player, gameDate) => {
    player.newPlayer.lastActive = gameDate;
    return player;
  };

  const calculatePointDifferencePercentage = (
    player,
    winnerScore,
    loserScore
  ) => {
    // Initialize totalPointEfficiency if not already present
    let totalPointEfficiency = player.newPlayer.totalPointEfficiency || 0;

    // Calculate the point difference and the percentage difference
    const pointDifference = winnerScore - loserScore;
    const pointEfficiency = (pointDifference / winnerScore) * 100;

    // Accumulate the pointEfficiency to totalPointEfficiency
    totalPointEfficiency += pointEfficiency;

    // Update the player's totalPointEfficiency with the new value
    player.newPlayer.totalPointEfficiency = totalPointEfficiency;

    // Calculate point efficiency based on updated totalPointEfficiency
    player.newPlayer.pointEfficiency =
      totalPointEfficiency / player.newPlayer.numberOfGamesPlayed;

    // Log for debugging
    // console.log(
    //   `Player: ${player.id}, Total Point Efficiency: ${totalPointEfficiency}, Point Efficiency: ${player.newPlayer.pointEfficiency}`
    // );
  };

  // Update stats for winning players
  game.result.winner.players.forEach((winnerId) => {
    const player = playersToUpdate.find((p) => p.id === winnerId);
    if (player) {
      updatePlayerStats(player, true);
      updatePlayerTotalPoints(player, game.result.winner.score);
      updatePlayerResultLogAndStreak(player, true);
      updateXp(
        player,
        player.newPlayer.currentStreak.type,
        player.newPlayer.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp
      );
      updateDemonWin(player, game.result.winner.score, game.result.loser.score);
      updateLastActive(player, date);
      calculatePointDifferencePercentage(
        player,
        game.result.winner.score,
        game.result.loser.score
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
      updateLastActive(player, date);
    }
  });

  // console.log(JSON.stringify(playersToUpdate, null, 2));

  return playersToUpdate;
};
