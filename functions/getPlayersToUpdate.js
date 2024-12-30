import { transformDate } from "../functions/dateTransform";

export const getPlayersToUpdate = async (game, retrievePlayers, leagueId) => {
  const allPlayers = await retrievePlayers(leagueId);

  const date = transformDate(game.date);

  const playersToUpdate = allPlayers.filter((player) =>
    game.result.winner.players
      .concat(game.result.loser.players)
      .includes(player.id)
  );

  // Function to get player by ID
  const getPlayerById = (id) =>
    playersToUpdate.find((player) => player.id === id);

  const combinedWinnerXp = game.result.winner.players.reduce(
    (totalXp, playerId) => {
      const player = getPlayerById(playerId);
      if (player) {
        return totalXp + player.XP;
      }
      return totalXp;
    },
    0
  );

  const combinedLoserXp = game.result.loser.players.reduce(
    (totalXp, playerId) => {
      const player = getPlayerById(playerId);
      if (player) {
        return totalXp + player.XP;
      }
      return totalXp;
    },
    0
  );

  const updatePlayerStats = (player, isWinner) => {
    player.numberOfGamesPlayed += 1;

    if (isWinner) {
      player.numberOfWins += 1;
    } else {
      player.numberOfLosses += 1;
    }

    // Calculate win percentage if needed
    player.winPercentage =
      (player.numberOfWins / player.numberOfGamesPlayed) * 100;

    return player;
  };

  const updatePlayerResultLogAndStreak = (player, isWinner) => {
    const currentResult = isWinner ? "W" : "L";
    player.resultLog.push(currentResult);

    if (player.resultLog.length > 10) {
      player.resultLog = player.resultLog.slice(-10);
    }

    const resultLog = player.resultLog;
    const lastResult =
      resultLog.length > 1 ? resultLog[resultLog.length - 2] : null;

    let winStreak3 = player.winStreak3 || 0;
    let winStreak5 = player.winStreak5 || 0;
    let winStreak7 = player.winStreak7 || 0;

    let highestWinStreak = player.highestWinStreak || 0;
    let highestLossStreak = player.highestLossStreak || 0;

    if (currentResult === "W") {
      if (lastResult === "W") {
        player.currentStreak.count += 1;
      } else {
        player.currentStreak.type = "W";
        player.currentStreak.count = 1;
      }

      if (player.currentStreak.count === 3) winStreak3 += 1;
      if (player.currentStreak.count === 5) winStreak5 += 1;
      if (player.currentStreak.count === 7) winStreak7 += 1;

      // Update the highest win streak if the current one exceeds the previous
      highestWinStreak = Math.max(highestWinStreak, player.currentStreak.count);
    } else {
      if (lastResult === "L") {
        player.currentStreak.count -= 1;
      } else {
        player.currentStreak.type = "L";
        player.currentStreak.count = -1;
      }

      // Update the highest loss streak
      highestLossStreak = Math.min(
        highestLossStreak,
        player.currentStreak.count
      );
    }

    // Save back the calculated streaks
    player.highestWinStreak = highestWinStreak;
    player.highestLossStreak = Math.abs(highestLossStreak);
    player.winStreak3 = winStreak3;
    player.winStreak5 = winStreak5;
    player.winStreak7 = winStreak7;

    return player;
  };

  const updateXp = (
    player,
    streakType,
    streakCount,
    combinedWinnerXp,
    combinedLoserXp,
    points
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

    const prevWinGameXp = streakType === "W" ? points : 0;

    // Update the player's XP
    player.XP += finalXp;
    player.prevGameXP = streakType === "W" ? prevWinGameXp + finalXp : finalXp;

    // Ensure the player's XP doesn't drop below 1
    if (player.XP < 10) {
      player.XP = 10;
    }

    return player;
  };

  const updatePlayerTotalPoints = (player, points) => {
    player.totalPoints += points;
    return player;
  };

  const updateDemonWin = (player, winnerGameScore, loserGameScore) => {
    let demonWin = player.demonWin || 0;

    if (winnerGameScore - loserGameScore >= 10) {
      demonWin += 1;
      player.demonWin = demonWin;
    }
    return player;
  };

  const updateLastActive = (player, gameDate) => {
    player.lastActive = gameDate;
    return player;
  };

  const calculatePointDifferencePercentage = (
    player,
    winnerScore,
    loserScore
  ) => {
    // Initialize totalPointEfficiency if not already present
    let totalPointEfficiency = player.totalPointEfficiency || 0;

    // Calculate the point difference and the percentage difference
    const pointDifference = winnerScore - loserScore;
    const pointEfficiency = (pointDifference / winnerScore) * 100;

    // Accumulate the pointEfficiency to totalPointEfficiency
    totalPointEfficiency += pointEfficiency;

    // Update the player's totalPointEfficiency with the new value
    player.totalPointEfficiency = totalPointEfficiency;

    // Calculate point efficiency based on updated totalPointEfficiency
    player.pointEfficiency = totalPointEfficiency / player.numberOfGamesPlayed;

    // Log for debugging
    // console.log(
    //   `Player: ${player.id}, Total Point Efficiency: ${totalPointEfficiency}, Point Efficiency: ${player.pointEfficiency}`
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
        player.currentStreak.type,
        player.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp,
        game.result.winner.score
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
        player.currentStreak.type,
        player.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp
      );
      updateLastActive(player, date);
    }
  });

  return playersToUpdate;
};
