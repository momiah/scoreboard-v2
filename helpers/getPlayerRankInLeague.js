export const getPlayerRankInLeague = (league, userId) => {
  if (!league.leagueParticipants || league.leagueParticipants.length === 0) {
    return null;
  }

  // Create a proper shallow copy of the participants array before sorting
  const sortedParticipants = [...league.leagueParticipants].sort((a, b) => {
    // Primary sort: by number of wins (descending - highest wins first)
    const winsA = a.numberOfWins;
    const winsB = b.numberOfWins;
    
    if (winsB !== winsA) {
      return winsB - winsA;
    }
    
    // Tiebreaker 1: by total point difference (descending - higher is better)
    const pdA = a.totalPointDifference || 0;
    const pdB = b.totalPointDifference || 0;
    
    if (pdB !== pdA) {
      return pdB - pdA;
    }
    
    // Tiebreaker 2: by total points scored (descending - higher is better)
    const pointsA = a.totalPoints || 0;
    const pointsB = b.totalPoints || 0;
    
    return pointsB - pointsA;
  });

  // Find the index of the current user; rank is index + 1
  const rank = sortedParticipants.findIndex(
    (participant) => participant.userId === userId
  ) + 1;
  
  return rank;
};