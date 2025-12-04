export const generateSinglesRoundRobinFixtures = ({
  players,
  numberOfCourts,
}) => {
  const fixtures = [];
  const numPlayers = players.length;

  if (numPlayers < 2) {
    Alert.alert("Error", "Need at least 2 players to generate fixtures");
    return null;
  }

  // Generate all possible pairings first
  const allMatches = [];
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      allMatches.push({
        player1: players[i],
        player2: players[j],
      });
    }
  }

  // Distribute matches across rounds based on available courts
  let roundNumber = 1;
  let gameCounter = 0;

  while (gameCounter < allMatches.length) {
    const roundGames = [];

    // Fill this round with as many matches as we have courts
    for (
      let court = 1;
      court <= numberOfCourts && gameCounter < allMatches.length;
      court++
    ) {
      const match = allMatches[gameCounter];

      roundGames.push({
        gameId: `game_${roundNumber}_${court}`,
        team1: { player1: match.player1, player2: null },
        team2: { player1: match.player2, player2: null },
        court: court,
        scheduledDate: "",
        approvalStatus: "Pending",
        status: "Scheduled",
        result: null,
      });

      gameCounter++;
    }

    fixtures.push({ round: roundNumber, games: roundGames });
    roundNumber++;
  }

  return { fixtures };
};

export const generateRoundRobinFixtures = ({ teams, numberOfCourts }) => {
  const fixtures = [];
  const numTeams = teams.length;

  if (numTeams < 2) {
    Alert.alert("Error", "Need at least 2 teams to generate fixtures");
    return null;
  }

  // Generate all possible team pairings first
  const allMatches = [];
  for (let i = 0; i < numTeams; i++) {
    for (let j = i + 1; j < numTeams; j++) {
      allMatches.push({
        team1: teams[i],
        team2: teams[j],
      });
    }
  }

  // Distribute matches across rounds based on available courts
  let roundNumber = 1;
  let gameCounter = 0;

  while (gameCounter < allMatches.length) {
    const roundGames = [];

    // Fill this round with as many matches as we have courts
    for (
      let court = 1;
      court <= numberOfCourts && gameCounter < allMatches.length;
      court++
    ) {
      const match = allMatches[gameCounter];

      roundGames.push({
        gameId: `game_${roundNumber}_${court}`,
        team1: { player1: match.team1.player1, player2: match.team1.player2 },
        team2: { player1: match.team2.player1, player2: match.team2.player2 },
        court: court,
        scheduledDate: "",
        approvalStatus: "Pending",
        status: "Scheduled",
        result: null,
      });

      gameCounter++;
    }

    fixtures.push({ round: roundNumber, games: roundGames });
    roundNumber++;
  }

  return { fixtures };
};
