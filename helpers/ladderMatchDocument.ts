import { createLadderMatchGames, LADDER_MATCH_STATUS, LADDER_TYPE } from "@shared";
import type { LadderMatch, LadderMatchInput, MatchTeam } from "@shared/types";

export interface BuildLadderMatchArgs {
  input: LadderMatchInput;
  userId: string;
  /** The match document id, used to give each game shell a stable gameId. */
  ladderMatchId?: string;
  createdAt?: Date;
  /**
   * Doubles: the poster's team. When set, the fixture is seeded as a doubles
   * match — its participants are the team's players and `teams[0]` records the
   * team so the opponent, score entry and scoring can resolve it.
   */
  team?: MatchTeam;
}

export const buildLadderMatchDocument = ({
  input,
  userId,
  ladderMatchId,
  createdAt = new Date(),
  team,
}: BuildLadderMatchArgs): Omit<LadderMatch, "ladderMatchId"> => ({
  court: input.court,
  bestOf: input.bestOf,
  matchDate: input.matchDate,
  matchTime: input.matchTime,
  courtFee: input.courtFee,
  currencyType: input.currencyType,
  shuttleType: input.shuttleType,
  games: createLadderMatchGames(input.bestOf, ladderMatchId),
  matchStatus: LADDER_MATCH_STATUS.POSTED,
  participants: team ? [...team.playerIds] : [userId],
  createdBy: userId,
  createdAt,
  ...(team ? { teams: [team], ladderType: LADDER_TYPE.DOUBLES } : {}),
});
