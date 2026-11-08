import { maxPlayers } from "@shared";
import { generateKnockoutBrackets, isKnockoutBracketSize } from "@shared/helpers";
import { Game, GameTeam } from "@shared/types";
import { generateUniqueGameId } from "../generateUniqueId";

const MIN_KNOCKOUT_SIDES = 4;

export const knockoutSideCounts = (tournamentType: string): number[] => {
  const playersPerSide = tournamentType === "Singles" ? 1 : 2;
  const largest = Math.max(...maxPlayers) / playersPerSide;
  const counts: number[] = [];
  for (let sides = MIN_KNOCKOUT_SIDES; sides <= largest; sides *= 2) {
    counts.push(sides);
  }
  return counts;
};

export const knockoutEntrantError = (
  tournamentType: string,
  numberOfParticipants: number,
): string | null => {
  if (numberOfParticipants % 2 !== 0) {
    return "Please ensure an even number of participants.";
  }
  const isSingles = tournamentType === "Singles";
  const sides = isSingles ? numberOfParticipants : numberOfParticipants / 2;
  if (sides >= MIN_KNOCKOUT_SIDES && isKnockoutBracketSize(sides)) return null;
  const unit = isSingles ? "players" : "teams";
  return `Knockout tournaments need ${knockoutSideCounts(tournamentType).join(", ")} ${unit}. You currently have ${sides}.`;
};

export const generateTournamentKnockoutBrackets = ({
  teams,
  numberOfCourts,
  competitionId,
}: {
  teams: Pick<GameTeam, "player1" | "player2">[];
  numberOfCourts: number;
  competitionId: string;
}) =>
  generateKnockoutBrackets({
    teams,
    numberOfCourts,
    createGameId: (existingGames: Game[]) =>
      generateUniqueGameId({ existingGames, competitionId }),
  });
