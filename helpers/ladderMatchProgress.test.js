import {
  getLadderMatchProgress,
  getLadderMatchScore,
} from "./ladderMatchProgress";

const game = (overrides = {}) => ({
  gameId: "",
  gameNumber: 1,
  result: null,
  approvalStatus: "",
  ...overrides,
});

const ME = "me";
const OPP = "opp";

// A decided, approved game where `winnerUserId` (me or opp) won.
const scoredGame = (winnerUserId, overrides = {}) => ({
  gameId: "",
  gameNumber: 1,
  approvalStatus: "approved",
  team1: { player1: { userId: ME } },
  team2: { player1: { userId: OPP } },
  result: {
    winner: {
      team: winnerUserId === ME ? "Team 1" : "Team 2",
      players: [winnerUserId],
      score: 21,
    },
    loser: { team: winnerUserId === ME ? "Team 2" : "Team 1", players: [], score: 0 },
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
    expect(getLadderMatchScore(match, ME)).toEqual({
      mine: 0,
      theirs: 0,
      outcome: "undecided",
    });
  });

  it("counts my wins on the left and reports a win at the majority", () => {
    const match = {
      bestOf: 5,
      games: [
        scoredGame(ME, { gameNumber: 1 }),
        scoredGame(OPP, { gameNumber: 2 }),
        scoredGame(ME, { gameNumber: 3 }),
        scoredGame(OPP, { gameNumber: 4 }),
        scoredGame(ME, { gameNumber: 5 }),
      ],
    };
    expect(getLadderMatchScore(match, ME)).toEqual({
      mine: 3,
      theirs: 2,
      outcome: "win",
    });
  });

  it("reports a loss when the opponent reaches the majority", () => {
    const match = {
      bestOf: 5,
      games: [
        scoredGame(OPP, { gameNumber: 1 }),
        scoredGame(ME, { gameNumber: 2 }),
        scoredGame(OPP, { gameNumber: 3 }),
        scoredGame(OPP, { gameNumber: 4 }),
      ],
    };
    expect(getLadderMatchScore(match, ME)).toEqual({
      mine: 1,
      theirs: 3,
      outcome: "loss",
    });
  });

  it("ignores unapproved games", () => {
    const match = {
      bestOf: 5,
      games: [
        scoredGame(ME, { gameNumber: 1, approvalStatus: "pending" }),
        scoredGame(ME, { gameNumber: 2 }),
      ],
    };
    expect(getLadderMatchScore(match, ME)).toMatchObject({ mine: 1, theirs: 0 });
  });

  it("returns 0-0 without a userId", () => {
    const match = { bestOf: 5, games: [scoredGame(ME), scoredGame(OPP)] };
    expect(getLadderMatchScore(match, "")).toMatchObject({ mine: 0, theirs: 0 });
  });
});
