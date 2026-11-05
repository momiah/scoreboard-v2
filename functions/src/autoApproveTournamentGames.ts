import {
  Tournament,
  Fixtures,
  Game,
  UserProfile,
  ScoreboardProfile,
  TeamStats,
} from "courtchamps-shared/types";

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import {
  advanceBrackets,
  calculatePlayerPerformance,
  calculateTeamPerformance,
  recalculateParticipantsFromFixtures,
  getOrderedApprovedGames,
} from "courtchamps-shared/helpers";

import {
  getGamePlayerIds,
  isDueForAutoApproval,
  markGameApproved,
} from "./helpers/autoApproveHelpers";

export const autoApproveTournamentGames = onSchedule(
  "every 30 minutes",
  async () => {
    const db = admin.firestore();
    try {
      const tournamentsSnapshot = await db
        .collection("tournaments")
        .where("prizesDistributed", "==", false)
        .get();

      const dueTournamentRefs = tournamentsSnapshot.docs
        .filter((doc) =>
          ((doc.data() as Tournament).fixtures || [])
            .flatMap((round) => round.games)
            .some(isDueForAutoApproval),
        )
        .map((doc) => doc.ref);

      await Promise.all(
        dueTournamentRefs.map((ref) => processTournament(db, ref)),
      );
    } catch (error) {
      console.log("❌ Auto-approval function failed:", error);
    }
  },
);

// Runs in a transaction so a player approving or reporting a game at the same
// time is never overwritten, and a game approved meanwhile is not re-applied.
// The user profiles commit with the tournament, so the prize function the
// tournament write triggers can't have its increments overwritten.
export const processTournament = async (
  db: admin.firestore.Firestore,
  tournamentRef: admin.firestore.DocumentReference,
) => {
  const tournamentId = tournamentRef.id;
  try {
    const approvedCount = await db.runTransaction(async (transaction) => {
      const tournamentSnap = await transaction.get(tournamentRef);
      const tournamentData = tournamentSnap.data() as Tournament | undefined;
      if (!tournamentData || tournamentData.prizesDistributed) return 0;

      const fixtures = tournamentData.fixtures || [];
      const gamesDueForApproval = fixtures
        .flatMap((round) => round.games)
        .filter((game) => {
          if (!isDueForAutoApproval(game)) return false;
          if (!game.result?.winner || !game.result?.loser) {
            console.warn(
              `⚠️ Game ${game.gameId} missing result data, skipping`,
            );
            return false;
          }
          return true;
        });
      if (!gamesDueForApproval.length) return 0;

      const approvedGames = gamesDueForApproval.map(markGameApproved);
      const approvedGamesById = new Map(
        approvedGames.map((g) => [g.gameId, g]),
      );
      const fixturesWithApprovedGames = fixtures.map((round) => ({
        ...round,
        games: round.games.map(
          (game) => approvedGamesById.get(game.gameId) ?? game,
        ),
      }));

      const uniquePlayerIds = [
        ...new Set(approvedGames.flatMap(getGamePlayerIds)),
      ];
      const userSnaps = uniquePlayerIds.length
        ? await transaction.getAll(
            ...uniquePlayerIds.map((id) => db.collection("users").doc(id)),
          )
        : [];
      const users = userSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as UserProfile);

      const isDoubles = tournamentData.tournamentType === "Doubles";
      const isKnockout = tournamentData.tournamentMode === "Knockout";
      const numberOfCourts = tournamentData.numberOfCourts || 1;

      const {
        updatedFixtures,
        updatedParticipants,
        updatedTeams,
        usersToUpdate,
      } = isKnockout
        ? await computeKnockoutUpdates({
            approvedGames,
            fixturesWithApprovedGames,
            tournamentData,
            users,
            isDoubles,
            numberOfCourts,
          })
        : await computeRoundRobinUpdates({
            approvedGames,
            fixturesWithApprovedGames,
            tournamentData,
            users,
            isDoubles,
          });

      transaction.update(tournamentRef, {
        fixtures: updatedFixtures,
        tournamentParticipants: updatedParticipants,
        ...(isDoubles && { tournamentTeams: updatedTeams }),
        gamesCompleted: admin.firestore.FieldValue.increment(
          approvedGames.length,
        ),
      });
      new Map(usersToUpdate.map((user) => [user.userId, user])).forEach(
        (user) =>
          transaction.update(db.collection("users").doc(user.userId), {
            profileDetail: user.profileDetail,
          }),
      );
      return approvedGames.length;
    });

    if (approvedCount) {
      console.log(
        `✅ Auto-approved ${approvedCount} games in tournament ${tournamentId}`,
      );
    }
  } catch (error) {
    console.error(
      `❌ Error auto-approving games in tournament ${tournamentId}:`,
      error,
    );
  }
};

