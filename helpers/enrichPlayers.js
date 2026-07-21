/**
 * Enriches an array of player objects with their XP from user profile details.
 *
 * Fetches each player's user record and attaches their XP. Does NOT sort —
 * callers apply their own sort (e.g. sortPlayersByPlacement for prize ranking,
 * or wins → point difference → XP for full leaderboards).
 *
 * @async
 * @param {Function} getUserById - Async function that retrieves a user object given a user ID.
 * @param {Array<Object>} playersData - Array of player objects to enrich.
 * @returns {Promise<Array<Object>>} Promise resolving to the enriched (unsorted) player objects.
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
    }),
  );

  return enriched;
};
