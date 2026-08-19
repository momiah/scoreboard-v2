import { buildLadderGameDocument } from "./ladderGameDocument";

const court = {
  courtId: "court-1",
  courtName: "Riverside Sports Centre",
  location: {},
  verified: true,
  submittedBy: "u9",
  verifiedBy: null,
  verifiedAt: null,
  createdAt: new Date("2024-01-01"),
};

const input = {
  court,
  bestOf: 5,
  matchDate: "2025-05-01",
  matchTime: { start: "18:00", end: "20:00" },
  courtFee: 20,
  currencyType: "GBP",
  shuttleType: "Feather",
};

describe("buildLadderGameDocument", () => {
  it("seeds the poster as the sole participant and creator", () => {
    const doc = buildLadderGameDocument({ input, userId: "u1" });
    expect(doc.participants).toEqual(["u1"]);
    expect(doc.createdBy).toBe("u1");
  });

  it("starts the game as posted", () => {
    const doc = buildLadderGameDocument({ input, userId: "u1" });
    expect(doc.gameStatus).toBe("posted");
  });

  it("derives bestOf shells with sequential game numbers", () => {
    const doc = buildLadderGameDocument({ input, userId: "u1" });
    expect(doc.games).toHaveLength(5);
    expect(doc.games.map((g) => g.gameNumber)).toEqual([1, 2, 3, 4, 5]);
    doc.games.forEach((g) => {
      expect(g.team1.player1).toBeNull();
      expect(g.team2.player1).toBeNull();
      expect(g.approvalStatus).toBe("");
    });
  });

  it("carries the input court, fee, currency and shuttle through", () => {
    const doc = buildLadderGameDocument({ input, userId: "u1" });
    expect(doc.court).toBe(court);
    expect(doc.bestOf).toBe(5);
    expect(doc.courtFee).toBe(20);
    expect(doc.currencyType).toBe("GBP");
    expect(doc.shuttleType).toBe("Feather");
  });

  it("carries the scheduled match date and time through", () => {
    const doc = buildLadderGameDocument({ input, userId: "u1" });
    expect(doc.matchDate).toBe("2025-05-01");
    expect(doc.matchTime).toEqual({ start: "18:00", end: "20:00" });
  });

  it("uses the provided createdAt when given", () => {
    const createdAt = new Date("2025-05-01T10:00:00Z");
    const doc = buildLadderGameDocument({ input, userId: "u1", createdAt });
    expect(doc.createdAt).toBe(createdAt);
  });

  it("does not carry a ladderGameId (Firestore assigns it)", () => {
    const doc = buildLadderGameDocument({ input, userId: "u1" });
    expect("ladderGameId" in doc).toBe(false);
  });
});
