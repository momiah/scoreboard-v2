export const getPlayerRankInCompetition = (
  competition,
  userId,
  participantsKey = "leagueParticipants"
) => {
  const participants = competition[participantsKey];

  if (!participants || participants.length === 0) {
    return null;
  }

  const sortedParticipants = [...participants].sort((a, b) => {
    const winsA = a.numberOfWins;
    const winsB = b.numberOfWins;

    if (winsB !== winsA) {
      return winsB - winsA;
    }

    const pdA = a.totalPointDifference || 0;
    const pdB = b.totalPointDifference || 0;

    if (pdB !== pdA) {
      return pdB - pdA;
    }

    const pointsA = a.totalPoints || 0;
    const pointsB = b.totalPoints || 0;

    return pointsB - pointsA;
  });

  const rank =
    sortedParticipants.findIndex(
      (participant) => participant.userId === userId
    ) + 1;

  return rank;
};
