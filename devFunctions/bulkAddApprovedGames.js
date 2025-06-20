import moment from "moment";
import { generateUniqueGameId } from "../helpers/generateUniqueId";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import { calculatePlayerPerformance } from "../helpers/calculatePlayerPerformance";
import { calculateTeamPerformance } from "../helpers/calculateTeamPerformance";

// Helper function to get user by ID (similar to your UserContext)
const getUserById = async (userId) => {
  try {
    if (!userId) return null;
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      console.error("No user found with the given ID.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
};

// Helper function to retrieve teams from league (similar to your UserContext)
const retrieveTeams = async (leagueId) => {
  try {
    const leagueCollectionRef = collection(db, "leagues");
    const leagueDocRef = doc(leagueCollectionRef, leagueId);
    const leagueDoc = await getDoc(leagueDocRef);
    const leagueTeams = leagueDoc.data().leagueTeams;
    return leagueTeams || [];
  } catch (error) {
    console.error("Error retrieving teams:", error);
    return [];
  }
};

// Helper function to update players (similar to your UserContext)
const updatePlayers = async (updatedPlayers, leagueId) => {
  if (updatedPlayers.length === 0) {
    console.log("No players to update!");
    return;
  }

  try {
    const leagueDocRef = doc(db, "leagues", leagueId);
    const leagueDoc = await getDoc(leagueDocRef);

    if (!leagueDoc.exists()) {
      console.log("League not found!");
      return;
    }

    const leagueData = leagueDoc.data();
    const existingPlayers = leagueData.leagueParticipants || [];

    const updatedParticipants = existingPlayers.map((player) => {
      const updatedPlayer = updatedPlayers.find(
        (p) => p.username === player.username
      );
      return updatedPlayer ? { ...player, ...updatedPlayer } : player;
    });

    await updateDoc(leagueDocRef, {
      leagueParticipants: updatedParticipants,
    });
  } catch (error) {
    console.error("Error updating player data:", error);
  }
};

// Helper function to update users (similar to your UserContext)
const updateUsers = async (usersToUpdate) => {
  try {
    const updatePromises = usersToUpdate.map(async (user) => {
      const userRef = doc(db, "users", user.userId);
      await updateDoc(userRef, {
        profileDetail: user.profileDetail,
      });
    });
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error updating users:", error);
  }
};

// Helper function to update teams (similar to your UserContext)
const updateTeams = async (updatedTeams, leagueId) => {
  if (updatedTeams.length === 0) {
    console.error("No teams to update!");
    return;
  }

  try {
    const leagueDocRef = doc(db, "leagues", leagueId);
    const leagueDoc = await getDoc(leagueDocRef);

    if (!leagueDoc.exists()) {
      console.error("League not found!");
      return;
    }

    const leagueData = leagueDoc.data();
    const existingTeams = leagueData.leagueTeams || [];

    const updatedTeamsArray = existingTeams.map((team) => {
      const updatedTeam = updatedTeams.find((t) => t.teamKey === team.teamKey);
      return updatedTeam ? { ...team, ...updatedTeam } : team;
    });

    const newTeams = updatedTeams.filter(
      (updatedTeam) =>
        !existingTeams.some((team) => team.teamKey === updatedTeam.teamKey)
    );

    const finalTeamsArray = [...updatedTeamsArray, ...newTeams];

    await updateDoc(leagueDocRef, { leagueTeams: finalTeamsArray });
  } catch (error) {
    console.error("Error updating team data:", error);
  }
};

export const bulkAddApprovedGames = async (gameObjects, leagueId) => {
  try {
    if (!gameObjects || gameObjects.length === 0) {
      console.log("No games provided to add");
      return { success: false, message: "No games provided" };
    }

    if (!leagueId) {
      console.log("No leagueId provided");
      return { success: false, message: "No leagueId provided" };
    }

    console.log(
      `Starting bulk add of ${gameObjects.length} games to league: ${leagueId}`
    );

    // Step 1: Get the league document
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueDoc = await getDoc(leagueRef);

    if (!leagueDoc.exists()) {
      console.error("League not found");
      return { success: false, message: "League not found" };
    }

    const leagueData = leagueDoc.data();
    const existingGames = leagueData.games || [];
    let currentLeagueParticipants = leagueData.leagueParticipants || [];

    if (currentLeagueParticipants.length === 0) {
      console.log("No participants found in the league");
      return { success: false, message: "No participants found in league" };
    }

    // Step 2: Process each game sequentially
    const processedGames = [];
    let successfulGames = 0;
    let failedGames = 0;

    for (let i = 0; i < gameObjects.length; i++) {
      const game = gameObjects[i];

      try {
        console.log(
          `Processing game ${i + 1}/${gameObjects.length}: ${game.gameId}`
        );

        // Ensure the game is marked as approved
        const approvedGame = {
          ...game,
          approvalStatus: "approved",
          numberOfApprovals: 1,
          numberOfDeclines: 0,
        };

        // Step 3: Calculate performance updates for this game
        const playersToUpdate = currentLeagueParticipants.filter((player) =>
          approvedGame.result.winner.players
            .concat(approvedGame.result.loser.players)
            .includes(player.username)
        );

        if (playersToUpdate.length === 0) {
          console.warn(`No matching players found for game ${game.gameId}`);
          failedGames++;
          continue;
        }

        const userIds = playersToUpdate.map((player) => player.userId);
        const usersToUpdate = await Promise.all(userIds.map(getUserById));

        // Calculate player performance
        const playerPerformance = calculatePlayerPerformance(
          approvedGame,
          playersToUpdate,
          usersToUpdate
        );

        // Update league participants in memory for next iteration
        currentLeagueParticipants = currentLeagueParticipants.map((player) => {
          const updatedPlayer = playerPerformance.playersToUpdate.find(
            (p) => p.username === player.username
          );
          return updatedPlayer ? { ...player, ...updatedPlayer } : player;
        });

        // Update users' personal profiles
        await updateUsers(playerPerformance.usersToUpdate);

        // Calculate and update team performance
        const teamsToUpdate = await calculateTeamPerformance(
          approvedGame,
          retrieveTeams,
          leagueId
        );

        await updateTeams(teamsToUpdate, leagueId);

        // Add the game to processed games
        processedGames.push(approvedGame);
        successfulGames++;

        console.log(`✅ Successfully processed game ${i + 1}: ${game.gameId}`);
      } catch (error) {
        console.error(`❌ Failed to process game ${game.gameId}:`, error);
        failedGames++;
      }
    }

    // Step 4: Update the league with all the new games and final participant stats
    const updatedGames = [...existingGames, ...processedGames];

    await updateDoc(leagueRef, {
      games: updatedGames,
      leagueParticipants: currentLeagueParticipants,
    });

    console.log(`\n=== BULK ADD GAMES SUMMARY ===`);
    console.log(`✅ Successfully processed: ${successfulGames} games`);
    console.log(`❌ Failed to process: ${failedGames} games`);
    console.log(`📊 Total games in league: ${updatedGames.length}`);
    console.log(
      `👥 Updated ${currentLeagueParticipants.length} league participants`
    );

    return {
      success: true,
      leagueId,
      totalRequested: gameObjects.length,
      totalSuccessful: successfulGames,
      totalFailed: failedGames,
      processedGames: processedGames.map((g) => ({
        gameId: g.gameId,
        gamescore: g.gamescore,
        date: g.date,
      })),
    };
  } catch (error) {
    console.error("Error in bulkAddApprovedGames:", error);
    return {
      success: false,
      message: "Function execution failed",
      error: error.message,
    };
  }
};

// Usage example:
// import { bulkAddApprovedGames } from "../../devFunctions/bulkAddApprovedGames";
// import { leagueGames } from "../../devFunctions/leagueGamesData";
//
// const leagueId = "your-league-id";
// const result = await bulkAddApprovedGames(leagueGames, leagueId);
// console.log("Bulk add result:", result);

// Helper function to calculate win (you'll need to import this from your existing code)
const calculateWin = (team1, team2) => {
  if (team1.score > team2.score) {
    return {
      winner: {
        team: "Team 1",
        players: [team1.player1, team1.player2].filter(Boolean),
        score: team1.score,
      },
      loser: {
        team: "Team 2",
        players: [team2.player1, team2.player2].filter(Boolean),
        score: team2.score,
      },
    };
  } else {
    return {
      winner: {
        team: "Team 2",
        players: [team2.player1, team2.player2].filter(Boolean),
        score: team2.score,
      },
      loser: {
        team: "Team 1",
        players: [team1.player1, team1.player2].filter(Boolean),
        score: team1.score,
      },
    };
  }
};

// Create the game objects based on the screenshots (in sequential order from top to bottom)
// We'll generate unique IDs for each game
const createLeagueGames = () => {
  const games = [];
  const gameData = [
    // Game 1: Max & Babu (21) vs Rayyan & Gesh (18)
    {
      gamescore: "21 - 18",
      team1: { player1: "MaxHoque", player2: "Babu", score: 21 },
      team2: { player1: "R4YY4NH", player2: "Gesh", score: 18 },
    },
    // Game 2: Saiful & Raqeeb (19) vs Yasin & Anis (21)
    {
      gamescore: "19 - 21",
      team1: { player1: "Saiful", player2: "Raqeeb", score: 19 },
      team2: { player1: "Yasin", player2: "AnisZaman", score: 21 },
    },
    // Game 3: Mohsin & Hussein (21) vs Bokul & Doc (18)
    {
      gamescore: "21 - 18",
      team1: { player1: "ProLikeMo", player2: "Hussain", score: 21 },
      team2: { player1: "Bokul", player2: "Komal", score: 18 },
    },
    // Game 4: Max & Babu (21) vs Saiful & Raqeeb (15)
    {
      gamescore: "21 - 15",
      team1: { player1: "MaxHoque", player2: "Babu", score: 21 },
      team2: { player1: "Saiful", player2: "Raqeeb", score: 15 },
    },
    // Game 5: Rayyan & Gesh (21) vs Mohsin & Hussein (14)
    {
      gamescore: "21 - 14",
      team1: { player1: "R4YY4NH", player2: "Gesh", score: 21 },
      team2: { player1: "ProLikeMo", player2: "Hussain", score: 14 },
    },
    // Game 6: Yasin & Anis (21) vs Bokul & Doc (11)
    {
      gamescore: "21 - 11",
      team1: { player1: "Yasin", player2: "AnisZaman", score: 21 },
      team2: { player1: "Bokul", player2: "Komal", score: 11 },
    },
    // Game 7: Max & Babu (21) vs Yasin & Anis (12)
    {
      gamescore: "21 - 12",
      team1: { player1: "MaxHoque", player2: "Babu", score: 21 },
      team2: { player1: "Yasin", player2: "AnisZaman", score: 12 },
    },
    // Game 8: Rayyan & Gesh (14) vs Bokul & Doc (21)
    {
      gamescore: "14 - 21",
      team1: { player1: "R4YY4NH", player2: "Gesh", score: 14 },
      team2: { player1: "Bokul", player2: "Komal", score: 21 },
    },
    // Game 9: Saiful & Raqeeb (21) vs Mohsin & Hussein (14)
    {
      gamescore: "21 - 14",
      team1: { player1: "Saiful", player2: "Raqeeb", score: 21 },
      team2: { player1: "ProLikeMo", player2: "Hussain", score: 14 },
    },
    // Game 10: Max & Babu (21) vs Mohsin & Hussein (10)
    {
      gamescore: "21 - 10",
      team1: { player1: "MaxHoque", player2: "Babu", score: 21 },
      team2: { player1: "ProLikeMo", player2: "Hussain", score: 10 },
    },
    // Game 11: Rayyan & Gesh (21) vs Yasin & Anis (19)
    {
      gamescore: "21 - 19",
      team1: { player1: "R4YY4NH", player2: "Gesh", score: 21 },
      team2: { player1: "Yasin", player2: "AnisZaman", score: 19 },
    },
    // Game 12: Saiful & Raqeeb (22) vs Bokul & Doc (20)
    {
      gamescore: "22 - 20",
      team1: { player1: "Saiful", player2: "Raqeeb", score: 22 },
      team2: { player1: "Bokul", player2: "Komal", score: 20 },
    },
    // Game 13: Max & Babu (21) vs Bokul & Doc (12)
    {
      gamescore: "21 - 12",
      team1: { player1: "MaxHoque", player2: "Babu", score: 21 },
      team2: { player1: "Bokul", player2: "Komal", score: 12 },
    },
    // Game 14: Rayyan & Gesh (21) vs Saiful & Raqeeb (7)
    {
      gamescore: "21 - 7",
      team1: { player1: "R4YY4NH", player2: "Gesh", score: 21 },
      team2: { player1: "Saiful", player2: "Raqeeb", score: 7 },
    },
    // Game 15: Yasin & Anis (15) vs Mohsin & Hussein (21)
    {
      gamescore: "15 - 21",
      team1: { player1: "Yasin", player2: "AnisZaman", score: 15 },
      team2: { player1: "ProLikeMo", player2: "Hussain", score: 21 },
    },
  ];

  // Create each game with unique ID
  gameData.forEach((data) => {
    const gameId = generateUniqueGameId(games);
    const game = {
      gameId,
      gamescore: data.gamescore,
      date: moment().format("DD-MM-YYYY"),
      team1: data.team1,
      team2: data.team2,
      get result() {
        return calculateWin(this.team1, this.team2);
      },
      numberOfApprovals: 0,
      numberOfDeclines: 0,
      approvalStatus: "pending",
    };
    games.push(game);
  });

  return games;
};

export const leagueGames = createLeagueGames();

// Usage example:
// import { bulkAddApprovedGames } from "../../devFunctions/bulkAddApprovedGames";
// import { leagueGames } from "../../devFunctions/leagueGamesData";
//
// const leagueId = "your-league-id";
// const result = await bulkAddApprovedGames(leagueGames, leagueId);
// console.log("Bulk add result:", result);
