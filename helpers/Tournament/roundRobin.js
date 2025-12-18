import { generateUniqueGameId } from "../generateUniqueId";
import moment from "moment";

export const generateSinglesRoundRobinFixtures = ({
  players,
  numberOfCourts,
  competitionId,
}) => {
  const fixtures = [];
  const numPlayers = players.length;

  if (numPlayers < 2) {
    Alert.alert("Error", "Need at least 2 players to generate fixtures");
    return null;
  }

  // Generate all possible matches
  const allMatches = [];
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      allMatches.push({
        player1: players[i],
        player2: players[j],
        player1Index: i,
        player2Index: j,
      });
    }
  }

  let allCreatedGames = [];
  let roundNumber = 1;
  let gameNumber = 1; // Add game counter
  const remainingMatches = [...allMatches];

  // Track how many rounds each player has been sitting out consecutively
  const playerConsecutiveBreaks = new Array(numPlayers).fill(0);

  while (remainingMatches.length > 0) {
    const roundGames = [];
    const playersPlayedThisRound = new Set();
    let startingCourt = ((roundNumber - 1) % numberOfCourts) + 1;
    let court = startingCourt;

    // Find players that have been sitting out the longest
    const availableMatches = remainingMatches.filter(
      (match) =>
        !playersPlayedThisRound.has(match.player1Index) &&
        !playersPlayedThisRound.has(match.player2Index)
    );

    // Sort by players with longest consecutive breaks (highest priority to play)
    availableMatches.sort((a, b) => {
      const aMaxBreaks = Math.max(
        playerConsecutiveBreaks[a.player1Index],
        playerConsecutiveBreaks[a.player2Index]
      );
      const bMaxBreaks = Math.max(
        playerConsecutiveBreaks[b.player1Index],
        playerConsecutiveBreaks[b.player2Index]
      );

      // Players with more consecutive breaks get higher priority
      return bMaxBreaks - aMaxBreaks;
    });

    // Select matches for this round
    for (const match of availableMatches) {
      if (roundGames.length >= numberOfCourts) break;

      if (
        !playersPlayedThisRound.has(match.player1Index) &&
        !playersPlayedThisRound.has(match.player2Index)
      ) {
        const game = {
          gameId: generateUniqueGameId({
            existingGames: allCreatedGames,
            competitionId: competitionId,
          }),
          gameNumber: gameNumber, // Add sequential game number
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
        gameNumber++; // Increment game counter

        playersPlayedThisRound.add(match.player1Index);
        playersPlayedThisRound.add(match.player2Index);

        // Remove this match from remaining matches
        const matchIndex = remainingMatches.findIndex(
          (m) =>
            m.player1Index === match.player1Index &&
            m.player2Index === match.player2Index
        );
        if (matchIndex !== -1) {
          remainingMatches.splice(matchIndex, 1);
        }

        court = (court % numberOfCourts) + 1;
      }
    }

    // Update consecutive break counters
    for (let i = 0; i < numPlayers; i++) {
      if (playersPlayedThisRound.has(i)) {
        playerConsecutiveBreaks[i] = 0; // Reset break counter for players that played
      } else {
        playerConsecutiveBreaks[i]++; // Increment break counter for players that didn't play
      }
    }

    if (roundGames.length > 0) {
      fixtures.push({ round: roundNumber, games: roundGames });
      roundNumber++;
    }
  }

  return { fixtures };
};

export const generateRoundRobinFixtures = ({
  teams,
  numberOfCourts,
  competitionId,
}) => {
  const fixtures = [];
  const numTeams = teams.length;

  if (numTeams < 2) {
    Alert.alert("Error", "Need at least 2 teams to generate fixtures");
    return null;
  }

  // Generate all possible matches
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
  let gameNumber = 1; // Add game counter
  const remainingMatches = [...allMatches];

  // Track how many rounds each team has been sitting out consecutively
  const teamConsecutiveBreaks = new Array(numTeams).fill(0);

  while (remainingMatches.length > 0) {
    const roundGames = [];
    const teamsPlayedThisRound = new Set();
    let startingCourt = ((roundNumber - 1) % numberOfCourts) + 1;
    let court = startingCourt;

    // Find teams that have been sitting out the longest
    const availableMatches = remainingMatches.filter(
      (match) =>
        !teamsPlayedThisRound.has(match.team1Index) &&
        !teamsPlayedThisRound.has(match.team2Index)
    );

    // Sort by teams with longest consecutive breaks (highest priority to play)
    availableMatches.sort((a, b) => {
      const aMaxBreaks = Math.max(
        teamConsecutiveBreaks[a.team1Index],
        teamConsecutiveBreaks[a.team2Index]
      );
      const bMaxBreaks = Math.max(
        teamConsecutiveBreaks[b.team1Index],
        teamConsecutiveBreaks[b.team2Index]
      );

      // Teams with more consecutive breaks get higher priority
      return bMaxBreaks - aMaxBreaks;
    });

    // Select matches for this round
    for (const match of availableMatches) {
      if (roundGames.length >= numberOfCourts) break;

      if (
        !teamsPlayedThisRound.has(match.team1Index) &&
        !teamsPlayedThisRound.has(match.team2Index)
      ) {
        const game = {
          gameId: generateUniqueGameId({
            existingGames: allCreatedGames,
            competitionId: competitionId,
          }),
          gameNumber: gameNumber, // Add sequential game number
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
        gameNumber++; // Increment game counter

        teamsPlayedThisRound.add(match.team1Index);
        teamsPlayedThisRound.add(match.team2Index);

        // Remove this match from remaining matches
        const matchIndex = remainingMatches.findIndex(
          (m) =>
            m.team1Index === match.team1Index &&
            m.team2Index === match.team2Index
        );
        if (matchIndex !== -1) {
          remainingMatches.splice(matchIndex, 1);
        }

        court = (court % numberOfCourts) + 1;
      }
    }

    // Update consecutive break counters
    for (let i = 0; i < numTeams; i++) {
      if (teamsPlayedThisRound.has(i)) {
        teamConsecutiveBreaks[i] = 0; // Reset break counter for teams that played
      } else {
        teamConsecutiveBreaks[i]++; // Increment break counter for teams that didn't play
      }
    }

    if (roundGames.length > 0) {
      fixtures.push({ round: roundNumber, games: roundGames });
      roundNumber++;
    }
  }

  return { fixtures };
};
