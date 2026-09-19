import {
  getMatchStart,
  isMatchStarted,
  isMatchDayPassed,
  formatMatchDateShort,
} from "./ladderMatchTime";

const match = (matchDate, start) => ({
  matchDate,
  matchTime: { start },
});

describe("getMatchStart", () => {
  it("parses DD-MM-YYYY + HH:mm into a Date", () => {
    const start = getMatchStart(match("21-08-2026", "18:00"));
    expect(start).toEqual(new Date(2026, 7, 21, 18, 0, 0, 0));
  });

  it("returns null for a malformed date or time", () => {
    expect(getMatchStart(match("", "18:00"))).toBeNull();
    expect(getMatchStart(match("21-08-2026", ""))).toBeNull();
  });

  it("handles midnight (00:00)", () => {
    const start = getMatchStart(match("01-01-2026", "00:00"));
    expect(start).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
  });
});

describe("isMatchStarted", () => {
  const m = match("21-08-2026", "18:00");

  it("is false before the scheduled start", () => {
    expect(isMatchStarted(m, new Date(2026, 7, 21, 17, 59))).toBe(false);
  });

  it("is true at and after the scheduled start", () => {
    expect(isMatchStarted(m, new Date(2026, 7, 21, 18, 0))).toBe(true);
    expect(isMatchStarted(m, new Date(2026, 7, 22, 9, 0))).toBe(true);
  });

  it("fails open (true) when the start can't be parsed", () => {
    expect(isMatchStarted(match("", ""), new Date(2020, 0, 1))).toBe(true);
  });
});

describe("isMatchDayPassed", () => {
  const m = match("21-08-2026", "18:00");

  it("is false on the match's own day, even past the start time", () => {
    expect(isMatchDayPassed(m, new Date(2026, 7, 21, 8, 0))).toBe(false);
    expect(isMatchDayPassed(m, new Date(2026, 7, 21, 23, 59))).toBe(false);
  });

  it("is true once a later day has begun", () => {
    expect(isMatchDayPassed(m, new Date(2026, 7, 22, 0, 1))).toBe(true);
  });

  it("is false before the match day", () => {
    expect(isMatchDayPassed(m, new Date(2026, 7, 20, 23, 59))).toBe(false);
  });

  it("fails closed (false) when the date can't be parsed", () => {
    expect(isMatchDayPassed(match("", ""), new Date(2030, 0, 1))).toBe(false);
  });
});

describe("formatMatchDateShort", () => {
  it("formats DD-MM-YYYY as 'D Mon'", () => {
    expect(formatMatchDateShort("21-08-2026")).toBe("21 Aug");
    expect(formatMatchDateShort("01-01-2026")).toBe("1 Jan");
  });

  it("returns the input unchanged when malformed", () => {
    expect(formatMatchDateShort("nonsense")).toBe("nonsense");
  });
});
