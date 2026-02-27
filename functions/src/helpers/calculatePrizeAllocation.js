const admin = require("firebase-admin");
const { notificationTypes } = require("../schemas/schema");
const { sendNotification } = require("./sendNotification");

const calculatePrizeAllocation = async ({
  leagueParticipants,
  prizePool,
  prizeDistribution,
  leagueId,
  leagueName,
}) => {
  const db = admin.firestore(); // ← moved here
  try {
    console.log(`Calculating prize allocation for league ${leagueId}...`);

    leagueParticipants.sort((a, b) => {
      if (b.numberOfWins !== a.numberOfWins) {
        return b.numberOfWins - a.numberOfWins;
      }
      if (b.totalPointDifference !== a.totalPointDifference) {
        return b.totalPointDifference - a.totalPointDifference;
      }
      return (b.XP || 0) - (a.XP || 0);
    });

    const placementKeys = ["first", "second", "third", "fourth"];
    const finalists = leagueParticipants.slice(0, 4);

    console.log("finalists:", finalists);

    for (let index = 0; index < finalists.length; index++) {
      const player = finalists[index];
      const placementKey = placementKeys[index];
      const prizeXP = Math.floor(prizePool * (prizeDistribution[index] || 0));

      const userRef = db.collection("users").doc(player.userId);
      await userRef.update({
        "profileDetail.XP": admin.firestore.FieldValue.increment(prizeXP),
        [`profileDetail.leagueStats.${placementKey}`]:
          admin.firestore.FieldValue.increment(1),
      });

      console.log(
        `+${prizeXP} XP -> user ${player.userId} (${player.displayName}) (${placementKey})`,
      );

      await sendNotification({
        createdAt: new Date(),
        type: notificationTypes.INFORMATION.LEAGUE.TYPE,
        message: `You have placed ${placementKey} in ${leagueName} and won ${prizeXP} XP!`,
        isRead: false,
        senderId: "system",
        recipientId: player.userId,
        data: {
          leagueId: leagueId,
        },
        response: "",
      });
    }

    await db.collection("leagues").doc(leagueId).update({
      prizesDistributed: true,
      prizeDistributionDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Prizes distributed for league ${leagueId}`);
  } catch (error) {
    console.error("Error allocating prizes:", error);
  }
};

module.exports = { calculatePrizeAllocation };
