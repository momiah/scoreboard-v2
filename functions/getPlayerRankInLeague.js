export const getPlayerRankInLeague = (league, userId) => {
  if (!league.leagueParticipants || league.leagueParticipants.length === 0) {
    return null;
  }

  // Create a shallow copy of the participants array and sort it
  const sortedParticipants = league.leagueParticipants.slice().sort((a, b) => {
    const totalA = a.XP + a.totalPoints;
    const totalB = b.XP + b.totalPoints;
    return totalB - totalA; // descending order
  });

  // Find the index of the current user; rank is index + 1
  const rank =
    sortedParticipants.findIndex(
      (participant) => participant.userId === userId
    ) + 1;
  return rank;
};
