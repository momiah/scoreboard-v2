import { transformDate } from "./dateTransform";
import { Game } from "../types/game";
import {
  PlayersToUpdate,
  ProfileDetail,
  ScoreboardProfile,
  UsersToUpdate,
} from "../types/player";

export const calculatePlayerPerformance = (
  game: Game,
  playersToUpdate: PlayersToUpdate,
  usersToUpdate: UsersToUpdate
) => {
  const date = transformDate(game.date);

  const getTeamPlayers = (teamLabel: string | undefined) =>
    teamLabel === "Team 1"
      ? [game.team1.player1, game.team1.player2].filter(Boolean)
      : [game.team2.player1, game.team2.player2].filter(Boolean);

  const winnerPlayers = getTeamPlayers(game.result?.winner.team);
  const loserPlayers = getTeamPlayers(game.result?.loser.team);

  const getUserById = (userId: string | undefined) =>
    usersToUpdate.find((u) => u.userId === userId);
  const getParticipantById = (userId: string | undefined) =>
    playersToUpdate.find((p) => p.userId === userId);

  const combinedWinnerXp = winnerPlayers.reduce((sum, player) => {
    const user = getUserById(player?.userId);
    return user ? sum + (user.profileDetail?.XP || 0) : sum;
  }, 0);

  const combinedLoserXp = loserPlayers.reduce((sum, player) => {
    const user = getUserById(player?.userId);
    return user ? sum + (user.profileDetail?.XP || 0) : sum;
  }, 0);

  const updatePlayerStats = (
    player: ScoreboardProfile,
    isWinner: boolean,
    user: ProfileDetail
  ) => {
    player.numberOfGamesPlayed += 1;
    user.numberOfGamesPlayed += 1;

    if (isWinner) {
      player.numberOfWins += 1;
      user.numberOfWins += 1;
    } else {
      player.numberOfLosses += 1;
      user.numberOfLosses += 1;
    }

    player.winPercentage =
      (player.numberOfWins / player.numberOfGamesPlayed) * 100;
    user.winPercentage = (user.numberOfWins / user.numberOfGamesPlayed) * 100;

    return { player, user };
  };

  const updatePlayerResultLogAndStreak = (
    player: ScoreboardProfile,
    isWinner: boolean,
    user: ProfileDetail
  ) => {
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

      highestWinStreak = Math.max(highestWinStreak, player.currentStreak.count);
    } else {
      if (lastResult === "L") {
        player.currentStreak.count -= 1;
      } else {
        player.currentStreak.type = "L";
        player.currentStreak.count = -1;
      }

      highestLossStreak = Math.min(
        highestLossStreak,
        player.currentStreak.count
      );
    }

    player.highestWinStreak = highestWinStreak;
    player.highestLossStreak = Math.abs(highestLossStreak);
    player.winStreak3 = winStreak3;
    player.winStreak5 = winStreak5;
    player.winStreak7 = winStreak7;

    user.highestWinStreak = highestWinStreak;
    user.highestLossStreak = Math.abs(highestLossStreak);
    user.winStreak3 = winStreak3;
    user.winStreak5 = winStreak5;
    user.winStreak7 = winStreak7;

    return { player, user };
  };

  interface XpUpdateResult {
    player: ScoreboardProfile;
    user: ProfileDetail;
  }

  const updateXp = (
    player: ScoreboardProfile,
    user: ProfileDetail,
    streakType: string | null,
    streakCount: number,
    combinedWinnerXp: number,
    combinedLoserXp: number,
    winnerScore: number,
    loserScore: number
  ): XpUpdateResult => {
    const baseXP = streakType === "W" ? 20 : -15;
    const scoreDifference = winnerScore - loserScore;

    const differenceMultiplier =
      combinedWinnerXp > 0 ? combinedLoserXp / combinedWinnerXp : 1;

    const rankMultiplier =
      differenceMultiplier < 2
        ? 0
        : differenceMultiplier > 3
        ? 3
        : differenceMultiplier;

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

    const rankXpValue = streakXp * rankMultiplier;
    const rankXp = isNaN(rankXpValue) ? 0 : rankXpValue;

    let demonBonus = 0;
    if (scoreDifference >= 10) {
      demonBonus = streakType === "W" ? streakXp : -streakXp;
    }

    const finalXp = streakXp + rankXp + demonBonus;

    user.XP += finalXp;
    player.prevGameXP = finalXp;

    if (user.XP < 20) {
      user.XP = 20;
    }

    return { player, user };
  };

  const updatePlayerTotalPoints = (
    player: ScoreboardProfile,
    points: number | undefined,
    user: ProfileDetail
  ) => {
    player.totalPoints += points ?? 0;
    user.totalPoints += points ?? 0;
    return { player, user };
  };

  const updateDemonWin = (
    player: ScoreboardProfile,
    winnerGameScore: number,
    loserGameScore: number,
    user: ProfileDetail
  ) => {
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

  const updateLastActive = (
    player: ScoreboardProfile,
    gameDate: string,
    user: ProfileDetail
  ) => {
    player.lastActive = gameDate;
    user.lastActive = gameDate;
    return { player, user };
  };

  interface CalculatePointDifferenceResult {
    player: ScoreboardProfile;
    user: ProfileDetail;
  }

  const calculatePointDifference = (
    player: ScoreboardProfile,
    winnerScore: number | undefined,
    loserScore: number | undefined,
    isWinner: boolean,
    user: ProfileDetail
  ): CalculatePointDifferenceResult => {
    const pointDifference = (winnerScore ?? 0) - (loserScore ?? 0);
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
      (sum: number, pd: number) => sum + pd,
      0
    );
    const averagePointDifference = Math.round(
      tenGamesPointDifference / player.pointDifferenceLog.length
    );

    player.averagePointDifference = averagePointDifference;

    return { player, user };
  };

  // --- Update stats for winners ---
  winnerPlayers.forEach((player) => {
    const leagueParticipant = getParticipantById(player?.userId);
    const user = getUserById(player?.userId);

    if (leagueParticipant && user) {
      updatePlayerStats(leagueParticipant, true, user.profileDetail);
      updatePlayerTotalPoints(
        leagueParticipant,
        game.result?.winner.score,
        user.profileDetail
      );
      updatePlayerResultLogAndStreak(
        leagueParticipant,
        true,
        user.profileDetail
      );
      updateXp(
        leagueParticipant,
        user.profileDetail,
        leagueParticipant.currentStreak.type,
        leagueParticipant.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp,
        game.result?.winner.score ?? 0,
        game.result?.loser.score ?? 0
      );
      updateDemonWin(
        leagueParticipant,
        game.result?.winner.score ?? 0,
        game.result?.loser.score ?? 0,
        user.profileDetail
      );
      updateLastActive(leagueParticipant, date, user.profileDetail);
      calculatePointDifference(
        leagueParticipant,
        game.result?.winner.score,
        game.result?.loser.score,
        true,
        user.profileDetail
      );
    }
  });

  // --- Update stats for losers ---
  loserPlayers.forEach((player) => {
    const leagueParticipant = getParticipantById(player?.userId);
    const user = getUserById(player?.userId);

    if (leagueParticipant && user) {
      updatePlayerStats(leagueParticipant, false, user.profileDetail);
      updatePlayerTotalPoints(
        leagueParticipant,
        game.result?.loser.score,
        user.profileDetail
      );
      updatePlayerResultLogAndStreak(
        leagueParticipant,
        false,
        user.profileDetail
      );
      updateXp(
        leagueParticipant,
        user.profileDetail,
        leagueParticipant.currentStreak.type,
        leagueParticipant.currentStreak.count,
        combinedWinnerXp,
        combinedLoserXp,
        game.result?.winner.score ?? 0,
        game.result?.loser.score ?? 0
      );
      updateLastActive(leagueParticipant, date, user.profileDetail);
      calculatePointDifference(
        leagueParticipant,
        game.result?.winner.score,
        game.result?.loser.score,
        false,
        user.profileDetail
      );
    }
  });

  return { playersToUpdate, usersToUpdate };
};
