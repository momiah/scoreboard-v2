import { generateKnockoutBrackets as generateSharedKnockoutBrackets } from "@shared/helpers";
import type {
  KnockoutBracketResult,
  KnockoutBracketTeam,
} from "@shared/helpers";
import { generateUniqueGameId } from "../generateUniqueId";

const VALID_KNOCKOUT_TEAM_COUNTS = [4, 8, 16, 32] as const;
const VALID_KNOCKOUT_PLAYER_COUNTS = [8, 16, 32, 64] as const;

export const generateKnockoutBrackets = ({
  teams,
  numberOfCourts,
  competitionId,
}: {
  teams: KnockoutBracketTeam[];
  numberOfCourts: number;
  competitionId: string;
}): KnockoutBracketResult => {
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

  return generateSharedKnockoutBrackets({
    teams,
    numberOfCourts,
    createGameId: (existingGames) =>
      generateUniqueGameId({ existingGames, competitionId }),
  });
};
