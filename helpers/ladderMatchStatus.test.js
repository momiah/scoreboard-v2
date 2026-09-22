import { deriveLadderMatchStatus } from "./ladderMatchStatus";

const singles = (over = {}) => ({
  participants: ["a", "b"],
  matchStatus: "accepted",
  ...over,
});

const doubles = (over = {}) => ({
  participants: ["a", "b", "c", "d"],
  matchStatus: "accepted",
  ...over,
});

const allIn = { checkIn: { completed: true } };

describe("deriveLadderMatchStatus", () => {
  it("awaits check-in before the user has checked in", () => {
    const s = deriveLadderMatchStatus(singles(), { selfCheckedIn: false });
    expect(s.phase).toBe("awaiting-checkin");
    expect(s.label).toBe("Press here to checkin");
  });

  it("singles: self checked in but not all -> Checked in", () => {
    const s = deriveLadderMatchStatus(singles(), { selfCheckedIn: true });
    expect(s.phase).toBe("checked-in");
    expect(s.label).toBe("Checked in");
  });

  it("doubles: self checked in but not all -> Waiting for players", () => {
    const s = deriveLadderMatchStatus(doubles(), { selfCheckedIn: true });
    expect(s.phase).toBe("waiting-players");
    expect(s.label).toBe("Waiting for players to check in");
  });

  it("Started once everyone is checked in", () => {
    const s = deriveLadderMatchStatus(doubles(allIn), { selfCheckedIn: true });
    expect(s.phase).toBe("started");
    expect(s.label).toBe("Started");
  });

  it("awaiting-approval outranks started when games are pending", () => {
    const s = deriveLadderMatchStatus(doubles(allIn), {
      selfCheckedIn: true,
      pendingApproval: 2,
    });
    expect(s.phase).toBe("awaiting-approval");
    expect(s.label).toBe("2 games awaiting approval");
  });

  it("shows under-review and hides check-in once a no-show is reported", () => {
    const s = deriveLadderMatchStatus(singles({ noShowReported: true }), {
      selfCheckedIn: false,
    });
    expect(s.phase).toBe("no-show-review");
    expect(s.label).toContain("under review");
  });

  it("a concluded walkover still reads as forfeit, not under-review", () => {
    const s = deriveLadderMatchStatus(
      singles({
        matchStatus: "completed",
        walkover: true,
        noShowReported: true,
      }),
      { selfCheckedIn: false },
    );
    expect(s.phase).toBe("forfeit");
  });

  it("Completed for a played, concluded match", () => {
    const s = deriveLadderMatchStatus(
      singles({ matchStatus: "completed", ...allIn }),
      { selfCheckedIn: true },
    );
    expect(s.phase).toBe("completed");
    expect(s.label).toBe("Completed");
  });

  it("Forfeit wins over everything, with the losing side named", () => {
    const s = deriveLadderMatchStatus(
      doubles({ matchStatus: "completed", walkover: true, walkoverReason: "No show" }),
      { selfCheckedIn: false, forfeitLabel: "The Aces" },
    );
    expect(s.phase).toBe("forfeit");
    expect(s.label).toBe("Forfeit by The Aces (No show)");
  });

  it("Forfeit without a resolved name omits the 'by' clause", () => {
    const s = deriveLadderMatchStatus(
      singles({ matchStatus: "completed", walkover: true }),
      { selfCheckedIn: false },
    );
    expect(s.label).toBe("Forfeit (No show)");
  });
});
