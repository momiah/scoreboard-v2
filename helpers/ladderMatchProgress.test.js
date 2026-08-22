import {
  getLadderMatchProgress,
  getNextLadderGame,
} from "./ladderMatchProgress";

const game = (overrides = {}) => ({
  gameId: "",
  gameNumber: 1,
  result: null,
  approvalStatus: "",
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

describe("getNextLadderGame", () => {
  it("targets the first awaiting-approval game with an orange glow", () => {
    const match = {
      games: [
        game({ gameNumber: 1, approvalStatus: "approved", result: "team1" }),
        game({ gameNumber: 2, approvalStatus: "pending" }),
        game({ gameNumber: 3 }),
      ],
    };
    expect(getNextLadderGame(match)).toEqual({
      gameId: "2",
      glowColor: "#FFA500",
    });
  });

  it("targets the first unplayed game with a blue glow when none are pending", () => {
    const match = {
      games: [
        game({ gameNumber: 1, approvalStatus: "approved", result: "team1" }),
        game({ gameNumber: 2 }),
      ],
    };
    expect(getNextLadderGame(match)).toEqual({
      gameId: "2",
      glowColor: "#00A2FF",
    });
  });

  it("returns a null gameId when every game has a result", () => {
    const match = {
      games: [
        game({ gameNumber: 1, approvalStatus: "approved", result: "team1" }),
        game({ gameNumber: 2, approvalStatus: "approved", result: "team2" }),
      ],
    };
    expect(getNextLadderGame(match).gameId).toBeNull();
  });
});
