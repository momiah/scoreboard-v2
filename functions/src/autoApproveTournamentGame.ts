import { TeamStats, Tournament } from "./types/competition";
import { Fixtures, Game } from "./types/game";
import { ScoreboardProfile, UsersToUpdate } from "./types/player";

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";


import {
  calculatePlayerPerformance,
} from "./helpers/calculatePlayerPerformance";
import {
  calculateTeamPerformance,
} from "./helpers/calculateTeamPerformance";
import {
  getUserById,
  updateTournamentPlayers,
  updateUsers,
  updateTournamentTeams,
} from "./helpers/firebaseHelpers";
import { notificationTypes } from "./schemas/schema";
import moment from "moment-timezone";
const TZ = "Europe/London";

const toMomentTz = (value: any) => {
  if (value?.toDate) return moment.tz(value.toDate(), TZ); // Firestore Timestamp
  return moment.tz(value, TZ); // Date | string | number
};

const autoApproveTournamentGames = onSchedule("every 30 minutes", async () => {
  const db = admin.firestore();
  try {
    console.log("🚀 Auto-approval job for tournament games started");

    const tournamentsSnap = await db.collection("tournaments").get();
    console.log(`📌 Found ${tournamentsSnap.size} tournaments`);

    const tournaments = tournamentsSnap.docs.map((doc: any) => ({
      id: doc.id,
      ref: doc.ref,
      data: doc.data() as Tournament,
    }));

    await Promise.all(
      tournaments.map(
        async ({ id: tournamentId, ref: tournamentRef, data: tournamentData }: {
          id: string;
          ref: any;
          data: Tournament;
        }) => {
          const fixtures = tournamentData.fixtures || [];
          const games = fixtures.flatMap((fixture: Fixtures, fixtureIdx: number) =>
            fixture.games.map((game: Game, gameIdx: number) => ({
              ...game,
              fixtureIndex: fixtureIdx,
              gameIndex: gameIdx
            }))
          );

          const tournamentParticipants = tournamentData.tournamentParticipants || [];

          const tournamentType = tournamentData.tournamentType || "Singles";

          console.log(`🎮 Tournament ${tournamentId} has ${games.length} games in ${fixtures.length} fixtures`);

          let numberOfGamesApproved = 0;

          const updatedGames = [...games] as Partial<Game>[];

          const pendingIndexes = games
            .map((game: Game, i: number) => {
              const created = toMomentTz(game.createdAt);
              const now = moment.tz(TZ);
              const hoursPassed = created.isValid()
                ? now.diff(created, "hours", true)
                : NaN;

              console.log(
                `➡️ Checking game ${game.gameId} in tournament ${tournamentId}`
              );
              console.log("   approvalStatus:", game.approvalStatus);
              console.log(
                "   createdAt (tz):",
                created.isValid() ? created.format() : "INVALID"
              );
              console.log("   hoursPassed:", hoursPassed);

              const due =
                game.approvalStatus.toLowerCase() === "pending" &&
                created.isValid() &&
                hoursPassed >= 24 &&
                (game.numberOfDeclines || 0) === 0;

              console.log(`   ✅ Should auto-approve? ${due}`);

              return { game, i, due };
            })
            .filter(({ due }: { due: boolean }) => due);


          // Get all user ids from all games in the tournament
          const allUserIds = [...new Set(pendingIndexes.flatMap(({ game }: { game: Game }) => [
            game.team1.player1?.userId,
            game.team1.player2?.userId,
            game.team2.player1?.userId,
            game.team2.player2?.userId,
          ].filter(Boolean)))];
          const allUsersRaw = await Promise.all(allUserIds.map(getUserById));
          const allUsers = allUsersRaw.filter(
            (user): user is NonNullable<typeof user> => user !== null
          );
          if (allUsers.length === 0) {
            console.warn(
              `⚠️ No valid users found for games in tournament ${tournamentId}`
            );
            return;
          }

          await Promise.all(
            pendingIndexes.map(async ({ game, i }: { game: Game, i: number }) => {
              try {
                // Validate game has required data
                if (!game.result || !game.result.winner || !game.result.loser) {
                  console.warn(
                    `⚠️ Game ${game.gameId} in tournament ${tournamentId} missing result data, skipping auto-approval`
                  );
                  return;
                }

                const updatedGame = {
                  ...game,
                  approvers: [
                    ...(game.approvers || []),
                    { userId: "system", username: "AutoApproval" },
                  ],
                  approvalStatus: notificationTypes.RESPONSE.APPROVE_GAME,
                  autoApproved: true,
                  autoApprovedAt: admin.firestore.Timestamp.now(),
                };

                // Extract player userIds from the game's team objects
                const userIds = [
                  game.team1.player1?.userId,
                  game.team1.player2?.userId,
                  game.team2.player1?.userId,
                  game.team2.player2?.userId,
                ].filter(Boolean); // Remove nulls

                const playersToUpdate = tournamentParticipants.filter((player: ScoreboardProfile) =>
                  userIds.includes(player.userId)
                );

                const usersToUpdate = allUsers.filter((user) => userIds.includes(user.userId));

                // Validate we have valid data to proceed
                if (usersToUpdate.length === 0) {
                  console.warn(
                    `⚠️ No valid users found for game ${game.gameId} in tournament ${tournamentId}`
                  );
                  return;
                }

                if (playersToUpdate.length === 0) {
                  console.warn(
                    `⚠️ No valid tournament participants found for game ${game.gameId} in tournament ${tournamentId}`
                  );
                  return;
                }

                const playerPerformance = calculatePlayerPerformance(
                  updatedGame as Game,
                  playersToUpdate,
                  usersToUpdate as UsersToUpdate
                );

                await updateTournamentPlayers(playerPerformance.playersToUpdate, tournamentId);


                if (tournamentType === "Doubles") {
                  const teamsToUpdate = await calculateTeamPerformance({
                    game: updatedGame,
                    allTeams: (tournamentData.tournamentTeams || []) as TeamStats[]
                  });

                  await updateTournamentTeams(teamsToUpdate, tournamentId);
                }
                numberOfGamesApproved++;

                updatedGames[i] = updatedGame as Game;

                console.log(
                  `🎯 Finished processing game: ${game.gameId} in tournament: ${tournamentId}`
                );
              } catch (error) {
                console.error(
                  `❌ Error processing game ${game.gameId} in tournament ${tournamentId}:`,
                  error
                );
                // Continue processing other games even if this one fails
              }
            })
          );
          // Update all users at the end of the tournament
          if (allUsers.length > 0) {
            await updateUsers(allUsers);
          }

          // Create a Map for O(1) lookups instead of O(n) .find()
          const updatedGamesMap = new Map(
            updatedGames.map(game => [game.gameId, game])
          );

          const updatedFixtures = fixtures.map((fixture: any) => ({
            ...fixture,
            games: fixture.games.map((game: Game) =>
              updatedGamesMap.get(game.gameId) || game
            ),
          }));

          try {
            const updateData: Partial<Tournament> = { fixtures: updatedFixtures };
            if (numberOfGamesApproved > 0) {
              updateData.gamesCompleted = admin.firestore.FieldValue.increment(numberOfGamesApproved) as unknown as number;
            }
            await tournamentRef.update(updateData);

            console.log(`💾 Updated fixtures and games in tournament: ${tournamentId}`);
          } catch (error) {
            console.error(`❌ Error updating tournament ${tournamentId}:`, error);
          }
        }
      )
    );

    console.log("✅ Auto-approval function finished.");
  } catch (error) {
    console.log("❌ Auto-approval function failed:", error);
  }
});

export { autoApproveTournamentGames };