import { LADDER_MATCH_STATUS } from "@shared";
import {
  LADDER_MATCH_CANCEL_ACTION as ACTION,
  getLadderMatchCancelAction,
  getLadderMatchSideIds,
  getOpponentSideIds,
} from "./ladderMatchCancellation";

const shell = () => ({ result: null, approvalStatus: "" });

const singles = (overrides = {}) => ({
  matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
  participants: ["poster", "accepter"],
  createdBy: "poster",
  games: [shell(), shell(), shell()],
  cancellationRequest: null,
  ...overrides,
});

const doubles = (overrides = {}) => ({
  ...singles(),
  participants: ["p1", "p2", "a1", "a2"],
  createdBy: "p1",
  teams: [
    { teamId: "tp", teamKey: "p1_p2", playerIds: ["p1", "p2"] },
    { teamId: "ta", teamKey: "a1_a2", playerIds: ["a1", "a2"] },
  ],
  ...overrides,
});

describe("getLadderMatchSideIds", () => {
  it("splits singles into poster and accepter", () => {
    expect(getLadderMatchSideIds(singles())).toEqual({
      poster: ["poster"],
      accepter: ["accepter"],
    });
  });

  it("uses the teams for doubles", () => {
    expect(getLadderMatchSideIds(doubles())).toEqual({
      poster: ["p1", "p2"],
      accepter: ["a1", "a2"],
    });
    expect(getOpponentSideIds(doubles(), "a2")).toEqual(["p1", "p2"]);
  });
});

describe("getLadderMatchCancelAction", () => {
  it("cancels a posted match straight away for the poster or partner", () => {
    const posted = doubles({
      matchStatus: LADDER_MATCH_STATUS.POSTED,
      participants: ["p1", "p2"],
      teams: [{ teamId: "tp", teamKey: "p1_p2", playerIds: ["p1", "p2"] }],
    });
    expect(getLadderMatchCancelAction(posted, "p1")).toBe(ACTION.CANCEL);
    expect(getLadderMatchCancelAction(posted, "p2")).toBe(ACTION.CANCEL);
  });

  it("asks either side of an accepted match to request a cancellation", () => {
    expect(getLadderMatchCancelAction(singles(), "poster")).toBe(ACTION.REQUEST);
    expect(getLadderMatchCancelAction(singles(), "accepter")).toBe(
      ACTION.REQUEST,
    );
  });

  it("lets only the opposing side respond to a request", () => {
    const requested = doubles({
      cancellationRequest: { requestedBy: "a1", requestedAt: new Date() },
    });
    expect(getLadderMatchCancelAction(requested, "p1")).toBe(ACTION.RESPOND);
    expect(getLadderMatchCancelAction(requested, "p2")).toBe(ACTION.RESPOND);
    expect(getLadderMatchCancelAction(requested, "a1")).toBe(
      ACTION.AWAITING_RESPONSE,
    );
    expect(getLadderMatchCancelAction(requested, "a2")).toBe(
      ACTION.AWAITING_RESPONSE,
    );
  });

  it("can't cancel once a game has been reported", () => {
    const reported = singles({
      games: [{ result: { winner: {} }, approvalStatus: "Pending" }, shell()],
    });
    expect(getLadderMatchCancelAction(reported, "poster")).toBe(ACTION.NONE);
  });

  it("can't cancel completed, cancelled or expired matches", () => {
    [
      LADDER_MATCH_STATUS.COMPLETED,
      LADDER_MATCH_STATUS.CANCELLED,
      LADDER_MATCH_STATUS.EXPIRED,
    ].forEach((matchStatus) =>
      expect(
        getLadderMatchCancelAction(singles({ matchStatus }), "poster"),
      ).toBe(ACTION.NONE),
    );
  });

  it("gives nothing to someone outside the match", () => {
    expect(getLadderMatchCancelAction(singles(), "stranger")).toBe(ACTION.NONE);
    expect(getLadderMatchCancelAction(singles(), undefined)).toBe(ACTION.NONE);
    expect(getLadderMatchCancelAction(null, "poster")).toBe(ACTION.NONE);
  });
});
