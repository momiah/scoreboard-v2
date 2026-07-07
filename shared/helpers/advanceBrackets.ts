import { Game, Fixtures } from "../types";
import { notificationTypes } from "../schema";

export const assignCourtForGameIndex = (
  gameIndex: number,
  numberOfCourts: number,
): number => (gameIndex % numberOfCourts) + 1;

export const roundLabel = (teamsInRound: number): string => {
  if (teamsInRound === 2) return "Final";
  if (teamsInRound === 4) return "Semi-Final";
  if (teamsInRound === 8) return "Quarter-Final";
  return `Round of ${teamsInRound}`;
};

export const isShellGame = (game: Game): boolean =>
  !game.team1.player1 && !game.team2.player1;

const teamFromWinner = (
  game: Game,
): {
  player1: Game["team1"]["player1"];
  player2: Game["team1"]["player2"];
} | null => {
  if (!game.result) return null;
  const winningSide =
    game.result.winner.team === "Team 1" ? game.team1 : game.team2;
  return { player1: winningSide.player1, player2: winningSide.player2 };
};

const teamFromLoser = (
  game: Game,
): {
  player1: Game["team1"]["player1"];
  player2: Game["team1"]["player2"];
} | null => {
  if (!game.result) return null;
  const losingSide =
    game.result.winner.team === "Team 1" ? game.team2 : game.team1;
  return { player1: losingSide.player1, player2: losingSide.player2 };
};

const fillNextRoundShells = (
  completedRoundGames: Game[],
  nextRoundGames: Game[],
): Game[] => {
  const nextIsFinalRound = nextRoundGames.some(
    (game) => game.isThirdPlacePlayoff,
  );

  if (nextIsFinalRound) {
    const [semiOne, semiTwo] = completedRoundGames;
    return nextRoundGames.map((shell) => {
      if (shell.isThirdPlacePlayoff) {
        return {
          ...shell,
          team1: teamFromLoser(semiOne) ?? shell.team1,
          team2: teamFromLoser(semiTwo) ?? shell.team2,
        };
      }
      return {
        ...shell,
        team1: teamFromWinner(semiOne) ?? shell.team1,
        team2: teamFromWinner(semiTwo) ?? shell.team2,
      };
    });
  }

  return nextRoundGames.map((shell, childIndex) => {
    const feederOne = completedRoundGames[childIndex * 2];
    const feederTwo = completedRoundGames[childIndex * 2 + 1];

    const winnerOne = feederOne ? teamFromWinner(feederOne) : null;
    const winnerTwo = feederTwo ? teamFromWinner(feederTwo) : null;

    return {
      ...shell,
      team1: winnerOne ?? shell.team1,
      team2: winnerTwo ?? shell.team2,
    };
  });
};

const allGamesApproved = (games: Game[]): boolean =>
  games.length > 0 &&
  games.every(
    (game) =>
      String(game.approvalStatus) ===
        notificationTypes.RESPONSE.APPROVED_GAME && !!game.result,
  );

const roundIsFull = (games: Game[]): boolean =>
  games.length > 0 &&
  games.every((game) => !!game.team1.player1 && !!game.team2.player1);

export const advanceBrackets = ({
  fixtures,
  numberOfCourts,
}: {
  fixtures: Fixtures[];
  numberOfCourts: number;
}): Fixtures[] => {
  const updated: Fixtures[] = fixtures.map((round) => ({
    round: round.round,
    games: round.games.map((game) => ({ ...game })),
  }));

  for (let roundIndex = 0; roundIndex < updated.length - 1; roundIndex++) {
    const currentRound = updated[roundIndex];
    const nextRound = updated[roundIndex + 1];

    if (!allGamesApproved(currentRound.games)) continue;

    nextRound.games = fillNextRoundShells(currentRound.games, nextRound.games);

    const nextRoundHasCourts = nextRound.games.some(
      (game) => game.court !== null,
    );

    if (roundIsFull(nextRound.games) && !nextRoundHasCourts) {
      nextRound.games = nextRound.games.map((game, gameIndex) => ({
        ...game,
        court: assignCourtForGameIndex(gameIndex, numberOfCourts),
      }));
    }
  }

  return updated;
};
