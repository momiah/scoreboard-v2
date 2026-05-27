import {
  League,
  TeamStats,
  Game,
  ScoreboardProfile,
  UsersToUpdate,
} from "@shared/types";

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import {
  calculatePlayerPerformance,
  calculateTeamPerformance,
} from "@shared/helpers";
import {
  getUserById,
  updatePlayers,
  updateUsers,
  updateTeams,
} from "./helpers/firebaseHelpers";
import { notificationTypes } from "@shared";
import moment from "moment-timezone";

const TIMEZONE = "Europe/London";

const toMomentTimezone = (value: any) => {
  if (value?.toDate) return moment.tz(value.toDate(), TIMEZONE); // Firestore Timestamp
  return moment.tz(value, TIMEZONE); // Date | string | number
};

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
        id: doc.id,
        ref: doc.ref,
        data: doc.data() as League,
      }));

      await Promise.all(
        leagues.map(
          async ({
            id: leagueId,
            ref: leagueRef,
            data: leagueData,
          }: {
            id: string;
            ref: any;
            data: League;
          }) => {
            const games = leagueData.games || [];
            const leagueType = leagueData.leagueType || "Singles";

            const updatedGames = [...games] as Partial<Game>[];

            // Identify games that are due for auto-approval
            const pendingGames = games
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
                `⏭️ No games due for auto-approval in league ${leagueId}`,
              );
              return;
            }

            // Fetch all unique users upfront in one batch to avoid repeated Firestore reads
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
                `⚠️ No valid users found for games in league ${leagueId}`,
              );
              return;
            }

            // Mutable map so each game sees the latest user state before writing
            const usersMap = new Map(
              validUsers.map((user) => [user.userId, user]),
            );

            // Mutable participants and teams so each game sees the latest state before writing
            let latestParticipants = [
              ...(leagueData.leagueParticipants || []),
            ] as ScoreboardProfile[];
            let latestTeams = [
              ...(leagueData.leagueTeams || []),
            ] as TeamStats[];

            for (const { game, index } of pendingGames) {
              try {
                if (!game.result?.winner || !game.result?.loser) {
                  console.warn(
                    `⚠️ Game ${game.gameId} in league ${leagueId} missing result data, skipping`,
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
                  autoApprovedAt: admin.firestore.Timestamp.now().toDate(),
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
                    `⚠️ No valid users found for game ${game.gameId} in league ${leagueId}`,
                  );
                  continue;
                }

                if (participantsToUpdate.length === 0) {
                  console.warn(
                    `⚠️ No valid league participants found for game ${game.gameId} in league ${leagueId}`,
                  );
                  continue;
                }

                const playerPerformance = calculatePlayerPerformance(
                  updatedGame as Game,
                  participantsToUpdate,
                  usersToUpdate as UsersToUpdate,
                );

                await updatePlayers(
                  playerPerformance.playersToUpdate,
                  leagueId,
                );
                await updateUsers(playerPerformance.usersToUpdate);

                const updatedParticipantsMap = new Map<
                  string,
                  ScoreboardProfile
                >(
                  playerPerformance.playersToUpdate.map((participant) => [
                    participant.userId!,
                    participant,
                  ]),
                );

                latestParticipants = latestParticipants.map(
                  (participant) =>
                    updatedParticipantsMap.get(participant.userId!) ??
                    participant,
                );

                playerPerformance.usersToUpdate.forEach((user) =>
                  usersMap.set(user.userId, user),
                );

                if (leagueType === "Doubles") {
                  const teamsToUpdate = await calculateTeamPerformance({
                    game: updatedGame,
                    allTeams: latestTeams, // Always the latest in-memory state
                  });

                  await updateTeams(teamsToUpdate, leagueId);

                  const updatedTeamsMap = new Map<string, TeamStats>(
                    teamsToUpdate.map((team) => [team.teamKey, team]),
                  );
                  latestTeams = latestTeams.map(
                    (team) => updatedTeamsMap.get(team.teamKey) ?? team,
                  );
                }

                updatedGames[index] = updatedGame as Game;
              } catch (error) {
                console.error(
                  `❌ Error processing game ${game.gameId} in league ${leagueId}:`,
                  error,
                );
                // Continue processing remaining games even if this one fails
              }
            }

            try {
              await leagueRef.update({ games: updatedGames });
            } catch (error) {
              console.error(`❌ Error updating league ${leagueId}:`, error);
            }
          },
        ),
      );

      console.log("✅ Auto-approval function finished.");
    } catch (error) {
      console.log("❌ Auto-approval function failed:", error);
    }
  },
);
