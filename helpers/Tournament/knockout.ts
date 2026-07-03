// helpers/generateKnockoutBrackets.ts
import moment from "moment";
import { Game, Fixtures, GameTeam } from "@shared";
import { assignCourtForGameIndex } from "@shared/helpers";
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
