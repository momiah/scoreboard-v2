import { DISPUTE_STAGE } from "@shared/types";
import type { Game } from "@shared/types";
import {
  canApproveDisputedScore,
  getReporterSideIds,
} from "./disputeReporterSide";

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

const dispute = (
  originalGame: Game,
  overrides: Record<string, unknown> = {},
) => ({
  originalGame,
  openedBy: "b",
  stage: DISPUTE_STAGE.UNDER_REVIEW,
  ...overrides,
});

describe("getReporterSideIds", () => {
  it("returns only the reporter in singles", () => {
    expect(getReporterSideIds(singles("a"))).toEqual(["a"]);
    expect(getReporterSideIds(singles("b"))).toEqual(["b"]);
  });

  it("returns both teammates in doubles, whichever of them reported", () => {
    expect(getReporterSideIds(doubles("a"))).toEqual(["a", "a2"]);
    expect(getReporterSideIds(doubles("a2"))).toEqual(["a", "a2"]);
    expect(getReporterSideIds(doubles("b2"))).toEqual(["b", "b2"]);
  });

  it("returns nothing when the reporter is missing or not in the game", () => {
    expect(getReporterSideIds(singles(""))).toEqual([]);
    expect(getReporterSideIds(singles("stranger"))).toEqual([]);
    expect(getReporterSideIds(null)).toEqual([]);
    expect(getReporterSideIds(undefined)).toEqual([]);
  });
});

describe("canApproveDisputedScore", () => {
  it("allows the reporter in singles", () => {
    expect(canApproveDisputedScore(dispute(singles("a")), "a")).toBe(true);
  });

  it("allows both teammates of the reporter in doubles", () => {
    const d = dispute(doubles("a"));
    expect(canApproveDisputedScore(d, "a")).toBe(true);
    expect(canApproveDisputedScore(d, "a2")).toBe(true);
  });

  it("denies the disputing side and outsiders", () => {
    const d = dispute(doubles("a"));
    expect(canApproveDisputedScore(d, "b")).toBe(false);
    expect(canApproveDisputedScore(d, "b2")).toBe(false);
    expect(canApproveDisputedScore(d, "stranger")).toBe(false);
    expect(canApproveDisputedScore(d, undefined)).toBe(false);
  });

  it("denies the opener even if they are somehow on the reporter side", () => {
    expect(
      canApproveDisputedScore(dispute(singles("a"), { openedBy: "a" }), "a"),
    ).toBe(false);
  });

  it("is available while evidence is requested but not once resolved", () => {
    expect(
      canApproveDisputedScore(
        dispute(singles("a"), { stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED }),
        "a",
      ),
    ).toBe(true);
    expect(
      canApproveDisputedScore(
        dispute(singles("a"), { stage: DISPUTE_STAGE.RESOLVED }),
        "a",
      ),
    ).toBe(false);
  });
});
