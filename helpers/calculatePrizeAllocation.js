import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";

export const calculatePrizeAllocation = async ({
  leagueParticipants,
  prizePool,
  updatePlacementStats,
  prizeDistribution,
  leagueId,
}) => {
  try {
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

      await updatePlacementStats(player.userId, prizeXP, placement);
    }

    // Only update league flag ONCE after all users are updated
    const leagueDocRef = doc(db, "leagues", leagueId);

    await updateDoc(leagueDocRef, {
      prizesDistributed: true,
      prizeDistributionDate: new Date(),
    });
  } catch (error) {
    console.error("Error allocating prizes:", error);
    throw error;
  }
};
