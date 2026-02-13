import { NormalizedCompetition } from "../types/competition";
import { ScoreboardProfile } from "../types/player";

export const getPlayerRankInCompetition = (
  competition: NormalizedCompetition,
  userId: string,
  participantsKey: string = "participants",
): number => {
  const participants = competition[
    participantsKey as keyof NormalizedCompetition
  ] as ScoreboardProfile[];

  if (!participants || participants.length === 0) {
    return 0;
  }

  const sortedParticipants = [...participants].sort((a, b) => {
    const winsA = a.numberOfWins || 0;
    const winsB = b.numberOfWins || 0;

    // Sort by wins first
    if (winsB !== winsA) {
      return winsB - winsA;
    }

    // Then by point difference
    const pdA = a.totalPointDifference || 0;
    const pdB = b.totalPointDifference || 0;

    if (pdB !== pdA) {
      return pdB - pdA;
    }

    // Finally by total points
    const pointsA = a.totalPoints || 0;
    const pointsB = b.totalPoints || 0;

    return pointsB - pointsA;
  });

  const rank =
    sortedParticipants.findIndex(
      (participant) => participant.userId === userId,
    ) + 1;

  return rank > 0 ? rank : 0;
};
