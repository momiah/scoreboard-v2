import {
  Fixtures,
  Game,
  ScoreboardProfile,
  UserProfile,
  TeamStats,
} from "@shared/types";
import { calculatePlayerPerformance, calculateTeamPerformance } from "./index";

export const getOrderedApprovedGames = (fixtures: Fixtures[]): Game[] => {
  return fixtures
    .slice()
    .sort((a, b) => a.round - b.round)
    .flatMap((fixture) =>
      fixture.games
        .slice()
        .sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0))
        .filter((game) => game.approvalStatus === "approved"),
    );
};

export const recalculateParticipantsFromFixtures = async (
  orderedApprovedGames: Game[],
  allParticipants: ScoreboardProfile[],
  allUsers: UserProfile[],
  allTeams: TeamStats[],
  isDoubles: boolean,
): Promise<{
  updatedParticipants: ScoreboardProfile[];
  updatedTeams: TeamStats[];
  updatedUsers: UserProfile[];
}> => {
  const resetParticipants: ScoreboardProfile[] = allParticipants.map(
    (participant) => ({
      ...participant,
      numberOfWins: 0,
      numberOfLosses: 0,
      numberOfGamesPlayed: 0,
      totalPoints: 0,
      totalPointDifference: 0,
      averagePointDifference: 0,
      pointDifferenceLog: [] as number[],
      resultLog: [] as string[],
      currentStreak: { type: null, count: 0 },
      highestWinStreak: 0,
      highestLossStreak: 0,
      winPercentage: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      demonWin: 0,
      prevGameXP: 0,
    }),
  );

  const resetTeams: TeamStats[] = allTeams.map((team) => ({
    ...team,
    numberOfWins: 0,
    numberOfLosses: 0,
    numberOfGamesPlayed: 0,
    totalPointDifference: 0,
    averagePointDifference: 0,
    pointDifferenceLog: [] as number[],
    resultLog: [] as string[],
    currentStreak: 0,
    highestWinStreak: 0,
    highestLossStreak: 0,
    winStreak3: 0,
    winStreak5: 0,
    winStreak7: 0,
    demonWin: 0,
    lossesTo: {},
    rival: null,
  }));

  const participantMap = new Map(
    resetParticipants.map((p) => [p.userId, { ...p }]),
  );

  const teamMap = new Map(resetTeams.map((t) => [t.teamKey, { ...t }]));

  const updatedUserMap = new Map(allUsers.map((u) => [u.userId, { ...u }]));

  for (const game of orderedApprovedGames) {
    const playerUserIds = [
      game.team1.player1?.userId,
      game.team1.player2?.userId,
      game.team2.player1?.userId,
      game.team2.player2?.userId,
    ].filter((id): id is string => Boolean(id));

    const gamePlayers = playerUserIds
      .map((uid) => participantMap.get(uid))
      .filter((p): p is ScoreboardProfile => !!p);

    const gameUsers = playerUserIds
      .map((uid) => updatedUserMap.get(uid))
      .filter((u): u is UserProfile => !!u);

    const { playersToUpdate, usersToUpdate } = calculatePlayerPerformance(
      game,
      gamePlayers,
      gameUsers,
    );

    playersToUpdate.forEach((updated) => {
      if (updated.userId) participantMap.set(updated.userId, updated);
    });

    usersToUpdate?.forEach((updated) => {
      if (updated.userId) updatedUserMap.set(updated.userId, updated);
    });

    if (isDoubles) {
      const currentTeams = Array.from(teamMap.values());
      const [updatedWinnerTeam, updatedLoserTeam] =
        await calculateTeamPerformance({
          game,
          allTeams: currentTeams,
        });
      teamMap.set(updatedWinnerTeam.teamKey, updatedWinnerTeam);
      teamMap.set(updatedLoserTeam.teamKey, updatedLoserTeam);
    }
  }

  return {
    updatedParticipants: Array.from(participantMap.values()),
    updatedTeams: Array.from(teamMap.values()),
    updatedUsers: Array.from(updatedUserMap.values()),
  };
};
