import { getLadderPlacePrize, getLadderTiePrizes } from "./ladderPlayoffPrizes";
import { ladderEntrantNoun } from "./ladderEntrantNoun";

const paid256 = { entryFee: 20, participantCount: 256, maxPlayers: 256 };
const free256 = { entryFee: 0, participantCount: 256, maxPlayers: 256 };

describe("getLadderPlacePrize", () => {
  it("pays cash by #53's bands and CP to the top four", () => {
    // Pool £4,608 (256 × £20 less 10%), 12,800 CP (256 × 50).
    expect(getLadderPlacePrize(paid256, 1)).toEqual({
      cash: 4608 * 0.35,
      cp: 5120,
    });
    expect(getLadderPlacePrize(paid256, 2)).toEqual({
      cash: 4608 * 0.2,
      cp: 3840,
    });
    expect(getLadderPlacePrize(paid256, 8)).toEqual({
      cash: (4608 * 0.25) / 4,
      cp: 0,
    });
    expect(getLadderPlacePrize(paid256, 16)).toEqual({ cash: 0, cp: 0 });
  });

  it("pays only CP on a free ladder", () => {
    expect(getLadderPlacePrize(free256, 1)).toEqual({ cash: 0, cp: 5120 });
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
      next: { cash: (4608 * 0.25) / 4, cp: 0 },
    });
    expect(
      getLadderTiePrizes(paid256, { round: 4, isThirdPlacePlayoff: false }, 4),
    ).toMatchObject({
      nextName: "Champion",
      secured: { cash: 4608 * 0.2 },
      next: { cash: 4608 * 0.35 },
    });
    expect(
      getLadderTiePrizes(paid256, { round: 4, isThirdPlacePlayoff: true }, 4),
    ).toMatchObject({
      nextName: "3rd place",
      secured: { cash: 4608 * 0.08 },
      next: { cash: 4608 * 0.12 },
    });
  });
});

describe("ladderEntrantNoun", () => {
  it("says team in doubles and player in singles", () => {
    expect(ladderEntrantNoun("Doubles")).toBe("team");
    expect(ladderEntrantNoun("Singles")).toBe("player");
    expect(ladderEntrantNoun(undefined)).toBe("player");
  });
});
