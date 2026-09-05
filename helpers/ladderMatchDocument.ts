import { createLadderMatchGames, LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch, LadderMatchInput } from "@shared/types";

export interface BuildLadderMatchArgs {
  input: LadderMatchInput;
  userId: string;
  /** The match document id, used to give each game shell a stable gameId. */
  ladderMatchId?: string;
  createdAt?: Date;
}

export const buildLadderMatchDocument = ({
  input,
  userId,
  ladderMatchId,
  createdAt = new Date(),
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
  participants: [userId],
  createdBy: userId,
  createdAt,
});
