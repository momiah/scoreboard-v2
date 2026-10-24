import { courtTimeHint, recommendedCourtMinutes } from "./ladderCourtTime";

describe("recommendedCourtMinutes", () => {
  it("allows about 15 minutes a game, rounded up to the half hour", () => {
    expect([1, 5, 7, 9, 11].map(recommendedCourtMinutes)).toEqual([30, 90, 120, 150, 180]);
  });
});

describe("courtTimeHint", () => {
  it("reads naturally for each best-of", () => {
    expect(courtTimeHint(5)).toBe(
      "Book enough court time to finish: about 1.5 hours for best of 5",
    );
    expect(courtTimeHint(7)).toBe(
      "Book enough court time to finish: about 2 hours for best of 7",
    );
    expect(courtTimeHint(1)).toBe(
      "Book enough court time to finish: about 0.5 hours for best of 1",
    );
  });
});
