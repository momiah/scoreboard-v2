import { teamHasLadderMatch } from "./teamLadderActivity";

const match = (participants) => ({ participants });

describe("teamHasLadderMatch", () => {
  const teamIds = ["u1", "u2"];

  it("is false when the team has no matches", () => {
    expect(teamHasLadderMatch([], teamIds)).toBe(false);
  });

  it("is false when matches involve neither member", () => {
    expect(
      teamHasLadderMatch([match(["u3", "u4", "u5", "u6"])], teamIds),
    ).toBe(false);
  });

  it("is true for a posted/scheduled match involving the team", () => {
    // Only the team's members so far (their posted match, not yet accepted).
    expect(teamHasLadderMatch([match(["u1", "u2"])], teamIds)).toBe(true);
  });

  it("is true when a member appears alongside an opponent team", () => {
    expect(
      teamHasLadderMatch([match(["u3", "u4", "u1", "u2"])], teamIds),
    ).toBe(true);
  });

  it("is true when only one member is present", () => {
    expect(teamHasLadderMatch([match(["u1", "u3"])], teamIds)).toBe(true);
  });

  it("guards empty player ids", () => {
    expect(teamHasLadderMatch([match(["u1"])], [])).toBe(false);
  });
});
