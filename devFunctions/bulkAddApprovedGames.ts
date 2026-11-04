import { doc, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { applyLeagueGameResults, getGamePlayerIds } from "@shared/helpers";
import { Game, League, UserProfile } from "@shared/types";

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

// All games, standings, teams and profiles are written in one transaction:
// either every game is published or none is.
export const bulkAddApprovedGames = async (
  gameObjects: Game[],
  leagueId: string,
): Promise<BulkAddGamesResult> => {
  if (!gameObjects || gameObjects.length === 0) {
    return { success: false, message: "No games provided" };
  }
  if (!leagueId) {
    return { success: false, message: "No leagueId provided" };
  }

  const approvedGames: Game[] = gameObjects.map((game) => ({
    ...game,
    approvalStatus: "approved",
    createdAt: new Date(),
    numberOfApprovals: 1,
    numberOfDeclines: 0,
  }));

  try {
    const leagueRef = doc(db, "leagues", leagueId);

    await runTransaction(db, async (transaction) => {
      const leagueSnap = await transaction.get(leagueRef);
      if (!leagueSnap.exists()) throw new Error("League not found");
      const league = leagueSnap.data() as League;

      const playerIds = [...new Set(approvedGames.flatMap(getGamePlayerIds))];
      const userSnaps = await Promise.all(
        playerIds.map((id) => transaction.get(doc(db, "users", id))),
      );
      const users = userSnaps
        .filter((snap) => snap.exists())
        .map((snap) => snap.data() as UserProfile);

      const isDoubles = league.leagueType === "Doubles";
      const results = await applyLeagueGameResults({
        games: approvedGames,
        participants: league.leagueParticipants || [],
        teams: league.leagueTeams || [],
        users,
        isDoubles,
      });

      transaction.update(leagueRef, {
        games: [...(league.games || []), ...approvedGames],
        leagueParticipants: results.participants,
        ...(isDoubles && { leagueTeams: results.teams }),
      });
      results.users.forEach((user) => {
        transaction.update(doc(db, "users", user.userId), {
          profileDetail: user.profileDetail,
        });
      });
    });

    return {
      success: true,
      leagueId,
      totalRequested: gameObjects.length,
      totalSuccessful: approvedGames.length,
      totalFailed: 0,
      processedGames: approvedGames.map((g) => ({
        gameId: g.gameId,
        gamescore: g.gamescore,
        date: g.date,
      })),
    };
  } catch (error) {
    console.error("Error in bulkAddApprovedGames:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to publish games",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
