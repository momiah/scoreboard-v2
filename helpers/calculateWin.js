export const calculateWin = (team1, team2, leagueType = "Singles") => {
  if (team1.score > team2.score) {
    return {
      winner: {
        team: "Team 1",
        players:
          leagueType === "Singles"
            ? [team1.player1]
            : [team1.player1, team1.player2],
        score: team1.score,
      },
      loser: {
        team: "Team 2",
        players:
          leagueType === "Singles"
            ? [team2.player1]
            : [team2.player1, team2.player2],
        score: team2.score,
      },
    };
  } else {
    return {
      winner: {
        team: "Team 2",
        players:
          leagueType === "Singles"
            ? [team2.player1]
            : [team2.player1, team2.player2],
        score: team2.score,
      },
      loser: {
        team: "Team 1",
        players:
          leagueType === "Singles"
            ? [team1.player1]
            : [team1.player1, team1.player2],
        score: team1.score,
      },
    };
  }
};
