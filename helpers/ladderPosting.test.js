import {
  LADDER_POSTING_BUFFER_DAYS,
  ladderPostingClosed,
  ladderPostingDeadline,
} from "./ladderDayTabs";

const DAY_MS = 24 * 60 * 60 * 1000;
const makeLadder = (playoffStartsAt) => ({ playoffStartsAt });

describe("ladderPostingDeadline", () => {
  it("is the buffer before the playoff start", () => {
    const playoffStart = new Date("2025-06-30T00:00:00Z");
    const deadline = ladderPostingDeadline(makeLadder(playoffStart));
    expect(deadline?.getTime()).toBe(
      playoffStart.getTime() - LADDER_POSTING_BUFFER_DAYS * DAY_MS,
    );
  });

  it("is null when the ladder has no playoff date", () => {
    expect(ladderPostingDeadline(makeLadder(null))).toBeNull();
  });
});

describe("ladderPostingClosed", () => {
  const playoffStart = new Date("2025-06-30T00:00:00Z");

  it("is open before the buffer window", () => {
    const now = new Date(playoffStart.getTime() - 6 * DAY_MS);
    expect(ladderPostingClosed(makeLadder(playoffStart), now)).toBe(false);
  });

  it("is closed once inside the buffer window", () => {
    const now = new Date(playoffStart.getTime() - 4 * DAY_MS);
    expect(ladderPostingClosed(makeLadder(playoffStart), now)).toBe(true);
  });

  it("is closed exactly on the deadline", () => {
    const now = new Date(playoffStart.getTime() - LADDER_POSTING_BUFFER_DAYS * DAY_MS);
    expect(ladderPostingClosed(makeLadder(playoffStart), now)).toBe(true);
  });

  it("stays open when the ladder has no playoff date", () => {
    expect(ladderPostingClosed(makeLadder(null), new Date())).toBe(false);
  });
});