// ── Knockout: delta per game, no replay, then advance bracket ──
const computeKnockoutUpdates = async ({
  approvedGames,
  fixturesWithApprovedGames,
  tournamentData,
  users,
  isDoubles,
  numberOfCourts,
}: {
  approvedGames: Game[];
  fixturesWithApprovedGames: Fixtures[];
  tournamentData: Tournament;
  users: UserProfile[];
  isDoubles: boolean;
  numberOfCourts: number;
}) => {
  let updatedParticipants: ScoreboardProfile[] =
    tournamentData.tournamentParticipants ?? [];
  let updatedTeams: TeamStats[] = tournamentData.tournamentTeams ?? [];
  const usersToUpdate: UserProfile[] = [];

  for (const approvedGame of approvedGames) {
    const gamePlayerIds = getGamePlayerIds(approvedGame);
    const gameParticipants = updatedParticipants.filter((p) =>
      gamePlayerIds.includes(p.userId!),
    );
    const gameUsers = users.filter((u) => gamePlayerIds.includes(u.userId));

    const { playersToUpdate, usersToUpdate: gameUsersToUpdate } =
      calculatePlayerPerformance(approvedGame, gameParticipants, gameUsers);

    updatedParticipants = updatedParticipants.map(
      (p) => playersToUpdate.find((u) => u.userId === p.userId) ?? p,
    );

    if (gameUsersToUpdate?.length) usersToUpdate.push(...gameUsersToUpdate);

    if (isDoubles) {
      const [winnerTeam, loserTeam] = await calculateTeamPerformance({
        game: approvedGame,
        allTeams: updatedTeams,
      });
      updatedTeams = updatedTeams.map((team) => {
        if (team.teamKey === winnerTeam.teamKey) return winnerTeam;
        if (team.teamKey === loserTeam.teamKey) return loserTeam;
        return team;
      });
    }
  }

  return {
    updatedFixtures: advanceBrackets({
      fixtures: fixturesWithApprovedGames,
      numberOfCourts,
    }),
    updatedParticipants,
    updatedTeams,
    usersToUpdate,
  };
};

// ── Round-robin: replay-from-scratch for stats accuracy ──
const computeRoundRobinUpdates = async ({
  approvedGames,
  fixturesWithApprovedGames,
  tournamentData,
  users,
  isDoubles,
}: {
  approvedGames: Game[];
  fixturesWithApprovedGames: Fixtures[];
  tournamentData: Tournament;
  users: UserProfile[];
  isDoubles: boolean;
}) => {
  const orderedApprovedGames = getOrderedApprovedGames(
    fixturesWithApprovedGames,
  );

  const { updatedParticipants, updatedTeams } =
    await recalculateParticipantsFromFixtures(
      orderedApprovedGames,
      tournamentData.tournamentParticipants ?? [],
      tournamentData.tournamentTeams ?? [],
      isDoubles,
    );

  // User profile deltas are per-game — replay is fixture-level only.
  const usersToUpdate: UserProfile[] = [];
  for (const approvedGame of approvedGames) {
    const gamePlayerIds = getGamePlayerIds(approvedGame);
    const gameParticipants = (
      tournamentData.tournamentParticipants ?? []
    ).filter((p) => gamePlayerIds.includes(p.userId!));
    const gameUsers = users.filter((u) => gamePlayerIds.includes(u.userId));

    const { usersToUpdate: gameUsersToUpdate } = calculatePlayerPerformance(
      approvedGame,
      gameParticipants,
      gameUsers,
    );

    if (gameUsersToUpdate?.length) usersToUpdate.push(...gameUsersToUpdate);
  }

  return {
    updatedFixtures: fixturesWithApprovedGames,
    updatedParticipants,
    updatedTeams,
    usersToUpdate,
  };
};
