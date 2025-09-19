const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

const { calculatePrizeAllocation, parseDDMMYYYY } = require("./helpers/calculatePrizeAllocation");

const db = admin.firestore();

exports.distributePrizes = onSchedule("every 1 hours", async () => {
    const today = new Date();

    try {
      const leaguesSnapshot = await db
        .collection("leagues")
        .where("prizesDistributed", "==", false)
        .get();

      for (const doc of leaguesSnapshot.docs) {
        const league = doc.data();
        const leagueId = doc.id;

        // Check if league endDate has passed
        const endDate = parseDDMMYYYY(league.endDate);
        
        if (today >= endDate) {
          await calculatePrizeAllocation({
            leagueParticipants: league.leagueParticipants || [],
            prizePool: league.entryFee || 0, // or prizePool field if exists
            prizeDistribution: [0.4, 0.3, 0.2, 0.1], // can fetch from league doc
            leagueId,
          });
        }
      }
    } catch (error) {
      console.error("Error distributing prizes:", error);
    }

    return null;
  });
