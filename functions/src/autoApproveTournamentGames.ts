import {
  TeamStats,
  Tournament,
  Fixtures,
  Game,
  ScoreboardProfile,
  UserProfile,
} from "@shared/types";

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import {
  calculatePlayerPerformance,
  recalculateParticipantsFromFixtures,
  getOrderedApprovedGames,
} from "@shared/helpers";

import { getUserById } from "./helpers/firebaseHelpers";
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
            const isDoubles = tournamentType === "Doubles";

            // ── Identify games due for auto-approval ──
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

            // ── Mark games as approved in memory ──
            const updatedGamesMap = new Map(
              allGames.map((game: Game) => [game.gameId, game]),
            );

            let numberOfGamesApproved = 0;
            const approvedGames: Game[] = [];

            for (const { game } of pendingGames) {
              if (!game.result?.winner || !game.result?.loser) {
                console.warn(
                  `⚠️ Game ${game.gameId} missing result data, skipping`,
                );
                continue;
              }

              const updatedGame: Game = {
                ...game,
                approvers: [
                  ...(game.approvers || []),
                  { userId: "system", username: "AutoApproval" },
                ],
                approvalStatus: notificationTypes.RESPONSE.APPROVED_GAME,
                autoApproved: true,
                autoApprovedAt: admin.firestore.Timestamp.now().toDate(),
              };

              updatedGamesMap.set(game.gameId, updatedGame);
              approvedGames.push(updatedGame);
              numberOfGamesApproved++;
            }

            if (numberOfGamesApproved === 0) return;

            // ── Reconstruct fixtures with approved games ──
            const updatedFixtures = fixtures.map((fixture: any) => ({
              ...fixture,
              games: fixture.games.map(
                (game: Game) => updatedGamesMap.get(game.gameId) ?? game,
              ),
            }));

            // ── Replay all approved games for competition stats ──
            const orderedApprovedGames =
              getOrderedApprovedGames(updatedFixtures);

            const { updatedParticipants, updatedTeams } =
              await recalculateParticipantsFromFixtures(
                orderedApprovedGames,
                tournamentData.tournamentParticipants ?? [],
                tournamentData.tournamentTeams ?? [],
                isDoubles,
              );

            // ── User profile updates — only for auto-approved games' players ──
            const allAutoApprovedUserIds = [
              ...new Set(
                approvedGames.flatMap((game) =>
                  [
                    game.team1.player1?.userId,
                    game.team1.player2?.userId,
                    game.team2.player1?.userId,
                    game.team2.player2?.userId,
                  ].filter((id): id is string => !!id),
                ),
              ),
            ];

            const fetchedUsers = await Promise.all(
              allAutoApprovedUserIds.map(getUserById),
            );
            const validUsers = fetchedUsers.filter(
              (u): u is UserProfile => u !== null,
            );

            // ── Write competition document once ──
            await tournamentRef.update({
              fixtures: updatedFixtures,
              tournamentParticipants: updatedParticipants,
              ...(isDoubles && { tournamentTeams: updatedTeams }),
              gamesCompleted: admin.firestore.FieldValue.increment(
                numberOfGamesApproved,
              ),
            });

            // ── Write user profileDetail updates sequentially ──
            for (const game of approvedGames) {
              const gamePlayerIds = [
                game.team1.player1?.userId,
                game.team1.player2?.userId,
                game.team2.player1?.userId,
                game.team2.player2?.userId,
              ].filter((id): id is string => !!id);

              const gameUsers = validUsers.filter((u) =>
                gamePlayerIds.includes(u.userId),
              );

              const gameParticipants = (
                tournamentData.tournamentParticipants ?? []
              ).filter((p) => gamePlayerIds.includes(p.userId!));

              const { usersToUpdate } = calculatePlayerPerformance(
                game,
                gameParticipants,
                gameUsers,
              );

              for (const user of usersToUpdate ?? []) {
                if (!user.userId) continue;
                await db.doc(`users/${user.userId}`).update({
                  profileDetail: user.profileDetail,
                });
              }
            }

            console.log(
              `✅ Auto-approved ${numberOfGamesApproved} games in tournament ${tournamentId}`,
            );
          },
        ),
      );
    } catch (error) {
      console.log("❌ Auto-approval function failed:", error);
    }
  },
);
