import { ScoreboardProfile, TeamStats } from "../types";

export const sortPlayersByPlacement = (
  participants: ScoreboardProfile[],
): ScoreboardProfile[] =>
  [...(participants || [])]
    .filter((participant) => (participant.numberOfWins || 0) > 0)
    .sort((a, b) => {
      if ((b.numberOfWins || 0) !== (a.numberOfWins || 0)) {
        return (b.numberOfWins || 0) - (a.numberOfWins || 0);
      }
      return (b.totalPointDifference || 0) - (a.totalPointDifference || 0);
    });

export const sortTeamsByPlacement = (teams: TeamStats[]): TeamStats[] =>
  [...(teams || [])]
    .filter((team) => (team.numberOfWins || 0) > 0)
    .sort((a, b) => {
      if ((b.numberOfWins || 0) !== (a.numberOfWins || 0)) {
        return (b.numberOfWins || 0) - (a.numberOfWins || 0);
      }
      return (b.totalPointDifference || 0) - (a.totalPointDifference || 0);
    });

export const getPlayerRankInCompetition = (
  participants: ScoreboardProfile[],
  userId: string,
): number => {
  const sorted = sortPlayersByPlacement(participants);
  const rank =
    sorted.findIndex((participant) => participant.userId === userId) + 1;
  return rank > 0 ? rank : 0;
};

export const getTeamRankInCompetition = (
  teams: TeamStats[],
  userId: string,
): number => {
  const sorted = sortTeamsByPlacement(teams);
  const rank = sorted.findIndex((team) => team.teamKey?.includes(userId)) + 1;
  return rank > 0 ? rank : 0;
};
