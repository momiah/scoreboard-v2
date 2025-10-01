import { formatTeam } from "./formatTeam";

export const calculateWin = (team1, team2, leagueType = "Singles") => {
  const team1Wins = team1.score > team2.score;

  const winnerTeam = team1Wins ? team1 : team2;
  const winnerPlayers = formatTeam(winnerTeam, leagueType);

  const loserTeam = team1Wins ? team2 : team1;
  const loserPlayers = formatTeam(loserTeam, leagueType);

  return {
    winner: {
      team: team1Wins ? "Team 1" : "Team 2",
      players: winnerPlayers,
      score: winnerTeam.score,
    },
    loser: {
      team: team1Wins ? "Team 2" : "Team 1",
      players: loserPlayers,
      score: loserTeam.score,
    },
  };
};
