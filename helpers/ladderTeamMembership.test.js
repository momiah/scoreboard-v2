import {
  teamMemberIds,
  findLadderMemberConflicts,
  canTeamJoinLadder,
} from "./ladderTeamMembership";

describe("teamMemberIds", () => {
  it("prefers the flat playerIds array", () => {
    const team = {
      playerIds: ["u1", "u2"],
      players: [{ userId: "ignored" }],
    };
    expect(teamMemberIds(team)).toEqual(["u1", "u2"]);
  });

  it("falls back to the players list when playerIds is missing", () => {
    const team = {
      players: [{ userId: "u1" }, { userId: "u2" }],
    };
    expect(teamMemberIds(team)).toEqual(["u1", "u2"]);
  });

  it("drops falsy ids from either source", () => {
    expect(teamMemberIds({ playerIds: ["u1", "", undefined] })).toEqual(["u1"]);
    expect(
      teamMemberIds({ players: [{ userId: "u1" }, { userId: undefined }] }),
    ).toEqual(["u1"]);
  });
});

describe("findLadderMemberConflicts", () => {
  it("returns nothing when neither player is already in the ladder", () => {
    expect(findLadderMemberConflicts(["u1", "u2"], ["u3", "u4"])).toEqual([]);
  });

  it("flags the creating player when they already joined with this team", () => {
    // u1 is already in the ladder (their team entered) → cannot rejoin.
    expect(findLadderMemberConflicts(["u1", "u2"], ["u1", "u2"])).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("flags a single overlapping player from another team", () => {
    // u2 is in the ladder via a different team; the new team shares u2.
    expect(findLadderMemberConflicts(["u1", "u2"], ["u2"])).toEqual(["u2"]);
  });

  it("does not double-report the same overlapping id", () => {
    expect(findLadderMemberConflicts(["u1", "u1"], ["u1"])).toEqual(["u1"]);
  });
});

describe("canTeamJoinLadder", () => {
  it("allows a team when neither player is in the ladder", () => {
    expect(canTeamJoinLadder(["u1", "u2"], ["u3", "u4"])).toBe(true);
  });

  it("blocks a team when either player is already in the ladder", () => {
    expect(canTeamJoinLadder(["u1", "u2"], ["u2"])).toBe(false);
    expect(canTeamJoinLadder(["u1", "u2"], ["u1"])).toBe(false);
  });

  it("blocks the same team from joining twice", () => {
    const teamIds = ["u1", "u2"];
    // After the team has joined, both ids are ladder members.
    expect(canTeamJoinLadder(teamIds, teamIds)).toBe(false);
  });
});
