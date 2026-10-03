import type { Game } from "@shared/types";
import {
  canApproveReportedGame,
  getEffectiveApprovalLimit,
} from "./reportedGameApproval";

const player = (userId: string) => ({ userId });

const singles = (reporter: string): Game =>
  ({
    reporter,
    team1: { player1: player("a"), player2: null },
    team2: { player1: player("b"), player2: null },
  }) as unknown as Game;

const doubles = (reporter: string): Game =>
  ({
    reporter,
    team1: { player1: player("a"), player2: player("a2") },
    team2: { player1: player("b"), player2: player("b2") },
  }) as unknown as Game;

describe("canApproveReportedGame", () => {
  it("lets the opponent approve in singles but not the reporter", () => {
    expect(canApproveReportedGame(singles("a"), "b")).toBe(true);
    expect(canApproveReportedGame(singles("a"), "a")).toBe(false);
  });

  it("lets only the opposing team approve in doubles", () => {
    const game = doubles("a");
    expect(canApproveReportedGame(game, "b")).toBe(true);
    expect(canApproveReportedGame(game, "b2")).toBe(true);
    expect(canApproveReportedGame(game, "a")).toBe(false);
  });

  it("does not let the reporter's own partner approve", () => {
    expect(canApproveReportedGame(doubles("a"), "a2")).toBe(false);
    expect(canApproveReportedGame(doubles("a2"), "a")).toBe(false);
    expect(canApproveReportedGame(doubles("b"), "b2")).toBe(false);
  });

  it("works whichever team reported", () => {
    expect(canApproveReportedGame(doubles("b2"), "a")).toBe(true);
    expect(canApproveReportedGame(doubles("b2"), "a2")).toBe(true);
  });

  it("does not let anyone outside the game approve", () => {
    expect(canApproveReportedGame(doubles("a"), "stranger")).toBe(false);
    expect(canApproveReportedGame(doubles("a"), undefined)).toBe(false);
    expect(canApproveReportedGame(null, "b")).toBe(false);
  });
});

describe("getEffectiveApprovalLimit", () => {
  it("caps singles at one approval whatever the competition limit", () => {
    expect(getEffectiveApprovalLimit(singles("a"), 2)).toBe(1);
    expect(getEffectiveApprovalLimit(singles("a"), undefined)).toBe(1);
  });

  it("uses the competition limit for doubles, defaulting to one", () => {
    expect(getEffectiveApprovalLimit(doubles("a"), 2)).toBe(2);
    expect(getEffectiveApprovalLimit(doubles("a"), 1)).toBe(1);
    expect(getEffectiveApprovalLimit(doubles("a"), undefined)).toBe(1);
    expect(getEffectiveApprovalLimit(doubles("a"), 0)).toBe(1);
  });
});
