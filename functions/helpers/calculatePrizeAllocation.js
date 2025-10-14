const admin = require("firebase-admin");
const db = admin.firestore();


function parseDDMMYYYY(dateStr) {
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day); // JS months are 0-based
}

const calculatePrizeAllocation = async ({
  leagueParticipants,
  prizePool,
  prizeDistribution,
  leagueId,
}) => {
  try {
    // Sort participants by XP, top 4
    const topPlayers = leagueParticipants
      .sort((a, b) => b.XP - a.XP)
      .slice(0, 4);

    const getSuffix = (num) => {
      if (num === 1) return "st";
      if (num === 2) return "nd";
      if (num === 3) return "rd";
      return "th";
    };

    // Update all users first
    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      const prizeXP = Math.floor(prizePool * prizeDistribution[i]);
      const placementNumber = i + 1;
      const placement = `${placementNumber}${getSuffix(placementNumber)}`;

      const userRef = db.collection("users").doc(player.userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        await userRef.update({
          "profileDetail.XP": admin.firestore.FieldValue.increment(prizeXP),
          [`profileDetail.leagueStats.${placementNumber}`]:
            admin.firestore.FieldValue.increment(1),
        });
        console.log(`✅ Allocated ${prizeXP} XP to user ${player.userId} (${placement})`);
      } else {
        console.warn(`⚠️ Skipping prize allocation, user not found: ${player.userId}`);
      }

      // Update user stats
      // await db.collection("users").doc(player.userId).update({
      //   "profileDetail.XP": admin.firestore.FieldValue.increment(prizeXP),
      //   [`profileDetail.leagueStats.${placementNumber}`]:
      //     admin.firestore.FieldValue.increment(1),
      // });
    }

    // Update league status
    const leagueDocRef = db.collection("leagues").doc(leagueId);
    await leagueDocRef.update({
      prizesDistributed: true,
      prizeDistributionDate: new Date(),
    });

    console.log(`Prizes distributed for league ${leagueId}`);
  } catch (error) {
    console.error("Error allocating prizes:", error);
  }
};


module.exports = { calculatePrizeAllocation, parseDDMMYYYY };
