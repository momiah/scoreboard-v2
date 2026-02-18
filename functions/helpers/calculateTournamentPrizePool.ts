type TournamentType = "Singles" | "Doubles";

const SINGLES_MULTIPLIER = 25;
const DOUBLES_MULTIPLIER = 150;

export const calculateTournamentPrizePool = (
  numberOfGames: number,
  tournamentType: TournamentType
): number => {
  const multiplier =
    tournamentType === "Doubles" ? DOUBLES_MULTIPLIER : SINGLES_MULTIPLIER;
  return numberOfGames * multiplier;
};
