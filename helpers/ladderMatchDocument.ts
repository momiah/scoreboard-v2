import { createLadderMatchGames, LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch, LadderMatchInput } from "@shared/types";

export interface BuildLadderMatchArgs {
  input: LadderMatchInput;
  userId: string;
  createdAt?: Date;
}

/**
 * Build the LadderMatch document body for a freshly posted match (everything
 * except the Firestore-assigned `ladderMatchId`). The poster is seeded as the
 * sole participant/creator, the games are derived as `bestOf` shells and the
 * status starts as "posted".
 */
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
