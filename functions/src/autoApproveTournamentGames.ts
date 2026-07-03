import {
  Tournament,
  Fixtures,
  Game,
  UserProfile,
  ScoreboardProfile,
  TeamStats,
} from "@shared/types";

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import {
  advanceBrackets,
  calculatePlayerPerformance,
  calculateTeamPerformance,
  recalculateParticipantsFromFixtures,
  getOrderedApprovedGames,
} from "@shared/helpers";

import { getUserById } from "./helpers/firebaseHelpers";
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

      const tournaments = tournamentsSnapshot.docs.map((doc: any) => ({
        tournamentId: doc.id,
        tournamentRef: doc.ref,
        tournamentData: doc.data() as Tournament,
      }));

      await Promise.all(
        tournaments.map(({ tournamentId, tournamentRef, tournamentData }) =>
          processTournament(db, tournamentId, tournamentRef, tournamentData),
        ),
      );
    } catch (error) {
      console.log("❌ Auto-approval function failed:", error);
    }
  },
);

const processTournament = async (
  db: admin.firestore.Firestore,
  tournamentId: string,
  tournamentRef: admin.firestore.DocumentReference,
  tournamentData: Tournament,
) => {
  const fixtures = tournamentData.fixtures || [];
  const allGames = fixtures.flatMap((round) => round.games);

  // ── 1. Find and validate games due for auto-approval ──
  const gamesDueForApproval = allGames.filter((game) => {
    if (!isDueForAutoApproval(game)) return false;
    if (!game.result?.winner || !game.result?.loser) {
      console.warn(`⚠️ Game ${game.gameId} missing result data, skipping`);
      return false;
    }
    return true;
  });

  if (!gamesDueForApproval.length) {
    console.log(
      `⏭️ No games due for auto-approval in tournament ${tournamentId}`,
    );
    return;
  }

  const approvedGames = gamesDueForApproval.map(markGameApproved);
  const approvedGamesById = new Map(approvedGames.map((g) => [g.gameId, g]));

  const fixturesWithApprovedGames = fixtures.map((round) => ({
    ...round,
    games: round.games.map(
      (game) => approvedGamesById.get(game.gameId) ?? game,
    ),
  }));

  // ── 2. Fetch user docs once for all players across approved games ──
  const uniquePlayerIds = [...new Set(approvedGames.flatMap(getGamePlayerIds))];
  const fetchedUsers = await Promise.all(uniquePlayerIds.map(getUserById));
  const users = fetchedUsers.filter((u): u is UserProfile => u !== null);

  // ── 3. Compute participant + user + team updates ──
  const isDoubles = tournamentData.tournamentType === "Doubles";
  const isKnockout = tournamentData.tournamentMode === "Knockout";
  const numberOfCourts = tournamentData.numberOfCourts || 1;

  const { updatedFixtures, updatedParticipants, updatedTeams, usersToUpdate } =
    isKnockout
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

  // ── 4. Write tournament doc + user docs ──
  await tournamentRef.update({
    fixtures: updatedFixtures,
    tournamentParticipants: updatedParticipants,
    ...(isDoubles && { tournamentTeams: updatedTeams }),
    gamesCompleted: admin.firestore.FieldValue.increment(approvedGames.length),
  });

  await Promise.all(
    usersToUpdate.map((user) =>
      db.doc(`users/${user.userId}`).update({
        profileDetail: user.profileDetail,
      }),
    ),
  );

  console.log(
    `✅ Auto-approved ${approvedGames.length} games in tournament ${tournamentId}`,
  );
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
