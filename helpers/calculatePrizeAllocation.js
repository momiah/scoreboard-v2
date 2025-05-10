export const calculatePrizeAllocation = async (
  leagueParticipants,
  prizePool,
  updatePlacementStats,
  prizeDistribution
) => {
  try {
    const topPlayers = leagueParticipants
      .sort((a, b) => b.XP - a.XP)
      .slice(0, 4);

    // Helper function to get the correct suffix
    const getSuffix = (num) => {
      if (num === 1) return "st";
      if (num === 2) return "nd";
      if (num === 3) return "rd";
      return "th";
    };

    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      const prizeXP = Math.floor(prizePool * prizeDistribution[i]);
      const placementNumber = i + 1;
      const placement = `${placementNumber}${getSuffix(placementNumber)}`;

      await updatePlacementStats(player.userId, prizeXP, placement);
    }
  } catch (error) {
    console.error("Error allocating prizes:", error);
  }
};
