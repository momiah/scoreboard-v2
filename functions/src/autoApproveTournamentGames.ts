import {
  TeamStats,
  Tournament,
  Fixtures,
  Game,
  ScoreboardProfile,
  UsersToUpdate,
} from "@shared/types";

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { calculatePlayerPerformance } from "./helpers/calculatePlayerPerformance";
import { calculateTeamPerformance } from "./helpers/calculateTeamPerformance";
import {
  getUserById,
  updateTournamentPlayers,
  updateUsers,
  updateTournamentTeams,
} from "./helpers/firebaseHelpers";
import { notificationTypes } from "@shared";
import moment from "moment-timezone";

const TIMEZONE = "Europe/London";

const toMomentTimezone = (value: any) => {
  if (value?.toDate) return moment.tz(value.toDate(), TIMEZONE);
  return moment.tz(value, TIMEZONE);
};

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
        id: doc.id,
        ref: doc.ref,
        data: doc.data() as Tournament,
      }));

      await Promise.all(
        tournaments.map(
          async ({
            id: tournamentId,
            ref: tournamentRef,
            data: tournamentData,
          }: {
            id: string;
            ref: any;
            data: Tournament;
          }) => {
            const fixtures = tournamentData.fixtures || [];
            const allGames = fixtures.flatMap(
              (fixture: Fixtures, fixtureIndex: number) =>
                fixture.games.map((game: Game, gameIndex: number) => ({
                  ...game,
                  fixtureIndex,
                  gameIndex,
                })),
            );

            const tournamentType = tournamentData.tournamentType || "Singles";

            let numberOfGamesApproved = 0;
            const updatedGames = [...allGames] as Partial<Game>[];

            // Identify games that are due for auto-approval
            const pendingGames = allGames
              .map((game: Game, index: number) => {
                const createdAt = toMomentTimezone(game.createdAt);
                const now = moment.tz(TIMEZONE);
                const hoursPassed = createdAt.isValid()
                  ? now.diff(createdAt, "hours", true)
                  : NaN;

                const isDue =
                  game.approvalStatus.toLowerCase() === "pending" &&
                  createdAt.isValid() &&
                  hoursPassed >= 24 &&
                  (game.numberOfDeclines || 0) === 0;

                return { game, index, isDue };
              })
              .filter(({ isDue }: { isDue: boolean }) => isDue);

            if (pendingGames.length === 0) {
              console.log(
                `⏭️ No games due for auto-approval in tournament ${tournamentId}`,
              );
              return;
            }

            const allUniqueUserIds = [
              ...new Set(
                pendingGames.flatMap(({ game }: { game: Game }) =>
                  [
                    game.team1.player1?.userId,
                    game.team1.player2?.userId,
                    game.team2.player1?.userId,
                    game.team2.player2?.userId,
                  ].filter(Boolean),
                ),
              ),
            ];

            const fetchedUsers = await Promise.all(
              allUniqueUserIds.map(getUserById),
            );
            const validUsers = fetchedUsers.filter(
              (user): user is NonNullable<typeof user> => user !== null,
            );

            if (validUsers.length === 0) {
              console.warn(
                `⚠️ No valid users found for games in tournament ${tournamentId}`,
              );
              return;
            }

            const usersMap = new Map(
              validUsers.map((user) => [user.userId, user]),
            );

            let latestParticipants = [
              ...(tournamentData.tournamentParticipants || []),
            ] as ScoreboardProfile[];
            let latestTeams = [
              ...(tournamentData.tournamentTeams || []),
            ] as TeamStats[];

            for (const { game, index } of pendingGames) {
              try {
                if (!game.result?.winner || !game.result?.loser) {
                  console.warn(
                    `⚠️ Game ${game.gameId} in tournament ${tournamentId} missing result data, skipping`,
                  );
                  continue;
                }

                const updatedGame = {
                  ...game,
                  approvers: [
                    ...(game.approvers || []),
                    { userId: "system", username: "AutoApproval" },
                  ],
                  approvalStatus: notificationTypes.RESPONSE.APPROVED_GAME,
                  autoApproved: true,
                  autoApprovedAt: admin.firestore.Timestamp.now(),
                };

                const gameUserIds = [
                  game.team1.player1?.userId,
                  game.team1.player2?.userId,
                  game.team2.player1?.userId,
                  game.team2.player2?.userId,
                ].filter(Boolean);

                // Read from latest in-memory state to avoid stale snapshots
                const participantsToUpdate = latestParticipants.filter(
                  (participant) => gameUserIds.includes(participant.userId),
                );
                const usersToUpdate = gameUserIds
                  .map((userId) => usersMap.get(userId!))
                  .filter(Boolean);

                if (usersToUpdate.length === 0) {
                  console.warn(
                    `⚠️ No valid users found for game ${game.gameId} in tournament ${tournamentId}`,
                  );
                  continue;
                }

                if (participantsToUpdate.length === 0) {
                  console.warn(
                    `⚠️ No valid tournament participants found for game ${game.gameId} in tournament ${tournamentId}`,
                  );
                  continue;
                }

                const playerPerformance = calculatePlayerPerformance(
                  updatedGame as Game,
                  participantsToUpdate,
                  usersToUpdate as UsersToUpdate,
                );

                await updateTournamentPlayers(
                  playerPerformance.playersToUpdate,
                  tournamentId,
                );
                await updateUsers(playerPerformance.usersToUpdate);

                // Explicitly typed as ScoreboardProfile to avoid unknown[] inference error
                const updatedParticipantsMap = new Map<
                  string,
                  ScoreboardProfile
                >(
                  playerPerformance.playersToUpdate.map((participant) => [
                    participant.userId!,
                    participant,
                  ]),
                );

                // Update in-memory participants so the next game reads fresh stats
                latestParticipants = latestParticipants.map(
                  (participant) =>
                    updatedParticipantsMap.get(participant.userId!) ??
                    participant,
                );

                // Update in-memory users map so the next game reads fresh user data
                playerPerformance.usersToUpdate.forEach((user) =>
                  usersMap.set(user.userId, user),
                );

                if (tournamentType === "Doubles") {
                  const teamsToUpdate = await calculateTeamPerformance({
                    game: updatedGame,
                    allTeams: latestTeams, // Always the latest in-memory state
                  });

                  await updateTournamentTeams(teamsToUpdate, tournamentId);

                  // Update in-memory teams so the next game reads fresh team data
                  const updatedTeamsMap = new Map<string, TeamStats>(
                    teamsToUpdate.map((team) => [team.teamKey, team]),
                  );
                  latestTeams = latestTeams.map(
                    (team) => updatedTeamsMap.get(team.teamKey) ?? team,
                  );
                }

                numberOfGamesApproved++;
                updatedGames[index] = updatedGame as Game;
              } catch (error) {
                console.error(
                  `❌ Error processing game ${game.gameId} in tournament ${tournamentId}:`,
                  error,
                );
                // Continue processing remaining games even if this one fails
              }
            }

            // Reconstruct fixtures with updated games using a Map for O(1) lookups
            const updatedGamesMap = new Map(
              updatedGames.map((game) => [game.gameId, game]),
            );

            const updatedFixtures = fixtures.map((fixture: any) => ({
              ...fixture,
              games: fixture.games.map(
                (game: Game) => updatedGamesMap.get(game.gameId) || game,
              ),
            }));

            try {
              const updateData: Partial<Tournament> = {
                fixtures: updatedFixtures,
              };
              if (numberOfGamesApproved > 0) {
                updateData.gamesCompleted =
                  admin.firestore.FieldValue.increment(
                    numberOfGamesApproved,
                  ) as unknown as number;
              }
              await tournamentRef.update(updateData);
            } catch (error) {
              console.error(
                `❌ Error updating tournament ${tournamentId}:`,
                error,
              );
            }
          },
        ),
      );
    } catch (error) {
      console.log("❌ Auto-approval function failed:", error);
    }
  },
);
