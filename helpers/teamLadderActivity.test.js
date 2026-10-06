import { LADDER_STATUS } from "@shared/types";
import { isTeamLockedInLadder, teamHasLadderMatch } from "./teamLadderActivity";

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

describe("isTeamLockedInLadder", () => {
  const ladder = (status) => ({ status });

  it("lets a team leave while registration is open", () => {
    expect(isTeamLockedInLadder([ladder(LADDER_STATUS.REGISTRATION_OPEN)])).toBe(
      false,
    );
  });

  it("locks a team once registration has closed or playoffs are on", () => {
    expect(
      isTeamLockedInLadder([ladder(LADDER_STATUS.REGISTRATION_CLOSED)]),
    ).toBe(true);
    expect(isTeamLockedInLadder([ladder(LADDER_STATUS.PLAYOFFS)])).toBe(true);
  });

  it("frees a team once the ladder is completed or cancelled", () => {
    expect(
      isTeamLockedInLadder([
        ladder(LADDER_STATUS.COMPLETED),
        ladder(LADDER_STATUS.CANCELLED),
      ]),
    ).toBe(false);
  });

  it("locks when any of the team's ladders has closed", () => {
    expect(
      isTeamLockedInLadder([
        ladder(LADDER_STATUS.REGISTRATION_OPEN),
        ladder(LADDER_STATUS.REGISTRATION_CLOSED),
      ]),
    ).toBe(true);
    expect(isTeamLockedInLadder([])).toBe(false);
  });
});
