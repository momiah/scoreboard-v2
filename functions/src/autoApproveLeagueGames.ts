import {
  League,
  TeamStats,
  Game,
  ScoreboardProfile,
  UserProfile,
} from "@shared/types";

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import {
  calculatePlayerPerformance,
  calculateTeamPerformance,
} from "@shared/helpers";
import { getUserById } from "./helpers/firebaseHelpers";
import {
  getGamePlayerIds,
  isDueForAutoApproval,
  markGameApproved,
} from "./helpers/autoApproveHelpers";

export const autoApproveLeagueGames = onSchedule(
  "every 30 minutes",
  async () => {
    const db = admin.firestore();
    try {
      const leaguesSnapshot = await db
        .collection("leagues")
        .where("prizesDistributed", "==", false)
        .get();

      const leagues = leaguesSnapshot.docs.map((doc: any) => ({
        leagueId: doc.id,
        leagueRef: doc.ref,
        leagueData: doc.data() as League,
      }));

      await Promise.all(
        leagues.map(({ leagueId, leagueRef, leagueData }) =>
          processLeague(db, leagueId, leagueRef, leagueData),
        ),
      );

      console.log("✅ Auto-approval function finished.");
    } catch (error) {
      console.log("❌ Auto-approval function failed:", error);
    }
  },
);

const processLeague = async (
  db: admin.firestore.Firestore,
  leagueId: string,
  leagueRef: admin.firestore.DocumentReference,
  leagueData: League,
) => {
  const games = leagueData.games || [];

  // ── 1. Find games due for auto-approval ──
  const gamesDueForApproval = games
    .map((game, index) => ({ game, index }))
    .filter(({ game }) => {
      if (!isDueForAutoApproval(game)) return false;
      if (!game.result?.winner || !game.result?.loser) {
        console.warn(`⚠️ Game ${game.gameId} missing result data, skipping`);
        return false;
      }
      return true;
    });

  if (!gamesDueForApproval.length) {
    console.log(`⏭️ No games due for auto-approval in league ${leagueId}`);
    return;
  }

  // ── 2. Fetch users once for all players across pending games ──
  const uniquePlayerIds = [
    ...new Set(
      gamesDueForApproval.flatMap(({ game }) => getGamePlayerIds(game)),
    ),
  ];
  const fetchedUsers = await Promise.all(uniquePlayerIds.map(getUserById));
  const usersById = new Map(
    fetchedUsers
      .filter((u): u is UserProfile => u !== null)
      .map((u) => [u.userId, u]),
  );

  if (!usersById.size) {
    console.warn(`⚠️ No valid users found for games in league ${leagueId}`);
    return;
  }

  // ── 3. Iterate pending games, accumulating deltas in memory ──
  const isDoubles = leagueData.leagueType === "Doubles";
  const updatedGames = [...games];
  let latestParticipants = [...(leagueData.leagueParticipants || [])];
  let latestTeams = [...(leagueData.leagueTeams || [])];
  const usersToUpdate = new Map<string, UserProfile>();

  for (const { game, index } of gamesDueForApproval) {
    try {
      const approvedGame = markGameApproved(game);
      const gamePlayerIds = getGamePlayerIds(approvedGame);

      const gameParticipants = latestParticipants.filter((p) =>
        gamePlayerIds.includes(p.userId!),
      );
      const gameUsers = gamePlayerIds
        .map((id) => usersById.get(id))
        .filter((u): u is UserProfile => !!u);

      if (!gameParticipants.length || !gameUsers.length) {
        console.warn(
          `⚠️ Missing participants/users for game ${game.gameId} in league ${leagueId}`,
        );
        continue;
      }

      const { playersToUpdate, usersToUpdate: gameUsersToUpdate } =
        calculatePlayerPerformance(approvedGame, gameParticipants, gameUsers);

      const updatedParticipantsById = new Map(
        playersToUpdate.map((p) => [p.userId!, p]),
      );
      latestParticipants = latestParticipants.map(
        (p) => updatedParticipantsById.get(p.userId!) ?? p,
      );

      gameUsersToUpdate.forEach((user) => {
        usersById.set(user.userId, user);
        usersToUpdate.set(user.userId, user);
      });

      if (isDoubles) {
        const teamDeltas = await calculateTeamPerformance({
          game: approvedGame,
          allTeams: latestTeams,
        });
        const teamDeltasByKey = new Map(teamDeltas.map((t) => [t.teamKey, t]));
        latestTeams = latestTeams.map(
          (team) => teamDeltasByKey.get(team.teamKey) ?? team,
        );
      }

      updatedGames[index] = approvedGame;
    } catch (error) {
      console.error(
        `❌ Error processing game ${game.gameId} in league ${leagueId}:`,
        error,
      );
    }
  }

  // ── 4. Write everything in one batch ──
  try {
    const batch = db.batch();

    batch.update(leagueRef, {
      games: updatedGames,
      leagueParticipants: latestParticipants,
      ...(isDoubles && { leagueTeams: latestTeams }),
    });

    usersToUpdate.forEach((user) => {
      batch.update(db.collection("users").doc(user.userId), {
        profileDetail: user.profileDetail,
      });
    });

    await batch.commit();
    console.log(
      `✅ Auto-approved ${gamesDueForApproval.length} games in league ${leagueId}`,
    );
  } catch (error) {
    console.error(`❌ Error committing writes for league ${leagueId}:`, error);
  }
};
