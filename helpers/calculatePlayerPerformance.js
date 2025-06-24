import { use } from "react";
import { transformDate } from "./dateTransform";

export const calculatePlayerPerformance = (
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
      if (user) {
        return totalXp + user.profileDetail.XP;
      }
      return totalXp;
    },
    0
  );

  const combinedLoserXp = game.result.loser.players.reduce(
    (totalXp, playerUsername) => {
      const user = getUserByUsername(playerUsername);
      if (user) {
        return totalXp + user.profileDetail.XP;
      }
      return totalXp;
    },
    0
  );

  const updatePlayerStats = (player, isWinner, user) => {
    player.numberOfGamesPlayed += 1;
    user.numberOfGamesPlayed += 1;

    if (isWinner) {
      player.numberOfWins += 1;
      user.numberOfWins += 1;
    } else {
      player.numberOfLosses += 1;
      user.numberOfLosses += 1;
    }

    // Calculate win percentage if needed
    player.winPercentage =
      (player.numberOfWins / player.numberOfGamesPlayed) * 100;
    user.winPercentage = (user.numberOfWins / user.numberOfGamesPlayed) * 100;

    return { player, user };
  };

  const updatePlayerResultLogAndStreak = (player, isWinner, user) => {
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

    // Update the user's stats
    user.highestWinStreak = highestWinStreak;
    user.highestLossStreak = Math.abs(highestLossStreak);
    user.winStreak3 = winStreak3;
    user.winStreak5 = winStreak5;
    user.winStreak7 = winStreak7;

    return { player, user };
  };

  const updateXp = (
    player,
    user,
    streakType,
    streakCount,
    combinedWinnerXp,
    combinedLoserXp,
    winnerScore,
    loserScore
  ) => {
    // console.log("=== XP Calculation Debug ===");
    // console.log("Player:", player.username);
    // console.log("Streak Type:", streakType);
    // console.log("Streak Count:", streakCount);
    // console.log("Score Difference:", winnerScore - loserScore);

    const baseXP = streakType === "W" ? 20 : -15;

    // Calculate the difference in scores
    const scoreDifference = winnerScore - loserScore;

    const differenceMultiplier =
      combinedWinnerXp > 0 ? combinedLoserXp / combinedWinnerXp : 1;

    // Cap the rank multiplier between 0 and 10
    const rankMultiplier =
      differenceMultiplier < 2
        ? 0
        : differenceMultiplier > 4
        ? 4
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
        ? 5
        : streakCount >= 5
        ? 4
        : streakCount >= 3
        ? 3
        : streakCount > 1
        ? 2
        : 1;

    const multiplier = streakType === "W" ? winMultiplier : lossMultiplier;
    const streakXp = baseXP * multiplier;

    // Calculate rank XP
    const rankXpValue = streakXp * rankMultiplier;
    const rankXp = isNaN(rankXpValue) ? 0 : rankXpValue;

    // Calculate demon win bonus (doubles the streak XP for wins with 10+ point difference)
    let demonWinBonus = 0;
    if (streakType === "W" && scoreDifference >= 10) {
      demonWinBonus = streakXp; // Double the streak XP only
    }

    // Final XP calculation
    const finalXp = streakXp + rankXp + demonWinBonus;

    // console.log("Streak XP:", streakXp);
    // console.log("Rank XP:", rankXp);
    // console.log("Demon Win Bonus:", demonWinBonus);
    // console.log("Final XP:", finalXp);
    // console.log("User XP before:", user.XP);
    // console.log("User XP after:", user.XP + finalXp);

    // Update the player's XP
    user.XP += finalXp;
    player.prevGameXP = finalXp;

    // Ensure the player's XP doesn't drop below 10
    if (user.XP < 10) {
      user.XP = 10;
    }

    return { player, user };
  };

  const updatePlayerTotalPoints = (player, points, user) => {
    player.totalPoints += points;
    user.totalPoints += points;
    return { player, user };
  };

  const updateDemonWin = (player, winnerGameScore, loserGameScore, user) => {
    let demonWin = player.demonWin || 0;
    let userDemonWin = user.demonWin || 0;

    if (winnerGameScore - loserGameScore >= 10) {
      demonWin += 1;
      userDemonWin += 1;
      player.demonWin = demonWin;
      user.demonWin = userDemonWin;
    }
    return { player, user };
  };

  const updateLastActive = (player, gameDate, user) => {
    player.lastActive = gameDate;
    user.lastActive = gameDate;

    return { player, user };
  };

  const calculatePointDifference = (
    player,
    winnerScore,
    loserScore,
    isWinner,
    user
  ) => {
    const pointDifference = winnerScore - loserScore;

    const adjustedPointDifference = isWinner
      ? pointDifference
      : -pointDifference;

    if (!player.pointDifferenceLog) {
      player.pointDifferenceLog = [];
    }

    if (!player.totalPointDifference) {
      player.totalPointDifference = 0;
    }

    if (!user.totalPointDifference) {
      user.totalPointDifference = 0;
    }

    player.totalPointDifference += adjustedPointDifference;
    user.totalPointDifference += adjustedPointDifference;

    player.pointDifferenceLog.push(adjustedPointDifference);

    player.pointDifferenceLog = player.pointDifferenceLog.slice(-10);

    const tenGamesPointDifference = player.pointDifferenceLog.reduce(
      (sum, pd) => sum + pd,
      0
    );
    const averagePointDifference = Math.round(
      tenGamesPointDifference / player.pointDifferenceLog.length
    );

    player.averagePointDifference = averagePointDifference;
  };

  // Update stats for winning players
  game.result.winner.players.forEach((winnerId) => {
    const player = playersToUpdate.find((p) => p.username === winnerId);
    const user = usersToUpdate.find((u) => u.userId === player.userId);

    // console.log("user to be updated for a win", user);

    if (player && user) {
      updatePlayerStats(player, true, user.profileDetail);
      updatePlayerTotalPoints(
        player,
        game.result.winner.score,
        user.profileDetail
      );
      updatePlayerResultLogAndStreak(player, true, user.profileDetail);
      updateXp(
        player,
        user.profileDetail,
        player.currentStreak.type,
        player.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp,
        game.result.winner.score,
        game.result.loser.score // ← Use game.result.loser.score
      );
      updateDemonWin(
        player,
        game.result.winner.score,
        game.result.loser.score,
        user.profileDetail
      );
      updateLastActive(player, date, user.profileDetail);
      calculatePointDifference(
        player,
        game.result.winner.score,
        game.result.loser.score,
        true,
        user.profileDetail
      );
    }
  });

  // Update stats for losing players
  game.result.loser.players.forEach((loserId) => {
    const player = playersToUpdate.find((p) => p.username === loserId);
    const user = usersToUpdate.find((u) => u.userId === player.userId);

    // console.log("user to be updated for a loss", user);

    if (player && user) {
      updatePlayerStats(player, false, user.profileDetail);
      updatePlayerTotalPoints(
        player,
        game.result.loser.score,
        user.profileDetail
      );
      updatePlayerResultLogAndStreak(player, false, user.profileDetail);
      updateXp(
        player,
        user.profileDetail,
        player.currentStreak.type,
        player.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp,
        game.result.winner.score,
        game.result.loser.score // ← Use game.result.loser.score
      );
      updateLastActive(player, date, user.profileDetail);
      calculatePointDifference(
        player,
        game.result.winner.score,
        game.result.loser.score,
        false,
        user.profileDetail
      );
    }
  });
  return { playersToUpdate, usersToUpdate };
};
