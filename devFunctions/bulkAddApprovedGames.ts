import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { processGamePerformance } from "../helpers/processGamePerformance";
import { Game } from "../types/game";
import { ScoreboardProfile } from "../types/player";

interface BulkAddGamesResult {
  success: boolean;
  message?: string;
  error?: string;
  leagueId?: string;
  totalRequested?: number;
  totalSuccessful?: number;
  totalFailed?: number;
  processedGames?: {
    gameId: string;
    gamescore: string;
    date?: string;
  }[];
}

export const bulkAddApprovedGames = async (
  gameObjects: Game[],
  leagueId: string
): Promise<BulkAddGamesResult> => {
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
    const existingGames: Game[] = leagueData.games || [];
    let currentLeagueParticipants: ScoreboardProfile[] =
      leagueData.leagueParticipants || [];

    if (currentLeagueParticipants.length === 0) {
      console.log("No participants found in the league");
      return { success: false, message: "No participants found in league" };
    }

    // Step 2: Process each game sequentially
    const processedGames: Game[] = [];
    let successfulGames = 0;
    let failedGames = 0;

    for (let i = 0; i < gameObjects.length; i++) {
      const game = gameObjects[i];

      try {
        console.log(
          `Processing game ${i + 1}/${gameObjects.length}: ${game.gameId}`
        );

        const approvedGame: Game = {
          ...game,
          approvalStatus: "Approved",
          createdAt: new Date(),
          numberOfApprovals: 1,
          numberOfDeclines: 0,
        };

        // Process player and team performance updates
        const result = await processGamePerformance({
          game: approvedGame,
          participants: currentLeagueParticipants,
          competitionId: leagueId,
          collectionName: "leagues",
        });

        if (!result.success) {
          console.warn(result.message);
          failedGames++;
          continue;
        }

        // Update participants for next iteration
        currentLeagueParticipants = result.updatedParticipants;

        // Add the game to processed games
        processedGames.push(approvedGame);
        successfulGames++;

        console.log(`✅ Successfully processed game ${i + 1}: ${game.gameId}`);
      } catch (error) {
        console.error(`❌ Failed to process game ${game.gameId}:`, error);
        failedGames++;
      }
    }

    // Step 3: Update the league with all the new games and final participant stats
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
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
