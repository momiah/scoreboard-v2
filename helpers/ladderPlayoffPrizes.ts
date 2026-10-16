import {
  calculateLadderPrizePool,
  getEffectiveLadderSize,
  getLadderPayoutForPlace,
  getLadderPayouts,
  roundLabel,
} from "@shared/helpers";
import type { Ladder, LadderPlayoffTie } from "@shared/types";

export interface LadderPlacePrize {
  cash: number;
  cp: number;
}

type PrizeLadder = Pick<
  Ladder,
  "entryFee" | "participantCount" | "maxPlayers" | "playoffEntrantCount"
>;

const prizeSetup = (ladder: PrizeLadder) => {
  const registered = ladder.playoffEntrantCount ?? ladder.participantCount ?? 0;
  return {
    pool: calculateLadderPrizePool({
      entryFee: ladder.entryFee ?? 0,
      participantCount: registered,
    }),
    size: getEffectiveLadderSize(registered, ladder.maxPlayers),
  };
};

/**
 * Cash (paid ladders) and CP a finishing place is worth. CP is split exactly
 * like cash: the same payout bands and shares, applied to the CP pool.
 */
export const getLadderPlacePrize = (
  ladder: PrizeLadder,
  place: number,
): LadderPlacePrize => {
  const { pool, size } = prizeSetup(ladder);
  return {
    cash: pool.cash > 0 ? getLadderPayoutForPlace(pool.cash, size, place) : 0,
    cp: Math.round(getLadderPayoutForPlace(pool.xp, size, place)),
  };
};

/** The share of each pool that 1st to 4th place take, for the ladder's size. */
export const getLadderTopFourShares = (ladder: PrizeLadder): number[] =>
  getLadderPayouts(1, prizeSetup(ladder).size)
    .slice(0, 4)
    .map((payout) => payout.share);

const placeName = (place: number): string =>
  ["Champion", "Runner-up", "3rd place", "4th place"][place - 1] ??
  `${place}th`;

/** Who finishes in a band of places: the rounds they were knocked out in. */
const knockedOutIn = (fromPlace: number, toPlace: number): string => {
  if (fromPlace === toPlace && fromPlace <= 4) return placeName(fromPlace);
  const rounds: number[] = [];
  for (let players = 8; players <= toPlace; players *= 2) {
    if (players / 2 + 1 >= fromPlace) rounds.push(players);
  }
  if (rounds.length === 0) return `${fromPlace}th–${toPlace}th`;
  const first = roundLabel(rounds[0]);
  const last = roundLabel(rounds[rounds.length - 1]);
  return rounds.length === 1 ? first : `${first} to ${last}`;
};

export interface LadderPrizeRow {
  fromPlace: number;
  toPlace: number;
  label: string;
  cash: number;
  cp: number;
}

/** Every paid place of the ladder, with what each player or team takes. */
export const getLadderPrizeTable = (ladder: PrizeLadder): LadderPrizeRow[] => {
  const { pool, size } = prizeSetup(ladder);
  const cash = getLadderPayouts(pool.cash, size);
  return getLadderPayouts(pool.xp, size).map((cpBand, index) => ({
    fromPlace: cpBand.fromPlace,
    toPlace: cpBand.toPlace,
    label: knockedOutIn(cpBand.fromPlace, cpBand.toPlace),
    cash: pool.cash > 0 ? (cash[index]?.each ?? 0) : 0,
    cp: Math.round(cpBand.each),
  }));
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
