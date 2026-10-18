import { getPlayoffTieRoute } from "./playoffTieRoute";

describe("getPlayoffTieRoute", () => {
  it("opens the tie screen for a notification about a tie", () => {
    expect(
      getPlayoffTieRoute({ ladderId: "L1", tieId: "r1-s1", tab: "Playoffs" }),
    ).toEqual({
      name: "PlayoffMatchDetails",
      params: { ladderId: "L1", tieId: "r1-s1" },
    });
  });

  it("leaves everything else to the usual routing", () => {
    expect(getPlayoffTieRoute({ ladderId: "L1", tab: "Playoffs" })).toBeNull();
    expect(
      getPlayoffTieRoute({ ladderId: "L1", tieId: "r4-s0", tab: "Summary" }),
    ).toBeNull();
    expect(getPlayoffTieRoute({ tieId: "r1-s1", tab: "Playoffs" })).toBeNull();
    expect(getPlayoffTieRoute(undefined)).toBeNull();
  });
});
