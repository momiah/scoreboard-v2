export const revertPlayerPerformance = (
  game,
  playersToUpdate,
  usersToUpdate
) => {
  const date = transformDate(game.date);

  const getUserByUsername = (username) =>
    usersToUpdate.find((user) => user.username === username);

  const combinedWinnerXp = game.result.winner.players.reduce(
    (totalXp, playerUsername) => {
      const user = getUserByUsername(playerUsername);
      return user ? totalXp + user.profileDetail.XP : totalXp;
    },
    0
  );

  const combinedLoserXp = game.result.loser.players.reduce(
    (totalXp, playerUsername) => {
      const user = getUserByUsername(playerUsername);
      return user ? totalXp + user.profileDetail.XP : totalXp;
    },
    0
  );

  const revertPlayerStats = (player, wasWinner, user) => {
    player.numberOfGamesPlayed -= 1;
    user.numberOfGamesPlayed -= 1;

    if (wasWinner) {
      player.numberOfWins -= 1;
      user.numberOfWins -= 1;
    } else {
      player.numberOfLosses -= 1;
      user.numberOfLosses -= 1;
    }

    player.winPercentage =
      player.numberOfGamesPlayed > 0
        ? (player.numberOfWins / player.numberOfGamesPlayed) * 100
        : 0;
    user.winPercentage =
      user.numberOfGamesPlayed > 0
        ? (user.numberOfWins / user.numberOfGamesPlayed) * 100
        : 0;
  };

  const revertResultLogAndStreak = (player, user) => {
    if (player.resultLog.length > 0) {
      player.resultLog.pop();
    }

    // Reset streak based on updated log
    let streakType = null;
    let count = 0;

    for (let i = player.resultLog.length - 1; i >= 0; i--) {
      const result = player.resultLog[i];
      if (!streakType) {
        streakType = result;
        count = 1;
      } else if (result === streakType) {
        count++;
      } else {
        break;
      }
    }

    player.currentStreak = {
      type: streakType,
      count: streakType === "W" ? count : -count,
    };

    user.currentStreak = { ...player.currentStreak };
  };

  const revertXp = (player, user) => {
    user.XP -= player.prevGameXP || 0;

    if (user.XP < 20) user.XP = 20; // Prevent going below minimum XP
  };

  const revertPoints = (player, points, user) => {
    player.totalPoints -= points;
    user.totalPoints -= points;
  };

  const revertDemonWin = (player, winnerScore, loserScore, user) => {
    if (winnerScore - loserScore >= 10) {
      player.demonWin = (player.demonWin || 1) - 1;
      user.demonWin = (user.demonWin || 1) - 1;
    }
  };

  const revertPointDifference = (
    player,
    winnerScore,
    loserScore,
    wasWinner,
    user
  ) => {
    const pointDifference = winnerScore - loserScore;
    const adjusted = wasWinner ? pointDifference : -pointDifference;

    player.totalPointDifference -= adjusted;
    user.totalPointDifference -= adjusted;

    if (player.pointDifferenceLog?.length) {
      player.pointDifferenceLog.pop();
    }

    const total = player.pointDifferenceLog.reduce((sum, pd) => sum + pd, 0);
    const avg =
      player.pointDifferenceLog.length > 0
        ? Math.round(total / player.pointDifferenceLog.length)
        : 0;
    player.averagePointDifference = avg;
  };

  const revertLastActive = (player, user) => {
    // Cannot reliably revert lastActive without history, so set null
    player.lastActive = null;
    user.lastActive = null;
  };

  const processPlayers = (players, wasWinner) => {
    players.forEach((username) => {
      const player = playersToUpdate.find((p) => p.username === username);
      const user = usersToUpdate.find((u) => u.userId === player.userId);

      if (player && user) {
        revertPlayerStats(player, wasWinner, user.profileDetail);
        revertResultLogAndStreak(player, user.profileDetail);
        revertXp(player, user.profileDetail);
        revertPoints(
          player,
          wasWinner ? game.result.winner.score : game.result.loser.score,
          user.profileDetail
        );
        revertDemonWin(
          player,
          game.result.winner.score,
          game.result.loser.score,
          user.profileDetail
        );
        revertPointDifference(
          player,
          game.result.winner.score,
          game.result.loser.score,
          wasWinner,
          user.profileDetail
        );
        revertLastActive(player, user.profileDetail);
      }
    });
  };

  processPlayers(game.result.winner.players, true);
  processPlayers(game.result.loser.players, false);

  return { playersToUpdate, usersToUpdate };
};
