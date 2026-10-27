import { getLadderRegistrationBlock, getTeamRegistrationBlock } from "./ladderRegistration";

const NOW = new Date("2026-06-15T12:00:00Z").getTime();
const open = {
  status: "registrationOpen",
  registrationOpensAt: new Date("2026-06-01T00:00:00Z"),
  registrationClosesAt: new Date("2026-07-01T00:00:00Z"),
  participantCount: 10,
  maxPlayers: 2048,
};

describe("getLadderRegistrationBlock", () => {
  it("allows joining while registration is open", () => {
    expect(getLadderRegistrationBlock(open, NOW)).toBeNull();
  });

  it("blocks once the status has moved on or the window has closed", () => {
    expect(getLadderRegistrationBlock({ ...open, status: "playoffs" }, NOW)).toBe("closed");
    expect(getLadderRegistrationBlock({ ...open, status: "cancelled" }, NOW)).toBe("closed");
    expect(
      getLadderRegistrationBlock(
        { ...open, registrationClosesAt: new Date("2026-06-15T11:59:59Z") },
        NOW,
      ),
    ).toBe("closed");
  });

  it("blocks before registration opens", () => {
    expect(
      getLadderRegistrationBlock(
        { ...open, registrationOpensAt: new Date("2026-06-16T00:00:00Z") },
        NOW,
      ),
    ).toBe("not_open");
  });

  it("blocks a full ladder but ignores a missing cap", () => {
    expect(getLadderRegistrationBlock({ ...open, participantCount: 2048 }, NOW)).toBe("full");
    expect(getLadderRegistrationBlock({ ...open, maxPlayers: 0, participantCount: 9999 }, NOW)).toBeNull();
  });

  it("reads Firestore timestamps", () => {
    const ts = (iso: string) => ({ toDate: () => new Date(iso) });
    expect(
      getLadderRegistrationBlock(
        {
          ...open,
          registrationOpensAt: ts("2026-06-01T00:00:00Z"),
          registrationClosesAt: ts("2026-06-10T00:00:00Z"),
        },
        NOW,
      ),
    ).toBe("closed");
  });
});

describe("getTeamRegistrationBlock", () => {
  it("allows an active team of two", () => {
    expect(getTeamRegistrationBlock({ status: "active", playerIds: ["a", "b"] } as never)).toBeNull();
  });

  it("blocks a missing, pending or one-player team", () => {
    expect(getTeamRegistrationBlock(null)).toBe("team_not_found");
    expect(getTeamRegistrationBlock({ status: "pending", playerIds: ["a", "b"] } as never)).toBe("team_pending");
    expect(getTeamRegistrationBlock({ status: "active", playerIds: ["a"] } as never)).toBe("team_incomplete");
  });
});
