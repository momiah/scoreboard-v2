import { getLadderMatchProgress } from "./ladderMatchProgress";

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
