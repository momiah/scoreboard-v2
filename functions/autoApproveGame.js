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
  const leaguesSnap = await db.collection("leagues").get();
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

      const updatedGames = [...games];

      const pendingIndexes = games
        .map((game, i) => ({ game, i }))
        .filter(({ game }) => {
          const createdAt = new Date(game.createdAt);
          const hoursPassed = (now - createdAt) / (1000 * 60 * 60);
          return (
            game.approvalStatus === "pending" &&
            hoursPassed >= 24 &&
            (game.numberOfDeclines || 0) === 0
          );
        });

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
            autoApprovedAt: new Date(),
          };

          console.log('Auto-approved at:', updatedGame.autoApprovedAt);
          

          const playersToUpdate = leagueParticipants.filter((player) =>
            updatedGame.result.winner.players
              .concat(updatedGame.result.loser.players)
              .includes(player.username)
          );

          const userIds = playersToUpdate.map((p) => p.userId);
          const usersToUpdate = await Promise.all(userIds.map(getUserById));

          const playerPerformance = calculatePlayerPerformance(
            updatedGame,
            playersToUpdate,
            usersToUpdate
          );

          await updatePlayers(playerPerformance.playersToUpdate, leagueId);
          await updateUsers(playerPerformance.usersToUpdate);

          const teamsToUpdate = await calculateTeamPerformance(
            updatedGame,
            retrieveTeams,
            leagueId
          );

          await updateTeams(teamsToUpdate, leagueId);

          updatedGames[i] = updatedGame;

          console.log(
            `✅ Auto-approved game: ${game.gameId} in league: ${leagueId}`
          );
        })
      );

      await leagueRef.update({ games: updatedGames });
    })
  );

  console.log("✅ Auto-approval function finished.");
});


const { onCall } = require("firebase-functions/v2/https");

// Simple test function
exports.testFunction = onCall(async (request) => {
  return { message: "Test function works!" };
});