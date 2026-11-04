import { League, Game, UserProfile } from "courtchamps-shared/types";

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { applyLeagueGameResults } from "courtchamps-shared/helpers";
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

      const dueLeagueRefs = leaguesSnapshot.docs
        .filter((doc) =>
          ((doc.data() as League).games || []).some(isDueForAutoApproval),
        )
        .map((doc) => doc.ref);

      await Promise.all(dueLeagueRefs.map((ref) => processLeague(db, ref)));

      console.log("✅ Auto-approval function finished.");
    } catch (error) {
      console.log("❌ Auto-approval function failed:", error);
    }
  },
);

// Runs in a transaction so a user approving or reporting a game at the same
// time is never overwritten, and a game approved meanwhile is not re-applied.
export const processLeague = async (
  db: admin.firestore.Firestore,
  leagueRef: admin.firestore.DocumentReference,
) => {
  const leagueId = leagueRef.id;
  try {
    const approvedCount = await db.runTransaction(async (transaction) => {
      const leagueSnap = await transaction.get(leagueRef);
      const league = leagueSnap.data() as League | undefined;
      if (!league || league.prizesDistributed) return 0;

      const games: Game[] = league.games || [];
      const dueGames = games.filter(isDueForAutoApproval);
      if (!dueGames.length) return 0;

      const playerIds = [...new Set(dueGames.flatMap(getGamePlayerIds))];
      const userSnaps = playerIds.length
        ? await transaction.getAll(
            ...playerIds.map((id) => db.collection("users").doc(id)),
          )
        : [];
      const users = userSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as UserProfile);

      const isDoubles = league.leagueType === "Doubles";
      let results = {
        participants: league.leagueParticipants || [],
        teams: league.leagueTeams || [],
        users,
      };
      const changedUsers = new Map<string, UserProfile>();
      const approvedById = new Map<string, Game>();

      for (const game of dueGames) {
        const approvedGame = markGameApproved(game);
        try {
          const next = await applyLeagueGameResults({
            games: [approvedGame],
            participants: results.participants,
            teams: results.teams,
            users: results.users,
            isDoubles,
          });
          next.users.forEach((u) => changedUsers.set(u.userId, u));
          results = {
            participants: next.participants,
            teams: next.teams,
            users: results.users.map((u) => changedUsers.get(u.userId) ?? u),
          };
          approvedById.set(game.gameId, approvedGame);
        } catch (error) {
          console.warn(
            `⚠️ Skipping game ${game.gameId} in league ${leagueId}:`,
            error,
          );
        }
      }

      if (!approvedById.size) return 0;

      transaction.update(leagueRef, {
        games: games.map((g) => approvedById.get(g.gameId) ?? g),
        leagueParticipants: results.participants,
        ...(isDoubles && { leagueTeams: results.teams }),
      });
      changedUsers.forEach((user) => {
        transaction.update(db.collection("users").doc(user.userId), {
          profileDetail: user.profileDetail,
        });
      });
      return approvedById.size;
    });

    console.log(
      `✅ Auto-approved ${approvedCount} games in league ${leagueId}`,
    );
  } catch (error) {
    console.error(
      `❌ Error auto-approving games in league ${leagueId}:`,
      error,
    );
  }
};
