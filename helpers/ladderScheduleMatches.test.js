import {
  getMyScheduleMatches,
  getOpenMatchmakingMatches,
} from "./ladderScheduleMatches";

const makeMatch = (overrides = {}) => ({
  ladderMatchId: "m1",
  court: {},
  bestOf: 5,
  matchDate: "01-05-2025",
  matchTime: { start: "18:00" },
  courtFee: 0,
  currencyType: "GBP",
  participants: [],
  games: [],
  matchStatus: "posted",
  shuttleType: "Feather",
  createdBy: "poster",
  createdAt: new Date(),
  ...overrides,
});

describe("getMyScheduleMatches", () => {
  const matches = [
    makeMatch({
      ladderMatchId: "accepted-mine",
      participants: ["poster", "me"],
      matchStatus: "accepted",
    }),
    makeMatch({
      ladderMatchId: "completed-mine",
      participants: ["me", "other"],
      matchStatus: "completed",
    }),
    makeMatch({
      ladderMatchId: "posted-mine",
      participants: ["me"],
      matchStatus: "posted",
    }),
    makeMatch({
      ladderMatchId: "accepted-not-mine",
      participants: ["a", "b"],
      matchStatus: "accepted",
    }),
  ];

  it("returns accepted and completed matches the user participates in", () => {
    const result = getMyScheduleMatches(matches, "me");
    expect(result.map((m) => m.ladderMatchId)).toEqual([
      "accepted-mine",
      "completed-mine",
    ]);
  });

  it("excludes posted matches and matches the user is not part of", () => {
    const ids = getMyScheduleMatches(matches, "me").map((m) => m.ladderMatchId);
    expect(ids).not.toContain("posted-mine");
    expect(ids).not.toContain("accepted-not-mine");
  });

  it("returns nothing without a userId", () => {
    expect(getMyScheduleMatches(matches, "")).toEqual([]);
  });

  it("preserves input order", () => {
    const ordered = [
      makeMatch({ ladderMatchId: "b", participants: ["me"], matchStatus: "accepted" }),
      makeMatch({ ladderMatchId: "a", participants: ["me"], matchStatus: "accepted" }),
    ];
    expect(getMyScheduleMatches(ordered, "me").map((m) => m.ladderMatchId)).toEqual([
      "b",
      "a",
    ]);
  });
});

describe("getOpenMatchmakingMatches", () => {
  it("keeps only posted matches, preserving order", () => {
    const matches = [
      makeMatch({ ladderMatchId: "p1", matchStatus: "posted" }),
      makeMatch({ ladderMatchId: "a1", matchStatus: "accepted" }),
      makeMatch({ ladderMatchId: "p2", matchStatus: "posted" }),
    ];
    expect(getOpenMatchmakingMatches(matches).map((m) => m.ladderMatchId)).toEqual([
      "p1",
      "p2",
    ]);
  });
});
