import {
  getLadderPlacePrize,
  getLadderPrizeTable,
  getLadderTiePrizes,
  getLadderTopFourShares,
} from "./ladderPlayoffPrizes";
import { ladderEntrantNoun } from "./ladderEntrantNoun";

// 256 × £20 less the 10% platform fee = £4,608 cash; 256 × 50 = 12,800 CP.
const paid256 = { entryFee: 20, participantCount: 256, maxPlayers: 256 };
const free256 = { entryFee: 0, participantCount: 256, maxPlayers: 256 };
const paid2048 = { entryFee: 20, participantCount: 2048, maxPlayers: 2048 };

describe("getLadderPlacePrize", () => {
  it("pays cash and CP by the same bands", () => {
    expect(getLadderPlacePrize(paid256, 1)).toEqual({
      cash: 4608 * 0.35,
      cp: 4480,
    });
    expect(getLadderPlacePrize(paid256, 2)).toEqual({
      cash: 4608 * 0.2,
      cp: 2560,
    });
    expect(getLadderPlacePrize(paid256, 8)).toEqual({
      cash: (4608 * 0.25) / 4,
      cp: 800,
    });
    expect(getLadderPlacePrize(paid256, 16)).toEqual({ cash: 0, cp: 0 });
  });

  it("pays only CP on a free ladder, by the same bands", () => {
    expect(getLadderPlacePrize(free256, 1)).toEqual({ cash: 0, cp: 4480 });
    expect(getLadderPlacePrize(free256, 8)).toEqual({ cash: 0, cp: 800 });
  });
});

describe("getLadderTiePrizes", () => {
  it("shows what reaching a round secures and what winning it adds", () => {
    expect(
      getLadderTiePrizes(paid256, { round: 1, isThirdPlacePlayoff: false }, 4),
    ).toMatchObject({
      roundName: "Round of 16",
      nextName: "Quarter-Final",
      secured: { cash: 0, cp: 0 },
      next: { cash: (4608 * 0.25) / 4, cp: 800 },
    });
    expect(
      getLadderTiePrizes(paid256, { round: 4, isThirdPlacePlayoff: false }, 4),
    ).toMatchObject({
      nextName: "Champion",
      secured: { cash: 4608 * 0.2, cp: 2560 },
      next: { cash: 4608 * 0.35, cp: 4480 },
    });
    expect(
      getLadderTiePrizes(paid256, { round: 4, isThirdPlacePlayoff: true }, 4),
    ).toMatchObject({
      nextName: "3rd place",
      secured: { cash: 4608 * 0.08, cp: 1024 },
      next: { cash: 4608 * 0.12, cp: 1536 },
    });
  });
});

describe("getLadderPrizeTable", () => {
  it("lists every paid place with what each takes, named by the round they went out in", () => {
    expect(getLadderPrizeTable(paid256)).toEqual([
      {
        fromPlace: 1,
        toPlace: 1,
        label: "Champion",
        cash: 4608 * 0.35,
        cp: 4480,
      },
      {
        fromPlace: 2,
        toPlace: 2,
        label: "Runner-up",
        cash: 4608 * 0.2,
        cp: 2560,
      },
      {
        fromPlace: 3,
        toPlace: 3,
        label: "3rd place",
        cash: 4608 * 0.12,
        cp: 1536,
      },
      {
        fromPlace: 4,
        toPlace: 4,
        label: "4th place",
        cash: 4608 * 0.08,
        cp: 1024,
      },
      {
        fromPlace: 5,
        toPlace: 8,
        label: "Quarter-Final",
        cash: (4608 * 0.25) / 4,
        cp: 800,
      },
    ]);
    expect(getLadderPrizeTable(paid2048).map((row) => row.label)).toEqual([
      "Champion",
      "Runner-up",
      "3rd place",
      "4th place",
      "Quarter-Final to Round of 32",
      "Round of 64",
    ]);
    expect(getLadderPrizeTable(free256).every((row) => row.cash === 0)).toBe(
      true,
    );
  });
});

describe("getLadderTopFourShares", () => {
  it("uses #53's top-four shares for the ladder's size", () => {
    expect(getLadderTopFourShares(paid256)).toEqual([0.35, 0.2, 0.12, 0.08]);
    expect(getLadderTopFourShares(paid2048)).toEqual([0.35, 0.2, 0.1, 0.05]);
  });
});

describe("ladderEntrantNoun", () => {
  it("says team in doubles and player in singles", () => {
    expect(ladderEntrantNoun("Doubles")).toBe("team");
    expect(ladderEntrantNoun("Singles")).toBe("player");
    expect(ladderEntrantNoun(undefined)).toBe("player");
  });
});
