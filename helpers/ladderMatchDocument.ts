import { createLadderMatchGames, LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch, LadderMatchInput } from "@shared/types";

export interface BuildLadderMatchArgs {
  input: LadderMatchInput;
  userId: string;
  createdAt?: Date;
}

export const buildLadderMatchDocument = ({
  input,
  userId,
  createdAt = new Date(),
}: BuildLadderMatchArgs): Omit<LadderMatch, "ladderMatchId"> => ({
  court: input.court,
  bestOf: input.bestOf,
  matchDate: input.matchDate,
  matchTime: input.matchTime,
  courtFee: input.courtFee,
  currencyType: input.currencyType,
  shuttleType: input.shuttleType,
  games: createLadderMatchGames(input.bestOf),
  matchStatus: LADDER_MATCH_STATUS.POSTED,
  participants: [userId],
  createdBy: userId,
  createdAt,
});
