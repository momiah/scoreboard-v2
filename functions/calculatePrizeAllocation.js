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

    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      const prizeXP = Math.floor(prizePool * prizeDistribution[i]);
      const placement = `${i + 1}st`;

      await updatePlacementStats(player.userId, prizeXP, placement);
    }
  } catch (error) {
    console.error("Error allocating prizes:", error);
  }
};
