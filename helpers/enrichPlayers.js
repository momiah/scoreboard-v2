/**
 * Enriches an array of player objects with additional user XP data and sorts them.
 *
 * This function takes a function to fetch user data by ID and an array of player data.
 * It asynchronously enriches each player object with their corresponding XP from user profile details.
 * After enrichment, it sorts the players by number of wins, then by total point difference,
 * and finally by XP (all in descending order).
 *
 * @async
 * @param {Function} getUserById - Asynchronous function that retrieves a user object given a user ID.
 * @param {Array<Object>} playersData - Array of player objects to be enriched and sorted.
 * @returns {Promise<Array<Object>>} Promise that resolves to an array of enriched and sorted player objects.
 */
export const enrichPlayers = async (getUserById, playersData) => {
  const enriched = await Promise.all(
    playersData.map(async (player) => {
      const user = await getUserById(player.userId);
      const XP = user.profileDetail.XP;
      return {
        ...player,
        XP,
      };
    })
  );

  enriched.sort((a, b) => {
    if (b.numberOfWins !== a.numberOfWins) {
      return b.numberOfWins - a.numberOfWins;
    }
    if (b.totalPointDifference !== a.totalPointDifference) {
      return b.totalPointDifference - a.totalPointDifference;
    }
    return (b.XP || 0) - (a.XP || 0);
  });

  return enriched;
};
