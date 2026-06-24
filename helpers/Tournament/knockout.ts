// helpers/generateKnockoutBrackets.ts
import moment from "moment";
import { Game, Fixtures, GameTeam } from "@shared";
import { generateUniqueGameId } from "../generateUniqueId";

interface BracketTeam {
  player1: GameTeam["player1"];
  player2: GameTeam["player2"];
}

interface BracketDisclaimer {
  heading: string;
  body: string;
}

interface BracketMetadata {
  totalRounds: number;
  totalTeams: number;
  totalGames: number;
  firstRoundGames: number;
  estimatedMinutes: number;
  estimatedHours: number;
  disclaimers: BracketDisclaimer[];
}

interface BracketResult {
  fixtures: Fixtures[];
  metadata: BracketMetadata;
}

const VALID_KNOCKOUT_TEAM_COUNTS = [4, 8, 16, 32] as const;
const VALID_KNOCKOUT_PLAYER_COUNTS = [8, 16, 32, 64] as const;

export const roundLabel = (teamsInRound: number): string => {
  if (teamsInRound === 2) return "Final";
  if (teamsInRound === 4) return "Semi-Final";
  if (teamsInRound === 8) return "Quarter-Final";
  return `Round of ${teamsInRound}`;
};

export const assignCourtForGameIndex = (
  gameIndex: number,
  numberOfCourts: number,
): number => (gameIndex % numberOfCourts) + 1;

const buildEmptyTeam = (): GameTeam => ({
  player1: null,
  player2: null,
});

const buildBaseGame = (
  gameNumber: number,
  competitionId: string,
  existingGames: Game[],
): Game => ({
  gameId: generateUniqueGameId({ existingGames, competitionId }),
  gameNumber,
  court: null,
  team1: buildEmptyTeam(),
  team2: buildEmptyTeam(),
  gamescore: "",
  createdAt: new Date(),
  createdTime: moment().format("HH:mm"),
  reportedAt: null,
  reportedTime: null,
  approvalStatus: "Scheduled",
  result: null,
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  reporter: "",
  isThirdPlacePlayoff: false,
  approvers: [],
});

export const generateKnockoutBrackets = ({
  teams,
  numberOfCourts,
  competitionId,
}: {
  teams: BracketTeam[];
  numberOfCourts: number;
  competitionId: string;
}): BracketResult => {
  const totalTeams = teams.length;

  const isValidTeamCount = VALID_KNOCKOUT_TEAM_COUNTS.includes(
    totalTeams as (typeof VALID_KNOCKOUT_TEAM_COUNTS)[number],
  );

  if (!isValidTeamCount) {
    throw new Error(
      `Knockout brackets require ${VALID_KNOCKOUT_PLAYER_COUNTS.join(
        ", ",
      )} players (${VALID_KNOCKOUT_TEAM_COUNTS.join(
        ", ",
      )} teams). Received ${totalTeams} teams.`,
    );
  }

  const totalRounds = Math.log2(totalTeams);
  const firstRoundGames = totalTeams / 2;
  const allCreatedGames: Game[] = [];
  const fixtures: Fixtures[] = [];

  let runningGameNumber = 1;

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const teamsInRound = totalTeams / 2 ** roundIndex;
    const gamesInRound = teamsInRound / 2;
    const roundGames: Game[] = [];
    const isFinalRound = roundIndex === totalRounds - 1;

    for (let gameIndex = 0; gameIndex < gamesInRound; gameIndex++) {
      const game = buildBaseGame(
        runningGameNumber++,
        competitionId,
        allCreatedGames,
      );

      if (roundIndex === 0) {
        const team1 = teams[gameIndex * 2];
        const team2 = teams[gameIndex * 2 + 1];
        game.team1 = { player1: team1.player1, player2: team1.player2 };
        game.team2 = { player1: team2.player1, player2: team2.player2 };
        game.court = assignCourtForGameIndex(gameIndex, numberOfCourts);
      }

      roundGames.push(game);
      allCreatedGames.push(game);
    }

    if (isFinalRound) {
      const playoff = buildBaseGame(
        runningGameNumber++,
        competitionId,
        allCreatedGames,
      );
      playoff.isThirdPlacePlayoff = true;
      roundGames.push(playoff);
      allCreatedGames.push(playoff);
    }

    fixtures.push({ round: roundIndex + 1, games: roundGames });
  }

  const disclaimers: BracketDisclaimer[] = [];

  const MINUTES_PER_GAME = 15;

  const totalGames = fixtures.reduce(
    (sum, round) => sum + round.games.length,
    0,
  );

  const estimatedMinutes = fixtures.reduce((sum, round) => {
    const waves = Math.ceil(round.games.length / numberOfCourts);
    return sum + waves * MINUTES_PER_GAME;
  }, 0);

  const estimatedHours = estimatedMinutes / 60;

  return {
    fixtures,
    metadata: {
      totalRounds,
      totalTeams,
      totalGames,
      firstRoundGames,
      estimatedMinutes,
      estimatedHours,
      disclaimers,
    },
  };
};

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
    (game) => String(game.approvalStatus) === "Approved" && !!game.result,
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
