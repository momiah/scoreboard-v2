import {
  calculateLadderPrizePool,
  getEffectiveLadderSize,
  getLadderPayoutForPlace,
  roundLabel,
} from "@shared/helpers";
import type { Ladder, LadderPlayoffTie } from "@shared/types";

import { LADDER_DISTRIBUTION } from "./ladderPrizeDistribution";

export interface LadderPlacePrize {
  cash: number;
  cp: number;
}

type PrizeLadder = Pick<
  Ladder,
  "entryFee" | "participantCount" | "maxPlayers" | "playoffEntrantCount"
>;

/** Cash (paid ladders) and CP a finishing place in the playoffs is worth. */
export const getLadderPlacePrize = (
  ladder: PrizeLadder,
  place: number,
): LadderPlacePrize => {
  const registered = ladder.playoffEntrantCount ?? ladder.participantCount ?? 0;
  const pool = calculateLadderPrizePool({
    entryFee: ladder.entryFee ?? 0,
    participantCount: registered,
  });
  const size = getEffectiveLadderSize(registered, ladder.maxPlayers);
  return {
    cash: pool.cash > 0 ? getLadderPayoutForPlace(pool.cash, size, place) : 0,
    cp: Math.round(pool.xp * (LADDER_DISTRIBUTION[place - 1] ?? 0)),
  };
};

export interface LadderTiePrizes {
  secured: LadderPlacePrize;
  next: LadderPlacePrize;
  roundName: string;
  nextName: string;
}

/**
 * What a tie is worth: the prize already secured by reaching its round (the
 * worst place its loser can finish) and what winning it raises that to.
 */
export const getLadderTiePrizes = (
  ladder: PrizeLadder,
  tie: Pick<LadderPlayoffTie, "round" | "isThirdPlacePlayoff">,
  totalRounds: number,
): LadderTiePrizes => {
  if (tie.isThirdPlacePlayoff) {
    return {
      secured: getLadderPlacePrize(ladder, 4),
      next: getLadderPlacePrize(ladder, 3),
      roundName: "3rd-place game",
      nextName: "3rd place",
    };
  }
  const playersInRound = 2 ** (totalRounds - tie.round + 1);
  const isFinal = playersInRound === 2;
  return {
    secured: getLadderPlacePrize(ladder, playersInRound),
    next: getLadderPlacePrize(ladder, playersInRound / 2),
    roundName: roundLabel(playersInRound),
    nextName: isFinal ? "Champion" : roundLabel(playersInRound / 2),
  };
};
