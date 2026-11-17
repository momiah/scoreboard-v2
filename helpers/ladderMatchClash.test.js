import { LADDER_MATCH_STATUS } from "@shared";
import {
  LADDER_MATCH_CLASH_WINDOW_MINUTES,
  findLadderMatchClash,
  formatLadderMatchClashMessage,
} from "./ladderMatchClash";

const slot = { matchDate: "01-01-2027", matchTime: { start: "18:00" } };

const booked = (overrides = {}) => ({
  ladderMatchId: "singles-1",
  matchDate: "01-01-2027",
  matchTime: { start: "18:00" },
  matchStatus: LADDER_MATCH_STATUS.POSTED,
  participants: ["me"],
  ...overrides,
});

const clash = (matches, userIds = ["me"], excludeMatchId) =>
  findLadderMatchClash({ slot, userIds, matches, excludeMatchId });

describe("findLadderMatchClash", () => {
  it("finds a posted match at the same time on another ladder", () => {
    const match = booked();
    expect(clash([match])).toBe(match);
  });

  it("finds an accepted doubles match the player's partner is in", () => {
    const match = booked({
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      participants: ["partner", "p3", "opp1", "opp2"],
    });
    expect(clash([match], ["me", "partner"])).toBe(match);
  });

  it("finds a match that starts inside the clash window", () => {
    const match = booked({ matchTime: { start: "18:45" } });
    expect(LADDER_MATCH_CLASH_WINDOW_MINUTES).toBeGreaterThan(45);
    expect(clash([match])).toBe(match);
  });

  it("allows a match a full window away", () => {
    const hour = 18 + LADDER_MATCH_CLASH_WINDOW_MINUTES / 60;
    expect(clash([booked({ matchTime: { start: `${hour}:00` } })])).toBeNull();
  });

  it("ignores another day, other players and called-off or finished matches", () => {
    expect(
      clash([
        booked({ matchDate: "02-01-2027" }),
        booked({ participants: ["someone-else"] }),
        booked({ matchStatus: LADDER_MATCH_STATUS.CANCELLED }),
        booked({ matchStatus: LADDER_MATCH_STATUS.EXPIRED }),
        booked({ matchStatus: LADDER_MATCH_STATUS.COMPLETED }),
      ]),
    ).toBeNull();
  });

  it("ignores the match being rescheduled or accepted", () => {
    expect(clash([booked()], ["me"], "singles-1")).toBeNull();
  });
});

describe("formatLadderMatchClashMessage", () => {
  it("names the time and day of the clashing match", () => {
    expect(formatLadderMatchClashMessage(booked())).toBe(
      `You already have a ladder match at 18:00 on 1 Jan, so you can't book another within ${LADDER_MATCH_CLASH_WINDOW_MINUTES} minutes of it.`,
    );
    expect(formatLadderMatchClashMessage(booked(), { team: true })).toMatch(
      /^You or your partner already have/,
    );
  });
});
