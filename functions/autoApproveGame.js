const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const db = admin.firestore();

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

exports.autoApproveGames = onSchedule("every 15 minutes", async () => {
  try {
    console.log("🚀 Auto-approval job started");

    const leaguesSnap = await db.collection("leagues").get();
    console.log(`📌 Found ${leaguesSnap.size} leagues`);

    const now = new Date();

    const leagues = leaguesSnap.docs.map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      data: doc.data(),
    }));

    await Promise.all(
      leagues.map(async ({ id: leagueId, ref: leagueRef, data: leagueData }) => {
        const games = leagueData.games || [];
        const leagueParticipants = leagueData.leagueParticipants || [];

        console.log(`🎮 League ${leagueId} has ${games.length} games`);

        const updatedGames = [...games];

        const pendingIndexes = games
          .map((game, i) => {
            console.log(`➡️ Checking game ${game.gameId} in league ${leagueId}`);
            console.log("   approvalStatus:", game.approvalStatus);
            console.log("   createdAt raw:", game.createdAt);

            // Safely parse createdAt
            let createdAt;
            if (game?.createdAt?.toDate) {
              createdAt = game.createdAt.toDate();
            } else if (game?.createdAt) {
              createdAt = new Date(game.createdAt);
            } else {
              createdAt = null;
            }

            const hoursPassed = createdAt ? (now - createdAt) / (1000 * 60 * 60) : 0;
            console.log("   createdAt parsed:", createdAt);
            console.log("   hoursPassed:", hoursPassed);

            return { game, i, hoursPassed };
          })
          .filter(({ game, hoursPassed }) => {
            const shouldApprove =
              game.approvalStatus === "pending" &&
              hoursPassed >= 24 &&
              (game.numberOfDeclines || 0) === 0;

            console.log(
              `   ✅ Should auto-approve? ${shouldApprove} (hoursPassed=${hoursPassed})`
            );

            return shouldApprove;
          });

        console.log(
          `📌 League ${leagueId} has ${pendingIndexes.length} pending games to auto-approve`
        );

        await Promise.all(
          pendingIndexes.map(async ({ game, i }) => {
            const updatedGame = {
              ...game,
              numberOfApprovals: (game.numberOfApprovals || 0) + 1,
              approvers: [
                ...(game.approvers || []),
                { userId: "system", username: "AutoApproval" },
              ],
              approvalStatus: notificationTypes.RESPONSE.APPROVE_GAME,
              autoApproved: true,
              autoApprovedAt: admin.firestore.Timestamp.now(),
            };

            console.log("✅ Auto-approving game:", game.gameId);

            const winnerPlayers = updatedGame?.result?.winner?.players || [];
            const loserPlayers = updatedGame?.result?.loser?.players || [];

            const allPlayers = winnerPlayers.concat(loserPlayers);

            const playersToUpdate = leagueParticipants.filter(
              (player) => player?.username && allPlayers.includes(player.username)
            );


            console.log(
              `👤 Players to update for game ${game.gameId}:`,
              playersToUpdate.map((p) => p.username)
            );

            const validPlayers = playersToUpdate.filter(p => p && p.userId);
            const userIds = validPlayers.map(p => p.userId);
            const usersToUpdate = await Promise.all(
              userIds.map(async (uid) => {
                try {
                  return await getUserById(uid);
                } catch (err) {
                  console.warn(`⚠️ Failed to fetch user ${uid}:`, err);
                  return null;
                }
              })
            );
            usersToUpdate.forEach((user, i) => {
              if (!user) {
                console.warn(`⚠️ User ${userIds[i]} not found`);
              }
              else if (!user.userId) {
                console.warn(`⚠️ User ${userIds[i]} has no userId`);
              }
              else if (!user.username) {
                console.warn(`⚠️ User ${userIds[i]} has no username`);
              }
            })

            if (playersToUpdate.length !== validPlayers.length) {
              console.warn(`❌ League ${leagueId} | Game ${game.gameId} has invalid players:`, playersToUpdate);
            }
            // const usersToUpdate = await Promise.all(userIds.map(getUserById));
            const filteredUsers = usersToUpdate.filter(Boolean);

            const playerPerformance = calculatePlayerPerformance(
              updatedGame,
              playersToUpdate,
              filteredUsers
            );

            await updatePlayers(playerPerformance.playersToUpdate, leagueId);
            await updateUsers(playerPerformance.usersToUpdate);

            const teamsToUpdate = await calculateTeamPerformance(
              updatedGame,
              retrieveTeams,
              leagueId
            );

            await updateTeams(teamsToUpdate, leagueId);

            updatedGames[i] = JSON.parse(JSON.stringify(updatedGame)); // sanitize

            console.log(
              `🎯 Finished processing game: ${game.gameId} in league: ${leagueId}`
            );
          })
        );

        try {
          await leagueRef.update({ games: updatedGames });
          console.log(`💾 Updated games in league: ${leagueId}`);
        } catch (error) {
          console.error(`❌ Error updating league ${leagueId}:`, error);
        }
      })
    );

    console.log("✅ Auto-approval function finished.");
  } catch(error) {
    console.log("❌ Auto-approval function failed:", error);
  }
});


const { onCall } = require("firebase-functions/v2/https");

// Simple test function
exports.testFunction = onCall(async (request) => {
  return { message: "Test function works!" };
});