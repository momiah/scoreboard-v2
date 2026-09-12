import {
  resolveLadderMatchOutcome,
  teamUserIds,
  isLadderGameApproved,
} from "./ladderMatchResult";

const approvedGame = (winnerTeam) => ({
  gameId: "g",
  approvalStatus: "approved",
  team1: { player1: { userId: "a" }, player2: null, score: 0 },
  team2: { player1: { userId: "b" }, player2: null, score: 0 },
  result: { winner: { team: winnerTeam }, loser: {} },
});

const pendingGame = () => ({
  gameId: "g",
  approvalStatus: "Pending",
  team1: { player1: { userId: "a" }, player2: null },
  team2: { player1: { userId: "b" }, player2: null },
  result: null,
});

describe("resolveLadderMatchOutcome", () => {
  it("is undecided before a side reaches the best-of majority", () => {
    const games = [approvedGame("Team 1"), pendingGame(), pendingGame()];
    expect(resolveLadderMatchOutcome(games, 3)).toEqual({
      decided: false,
      winnerTeam: null,
    });
  });

  it("decides once a side clinches the majority (2-0 in a best-of-3)", () => {
    const games = [approvedGame("Team 1"), approvedGame("Team 1"), pendingGame()];
    expect(resolveLadderMatchOutcome(games, 3)).toEqual({
      decided: true,
      winnerTeam: "Team 1",
    });
  });

  it("resolves a best-of-1 from a single approved game", () => {
    expect(resolveLadderMatchOutcome([approvedGame("Team 2")], 1)).toEqual({
      decided: true,
      winnerTeam: "Team 2",
    });
  });

  it("ignores unapproved games when tallying", () => {
    const games = [approvedGame("Team 2"), pendingGame()];
    expect(resolveLadderMatchOutcome(games, 3).decided).toBe(false);
  });
});

describe("teamUserIds", () => {
  it("returns the userIds on the requested side", () => {
    const game = approvedGame("Team 1");
    expect(teamUserIds(game, "Team 1")).toEqual(["a"]);
    expect(teamUserIds(game, "Team 2")).toEqual(["b"]);
  });
});

describe("isLadderGameApproved", () => {
  it("is true only for approved games", () => {
    expect(isLadderGameApproved(approvedGame("Team 1"))).toBe(true);
    expect(isLadderGameApproved(pendingGame())).toBe(false);
  });
});
