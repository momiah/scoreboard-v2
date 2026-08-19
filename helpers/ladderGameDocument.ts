import { createLadderGameShells, LADDER_GAME_STATUS } from "@shared";
import type { LadderGame, LadderGameInput } from "@shared/types";

export interface BuildLadderGameArgs {
  input: LadderGameInput;
  userId: string;
  createdAt?: Date;
}

/**
 * Build the LadderGame document body for a freshly posted game (everything
 * except the Firestore-assigned `ladderGameId`). The poster is seeded as the
 * sole participant/creator, the games are derived as `bestOf` shells and the
 * status starts as "posted".
 */
export const buildLadderGameDocument = ({
  input,
  userId,
  createdAt = new Date(),
}: BuildLadderGameArgs): Omit<LadderGame, "ladderGameId"> => ({
  court: input.court,
  bestOf: input.bestOf,
  courtFee: input.courtFee,
  currencyType: input.currencyType,
  shuttleType: input.shuttleType,
  games: createLadderGameShells(input.bestOf),
  gameStatus: LADDER_GAME_STATUS.POSTED,
  participants: [userId],
  createdBy: userId,
  createdAt,
});
