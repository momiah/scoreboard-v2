import { generateUniqueGameId } from "../generateUniqueId";
import moment from "moment";

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

  const allMatches = [];
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      allMatches.push({
        player1: players[i],
        player2: players[j],
      });
    }
  }

  let allCreatedGames = [];

  let roundNumber = 1;
  let gameCounter = 0;

  while (gameCounter < allMatches.length) {
    const roundGames = [];

    for (
      let court = 1;
      court <= numberOfCourts && gameCounter < allMatches.length;
      court++
    ) {
      const match = allMatches[gameCounter];

      const game = {
        gameId: generateUniqueGameId(allCreatedGames),
        team1: { player1: match.player1, player2: null },
        team2: { player1: match.player2, player2: null },
        court: court,
        gamescore: "",
        createdAt: new Date(),
        reportedAt: "",
        createdTime: moment().format("HH:mm"),
        reportedTime: "",
        approvalStatus: "Pending",
        status: "Scheduled",
        result: null,
      };

      roundGames.push(game);
      allCreatedGames.push(game);
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

  const allMatches = [];
  for (let i = 0; i < numTeams; i++) {
    for (let j = i + 1; j < numTeams; j++) {
      allMatches.push({
        team1: teams[i],
        team2: teams[j],
        team1Index: i,
        team2Index: j,
      });
    }
  }

  let allCreatedGames = [];

  let roundNumber = 1;
  const remainingMatches = [...allMatches];

  while (remainingMatches.length > 0) {
    const roundGames = [];
    const teamsPlayedThisRound = new Set();

    let startingCourt = ((roundNumber - 1) % numberOfCourts) + 1;
    let court = startingCourt;

    for (
      let i = 0;
      i < remainingMatches.length && roundGames.length < numberOfCourts;
      i++
    ) {
      const match = remainingMatches[i];

      if (
        !teamsPlayedThisRound.has(match.team1Index) &&
        !teamsPlayedThisRound.has(match.team2Index)
      ) {
        const game = {
          gameId: generateUniqueGameId(allCreatedGames),
          team1: { player1: match.team1.player1, player2: match.team1.player2 },
          team2: { player1: match.team2.player1, player2: match.team2.player2 },
          court: court,
          gamescore: "",
          createdAt: new Date(),
          reportedAt: "",
          reportedTime: "",
          createdTime: moment().format("HH:mm"),
          approvalStatus: "Pending",
          status: "Scheduled",
          result: null,
        };

        roundGames.push(game);
        allCreatedGames.push(game);

        teamsPlayedThisRound.add(match.team1Index);
        teamsPlayedThisRound.add(match.team2Index);

        remainingMatches.splice(i, 1);
        i--; // Adjust index after removal

        // Rotate to next court
        court = (court % numberOfCourts) + 1;
      }
    }

    if (roundGames.length > 0) {
      fixtures.push({ round: roundNumber, games: roundGames });
      roundNumber++;
    }
  }

  return { fixtures };
};
