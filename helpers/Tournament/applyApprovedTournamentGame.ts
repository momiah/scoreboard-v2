import {
  Fixtures,
  Game,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "@shared/types";
import {
  advanceBrackets,
  calculatePlayerPerformance,
  calculateTeamPerformance,
  getGamePlayerIds,
  getOrderedApprovedGames,
  recalculateParticipantsFromFixtures,
} from "@shared/helpers";

// Scores one fully approved tournament game whose approval is already in
// `tournament.fixtures`: knockouts apply the game and advance the bracket,
// round robins replay every approved fixture.
export const applyApprovedTournamentGame = async ({
  tournament,
  game,
  users,
}: {
  tournament: {
    fixtures: Fixtures[];
    tournamentParticipants?: ScoreboardProfile[];
    tournamentTeams?: TeamStats[];
    tournamentType?: string;
    tournamentMode?: string;
    numberOfCourts?: number;
  };
  game: Game;
  users: UserProfile[];
}): Promise<{
  fixtures: Fixtures[];
  participants: ScoreboardProfile[];
  teams: TeamStats[];
  usersToUpdate: UserProfile[];
}> => {
  const participants = tournament.tournamentParticipants ?? [];
  const teams = tournament.tournamentTeams ?? [];
  const isDoubles = tournament.tournamentType === "Doubles";
  const playerIds = getGamePlayerIds(game);
  const gameParticipants = participants.filter((p) =>
    playerIds.includes(p.userId!),
  );

  if (tournament.tournamentMode === "Knockout") {
    const { playersToUpdate, usersToUpdate } = calculatePlayerPerformance(
      game,
      gameParticipants,
      users,
    );
    let updatedTeams = teams;
    if (isDoubles) {
      const [winnerTeam, loserTeam] = await calculateTeamPerformance({
        game,
        allTeams: teams,
      });
      updatedTeams = teams.map((team) => {
        if (team.teamKey === winnerTeam.teamKey) return winnerTeam;
        if (team.teamKey === loserTeam.teamKey) return loserTeam;
        return team;
      });
    }
    return {
      fixtures: advanceBrackets({
        fixtures: tournament.fixtures,
        numberOfCourts: tournament.numberOfCourts || 1,
      }),
      participants: participants.map(
        (p) => playersToUpdate.find((u) => u.userId === p.userId) ?? p,
      ),
      teams: updatedTeams,
      usersToUpdate: usersToUpdate ?? [],
    };
  }

  const { updatedParticipants, updatedTeams } =
    await recalculateParticipantsFromFixtures(
      getOrderedApprovedGames(tournament.fixtures),
      participants,
      teams,
      isDoubles,
    );
  const { usersToUpdate } = calculatePlayerPerformance(
    game,
    gameParticipants,
    users,
  );
  return {
    fixtures: tournament.fixtures,
    participants: updatedParticipants,
    teams: updatedTeams,
    usersToUpdate: usersToUpdate ?? [],
  };
};
