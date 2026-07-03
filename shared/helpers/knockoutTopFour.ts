import { Fixtures, Game } from "../types";
import { notificationTypes } from "../schema";

const teamUserIds = (team: Game["team1"]): string[] =>
  [team.player1?.userId, team.player2?.userId].filter(
    (id): id is string => !!id,
  );

const winnerIds = (game: Game): string[] => {
  if (!game.result) return [];
  return game.result.winner.team === "Team 1"
    ? teamUserIds(game.team1)
    : teamUserIds(game.team2);
};

const loserIds = (game: Game): string[] => {
  if (!game.result) return [];
  return game.result.winner.team === "Team 1"
    ? teamUserIds(game.team2)
    : teamUserIds(game.team1);
};

export interface KnockoutTopFour {
  first: string[] | null;
  second: string[] | null;
  third: string[] | null;
  fourth: string[] | null;
}

// Reads final positions off the bracket structure.
// 1st/2nd from the Final; 3rd/4th from the 3rd/4th playoff.
// Each position holds one userId for singles, two for doubles.
export const getKnockoutTopFour = (fixtures: Fixtures[]): KnockoutTopFour => {
  const empty: KnockoutTopFour = {
    first: null,
    second: null,
    third: null,
    fourth: null,
  };
  if (!fixtures.length) return empty;

  const finalRound = fixtures[fixtures.length - 1];
  const final = finalRound.games.find((g) => !g.isThirdPlacePlayoff);
  const bronze = finalRound.games.find((g) => g.isThirdPlacePlayoff);

  return {
    first: final?.result ? winnerIds(final) : null,
    second: final?.result ? loserIds(final) : null,
    third: bronze?.result ? winnerIds(bronze) : null,
    fourth: bronze?.result ? loserIds(bronze) : null,
  };
};

// Guard used by prize distribution / completion detection.
export const isKnockoutComplete = (fixtures: Fixtures[]): boolean => {
  if (!fixtures.length) return false;
  const finalRound = fixtures[fixtures.length - 1];
  const finalGame = finalRound.games.find((g) => !g.isThirdPlacePlayoff);
  const bronzeGame = finalRound.games.find((g) => g.isThirdPlacePlayoff);
  const isApproved = (status?: string) =>
    status === notificationTypes.RESPONSE.APPROVED_GAME;
  return (
    isApproved(finalGame?.approvalStatus) &&
    isApproved(bronzeGame?.approvalStatus)
  );
};
