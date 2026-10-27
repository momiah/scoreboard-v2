import { buildLadderMatchDocument } from "./ladderMatchDocument";

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
  matchDate: "01-05-2025",
  matchTime: { start: "18:00" },
  courtFee: 20,
  currencyType: "GBP",
  shuttleType: "Feather",
};

describe("buildLadderMatchDocument", () => {
  it("seeds the poster as the sole participant and creator", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1" });
    expect(doc.participants).toEqual(["u1"]);
    expect(doc.createdBy).toBe("u1");
  });

  it("starts the match as posted", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1" });
    expect(doc.matchStatus).toBe("posted");
  });

  it("derives bestOf shells with sequential game numbers", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1" });
    expect(doc.games).toHaveLength(5);
    expect(doc.games.map((g) => g.gameNumber)).toEqual([1, 2, 3, 4, 5]);
    doc.games.forEach((g) => {
      expect(g.team1.player1).toBeNull();
      expect(g.team2.player1).toBeNull();
      expect(g.approvalStatus).toBe("");
    });
  });

  it("carries the input court, fee, currency and shuttle through", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1" });
    expect(doc.court).toBe(court);
    expect(doc.bestOf).toBe(5);
    expect(doc.courtFee).toBe(20);
    expect(doc.currencyType).toBe("GBP");
    expect(doc.shuttleType).toBe("Feather");
  });

  it("carries the scheduled match date and start time through", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1" });
    expect(doc.matchDate).toBe("01-05-2025");
    expect(doc.matchTime).toEqual({ start: "18:00" });
  });

  it("uses the provided createdAt when given", () => {
    const createdAt = new Date("2025-05-01T10:00:00Z");
    const doc = buildLadderMatchDocument({ input, userId: "u1", createdAt });
    expect(doc.createdAt).toBe(createdAt);
  });

  it("does not carry a ladderMatchId (Firestore assigns it)", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1" });
    expect("ladderMatchId" in doc).toBe(false);
  });

  it("singles: no teams or ladderType fields", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1" });
    expect("teams" in doc).toBe(false);
    expect("ladderType" in doc).toBe(false);
  });

  const team = {
    teamId: "team-a",
    teamKey: "u1_u2",
    playerIds: ["u1", "u2"],
  };

  it("doubles: seeds the team's players as participants", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1", team });
    expect(doc.participants).toEqual(["u1", "u2"]);
    expect(doc.createdBy).toBe("u1");
  });

  it("doubles: records teams[0] and Doubles ladderType", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1", team });
    expect(doc.teams).toEqual([team]);
    expect(doc.ladderType).toBe("Doubles");
  });

  it("doubles: does not mutate the team's playerIds", () => {
    const doc = buildLadderMatchDocument({ input, userId: "u1", team });
    doc.participants.push("u3");
    expect(team.playerIds).toEqual(["u1", "u2"]);
  });
});
