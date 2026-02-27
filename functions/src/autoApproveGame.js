const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

const {
  calculatePlayerPerformance,
} = require("./helpers/calculatePlayerPerformance");
const {
  calculateTeamPerformance,
} = require("./helpers/calculateTeamPerformance");
const {
  getUserById,
  updatePlayers,
  updateUsers,
  updateTeams,
  retrieveTeams,
} = require("./helpers/firebaseHelpers");
const { notificationTypes } = require("./schemas/schema");
const moment = require("moment-timezone");
const TZ = "Europe/London";

const toMomentTz = (value) => {
  if (value?.toDate) return moment.tz(value.toDate(), TZ);
  return moment.tz(value, TZ);
};

exports.autoApproveGames = onSchedule("every 30 minutes", async () => {
  const db = admin.firestore(); // ← moved here, after initializeApp() has run
  try {
    console.log("🚀 Auto-approval job started");

    const leaguesSnap = await db.collection("leagues").get();
    console.log(`📌 Found ${leaguesSnap.size} leagues`);

    const leagues = leaguesSnap.docs.map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      data: doc.data(),
    }));

    await Promise.all(
      leagues.map(
        async ({ id: leagueId, ref: leagueRef, data: leagueData }) => {
          const games = leagueData.games || [];
          const leagueParticipants = leagueData.leagueParticipants || [];
          const leagueType = leagueData.leagueType || "Singles";

          console.log(`🎮 League ${leagueId} has ${games.length} games`);

          const updatedGames = [...games];

          const pendingIndexes = games
            .map((game, i) => {
              const created = toMomentTz(game.createdAt);
              const now = moment.tz(TZ);
              const hoursPassed = created.isValid()
                ? now.diff(created, "hours", true)
                : NaN;

              console.log(
                `➡️ Checking game ${game.gameId} in league ${leagueId}`,
              );
              console.log("   approvalStatus:", game.approvalStatus);
              console.log(
                "   createdAt (tz):",
                created.isValid() ? created.format() : "INVALID",
              );
              console.log("   hoursPassed:", hoursPassed);

              const due =
                game.approvalStatus === "pending" &&
                created.isValid() &&
                hoursPassed >= 24 &&
                (game.numberOfDeclines || 0) === 0;

              console.log(`   ✅ Should auto-approve? ${due}`);

              return { game, i, due };
            })
            .filter(({ due }) => due);

          await Promise.all(
            pendingIndexes.map(async ({ game, i }) => {
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

              const userIds = [
                game.team1.player1?.userId,
                game.team1.player2?.userId,
                game.team2.player1?.userId,
                game.team2.player2?.userId,
              ].filter(Boolean);

              const playersToUpdate = leagueParticipants.filter((player) =>
                userIds.includes(player.userId),
              );

              const usersToUpdate = await Promise.all(userIds.map(getUserById));

              const playerPerformance = calculatePlayerPerformance(
                updatedGame,
                playersToUpdate,
                usersToUpdate,
              );

              await updatePlayers(playerPerformance.playersToUpdate, leagueId);
              await updateUsers(playerPerformance.usersToUpdate);

              if (leagueType === "Doubles") {
                const allTeams = await retrieveTeams(leagueId, "leagues");
                const teamsToUpdate = await calculateTeamPerformance({
                  game: updatedGame,
                  allTeams,
                });

                await updateTeams(teamsToUpdate, leagueId);
              }

              updatedGames[i] = updatedGame;

              console.log(
                `🎯 Finished processing game: ${game.gameId} in league: ${leagueId}`,
              );
            }),
          );

          try {
            await leagueRef.update({ games: updatedGames });
            console.log(`💾 Updated games in league: ${leagueId}`);
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
});
