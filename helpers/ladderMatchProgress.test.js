import {
  getLadderMatchProgress,
  getLadderMatchScore,
  getLadderMatchOutcome,
} from "./ladderMatchProgress";

const game = (overrides = {}) => ({
  gameId: "",
  gameNumber: 1,
  result: null,
  approvalStatus: "",
  ...overrides,
});

const USER = "user";
const OPP = "opp";

const scoredGame = (winnerUserId, overrides = {}) => ({
  gameId: "",
  gameNumber: 1,
  approvalStatus: "approved",
  team1: { player1: { userId: USER } },
  team2: { player1: { userId: OPP } },
  result: {
    winner: {
      team: winnerUserId === USER ? "Team 1" : "Team 2",
      players: [winnerUserId],
      score: 21,
    },
    loser: {
      team: winnerUserId === USER ? "Team 2" : "Team 1",
      players: [],
      score: 0,
    },
  },
  ...overrides,
});

describe("getLadderMatchProgress", () => {
  it("counts approved games as completed", () => {
    const match = {
      games: [
        game({ gameNumber: 1, approvalStatus: "approved" }),
        game({ gameNumber: 2, approvalStatus: "pending" }),
        game({ gameNumber: 3 }),
      ],
    };
    expect(getLadderMatchProgress(match)).toEqual({
      total: 3,
      completed: 1,
      pendingApproval: 1,
      allCompleted: false,
    });
  });

  it("flags allCompleted when every game is approved", () => {
    const match = {
      games: [
        game({ gameNumber: 1, approvalStatus: "approved" }),
        game({ gameNumber: 2, approvalStatus: "approved" }),
      ],
    };
    expect(getLadderMatchProgress(match).allCompleted).toBe(true);
  });

  it("is not allCompleted for an empty games array", () => {
    expect(getLadderMatchProgress({ games: [] })).toEqual({
      total: 0,
      completed: 0,
      pendingApproval: 0,
      allCompleted: false,
    });
  });

  it("treats capitalised Pending as awaiting approval", () => {
    const match = { games: [game({ approvalStatus: "Pending" })] };
    expect(getLadderMatchProgress(match).pendingApproval).toBe(1);
  });
});

describe("getLadderMatchScore", () => {
  it("starts 0-0 undecided for fresh shells", () => {
    const match = { bestOf: 5, games: [game(), game(), game(), game(), game()] };
    expect(getLadderMatchScore(match, USER)).toEqual({
      user: 0,
      opponent: 0,
      outcome: "undecided",
    });
  });

  it("counts the user's wins and reports a win at the majority", () => {
    const match = {
      bestOf: 5,
      games: [
        scoredGame(USER, { gameNumber: 1 }),
        scoredGame(OPP, { gameNumber: 2 }),
        scoredGame(USER, { gameNumber: 3 }),
        scoredGame(OPP, { gameNumber: 4 }),
        scoredGame(USER, { gameNumber: 5 }),
      ],
    };
    expect(getLadderMatchScore(match, USER)).toEqual({
      user: 3,
      opponent: 2,
      outcome: "win",
    });
  });

  it("reports a loss when the opponent reaches the majority", () => {
    const match = {
      bestOf: 5,
      games: [
        scoredGame(OPP, { gameNumber: 1 }),
        scoredGame(USER, { gameNumber: 2 }),
        scoredGame(OPP, { gameNumber: 3 }),
        scoredGame(OPP, { gameNumber: 4 }),
      ],
    };
    expect(getLadderMatchScore(match, USER)).toEqual({
      user: 1,
      opponent: 3,
      outcome: "loss",
    });
  });

  it("ignores unapproved games and returns 0-0 without a userId", () => {
    const pendingMatch = {
      bestOf: 5,
      games: [scoredGame(USER, { approvalStatus: "pending" })],
    };
    expect(getLadderMatchScore(pendingMatch, USER)).toMatchObject({
      user: 0,
      opponent: 0,
    });
    const match = { bestOf: 5, games: [scoredGame(USER), scoredGame(OPP)] };
    expect(getLadderMatchScore(match, "")).toMatchObject({
      user: 0,
      opponent: 0,
    });
  });
});

describe("getLadderMatchOutcome", () => {
  it("derives a played match from its score", () => {
    const match = {
      bestOf: 3,
      games: [scoredGame(USER, { gameNumber: 1 }), scoredGame(USER, { gameNumber: 2 })],
    };
    expect(getLadderMatchOutcome(match, USER)).toBe("win");
    expect(getLadderMatchOutcome(match, OPP)).toBe("loss");
  });

  it("singles walkover: the walkover winner wins, the other loses", () => {
    const match = { walkover: true, walkoverWinner: USER, games: [] };
    expect(getLadderMatchOutcome(match, USER)).toBe("win");
    expect(getLadderMatchOutcome(match, OPP)).toBe("loss");
  });

  it("doubles walkover: decided by the user's team key", () => {
    const match = {
      walkover: true,
      walkoverWinner: "teamA",
      games: [],
      teams: [
        { teamKey: "teamA", playerIds: ["a1", "a2"] },
        { teamKey: "teamB", playerIds: ["b1", "b2"] },
      ],
    };
    expect(getLadderMatchOutcome(match, "a2")).toBe("win");
    expect(getLadderMatchOutcome(match, "b1")).toBe("loss");
  });

  it("is undecided for a walkover with no winner or an unknown user", () => {
    expect(getLadderMatchOutcome({ walkover: true, games: [] }, USER)).toBe(
      "undecided",
    );
    const doubles = {
      walkover: true,
      walkoverWinner: "teamA",
      games: [],
      teams: [
        { teamKey: "teamA", playerIds: ["a1"] },
        { teamKey: "teamB", playerIds: ["b1"] },
      ],
    };
    expect(getLadderMatchOutcome(doubles, "stranger")).toBe("undecided");
  });
});
