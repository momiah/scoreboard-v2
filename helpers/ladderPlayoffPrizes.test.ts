import {
  getLadderPlacePrize,
  getLadderPrizeBands,
  getLadderPrizeSetup,
} from "@shared/helpers";
import { PAYOUT_STRUCTURE } from "@shared/types";
import {
  getLadderPrizeTable,
  getLadderTiePrizes,
  getLadderTopFourPrizes,
} from "./ladderPlayoffPrizes";
import { ladderEntrantNoun } from "./ladderEntrantNoun";

const ladderOf = (
  entryFee: number,
  size: number,
  payoutStructure: (typeof PAYOUT_STRUCTURE)[keyof typeof PAYOUT_STRUCTURE],
) => ({ entryFee, participantCount: size, maxPlayers: size, payoutStructure });

const paid256 = ladderOf(20, 256, PAYOUT_STRUCTURE.PROGRESSIVE);
const free256 = ladderOf(0, 256, PAYOUT_STRUCTURE.LINEAR);
const paid2048 = ladderOf(20, 2048, PAYOUT_STRUCTURE.LINEAR);

describe("getLadderTiePrizes", () => {
  it("shows what reaching a round secures and what winning it adds", () => {
    expect(
      getLadderTiePrizes(paid256, { round: 1, isThirdPlacePlayoff: false }, 4),
    ).toEqual({
      roundName: "Round of 16",
      nextName: "Quarter-Final",
      secured: getLadderPlacePrize(paid256, 16),
      next: getLadderPlacePrize(paid256, 8),
    });
    expect(
      getLadderTiePrizes(paid256, { round: 4, isThirdPlacePlayoff: false }, 4),
    ).toEqual({
      roundName: "Final",
      nextName: "Champion",
      secured: getLadderPlacePrize(paid256, 2),
      next: getLadderPlacePrize(paid256, 1),
    });
    expect(
      getLadderTiePrizes(paid256, { round: 4, isThirdPlacePlayoff: true }, 4),
    ).toMatchObject({
      nextName: "3rd place",
      secured: getLadderPlacePrize(paid256, 4),
      next: getLadderPlacePrize(paid256, 3),
    });
  });

  it("gives a Round of 16 loser CP under linear and nothing under progressive", () => {
    const tie = { round: 1, isThirdPlacePlayoff: false };
    expect(getLadderTiePrizes(free256, tie, 4).secured.cp).toBeGreaterThan(0);
    expect(getLadderTiePrizes(paid256, tie, 4).secured).toEqual({
      cash: 0,
      cp: 0,
    });
  });
});

describe("getLadderPrizeTable", () => {
  it("labels places 1st to 4th, then Joint Nth for each round, ending a cash table at its last cash place", () => {
    expect(getLadderPrizeTable(paid256).map((row) => row.label)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "Joint 5th",
    ]);
    expect(getLadderPrizeTable(free256).map((row) => row.label)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "Joint 5th",
      "Joint 9th",
    ]);
    expect(getLadderPrizeTable(paid2048).map((row) => row.label)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "Joint 5th",
      "Joint 9th",
      "Joint 17th",
      "Joint 33rd",
    ]);
  });

  it("pays each band what the ladder's payout structure gives it", () => {
    for (const ladder of [paid256, free256, paid2048]) {
      const { pool, size } = getLadderPrizeSetup(ladder);
      expect(getLadderPrizeTable(ladder)).toEqual(
        getLadderPrizeBands(pool, size, ladder.payoutStructure).map(
          (band) => expect.objectContaining(band),
        ),
      );
    }
    expect(getLadderPrizeTable(free256).every((row) => row.cash === 0)).toBe(
      true,
    );
  });
});

describe("getLadderTopFourPrizes", () => {
  it("gives the prizes for 1st to 4th", () => {
    expect(getLadderTopFourPrizes(paid256)).toEqual(
      [1, 2, 3, 4].map((place) => getLadderPlacePrize(paid256, place)),
    );
  });
});

describe("ladderEntrantNoun", () => {
  it("says team in doubles and player in singles", () => {
    expect(ladderEntrantNoun("Doubles")).toBe("team");
    expect(ladderEntrantNoun("Singles")).toBe("player");
    expect(ladderEntrantNoun(undefined)).toBe("player");
  });
});
