import type { Game } from "@shared/types";
import { canApproveLadderGame } from "./ladderGameApproval";

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

describe("canApproveLadderGame", () => {
  it("lets the opponent approve in singles but not the reporter", () => {
    expect(canApproveLadderGame(singles("a"), "b")).toBe(true);
    expect(canApproveLadderGame(singles("a"), "a")).toBe(false);
  });

  it("lets only the opposing team approve in doubles", () => {
    const game = doubles("a");
    expect(canApproveLadderGame(game, "b")).toBe(true);
    expect(canApproveLadderGame(game, "b2")).toBe(true);
    expect(canApproveLadderGame(game, "a")).toBe(false);
  });

  it("does not let the reporter's own partner approve", () => {
    expect(canApproveLadderGame(doubles("a"), "a2")).toBe(false);
    expect(canApproveLadderGame(doubles("a2"), "a")).toBe(false);
    expect(canApproveLadderGame(doubles("b"), "b2")).toBe(false);
  });

  it("works whichever team reported", () => {
    expect(canApproveLadderGame(doubles("b2"), "a")).toBe(true);
    expect(canApproveLadderGame(doubles("b2"), "a2")).toBe(true);
  });

  it("does not let anyone outside the game approve", () => {
    expect(canApproveLadderGame(doubles("a"), "stranger")).toBe(false);
    expect(canApproveLadderGame(doubles("a"), undefined)).toBe(false);
    expect(canApproveLadderGame(null, "b")).toBe(false);
  });
});
