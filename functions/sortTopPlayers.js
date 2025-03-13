//Sorts the top players by XP and number of wins
export const sortTopPlayers = (users) => {
  if (!users || !Array.isArray(users)) return [];

  return users
    .filter((user) => user.profileDetail) // Ensure profileDetail exists
    .sort((a, b) => {
      if (b.profileDetail.XP !== a.profileDetail.XP) {
        return b.profileDetail.XP - a.profileDetail.XP; // Sort by XP descending
      }
      return b.profileDetail.numberOfWins - a.profileDetail.numberOfWins; // Sort by Wins descending
    });
};
