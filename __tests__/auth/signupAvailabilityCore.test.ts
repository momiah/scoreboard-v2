import {
  clientIp,
  isOverLimit,
  nextRateWindow,
  parseEmail,
  parseUsername,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from "../../functions/src/helpers/signupAvailabilityCore";

describe("parseEmail", () => {
  it("normalises a valid email", () => {
    expect(parseEmail({ email: "  Mo@Example.COM " })).toBe("mo@example.com");
  });

  it.each([
    undefined,
    null,
    "mo@example.com",
    {},
    { email: 42 },
    { email: "" },
    { email: "nope" },
    { email: `${"a".repeat(250)}@b.co` },
  ])("rejects %p", (data) => {
    expect(parseEmail(data)).toBeNull();
  });
});

describe("parseUsername", () => {
  it.each([
    ["MoMia", "momia"],
    [" Mo-Mia1 ", "mo-mia1"],
    ["abcd", "abcd"],
    ["a-b-c-d-e1", "a-b-c-d-e1"],
  ])("accepts %p as %p", (username, expected) => {
    expect(parseUsername({ username })).toBe(expected);
  });

  it.each(["abc", "abcdefghijk", "ab cd", "ab_cd", "-abcd", "abcd-", "ab--cd", "josé"])(
    "rejects %p",
    (username) => {
      expect(parseUsername({ username })).toBeNull();
    },
  );

  it("rejects missing or non-string input", () => {
    expect(parseUsername(undefined)).toBeNull();
    expect(parseUsername({ username: 1234 })).toBeNull();
  });
});

describe("rate limiting", () => {
  it("starts, counts within, and resets after the window", () => {
    const first = nextRateWindow(null, 1000);
    expect(first).toEqual({ windowStart: 1000, count: 1 });
    const second = nextRateWindow(first, 2000);
    expect(second).toEqual({ windowStart: 1000, count: 2 });
    expect(nextRateWindow(second, 1000 + RATE_LIMIT_WINDOW_MS)).toEqual({
      windowStart: 1000 + RATE_LIMIT_WINDOW_MS,
      count: 1,
    });
  });

  it("limits after the max requests", () => {
    expect(
      isOverLimit({ windowStart: 0, count: RATE_LIMIT_MAX_REQUESTS }),
    ).toBe(false);
    expect(
      isOverLimit({ windowStart: 0, count: RATE_LIMIT_MAX_REQUESTS + 1 }),
    ).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first forwarded address", () => {
    expect(clientIp("1.2.3.4, 10.0.0.1", "10.0.0.2")).toBe("1.2.3.4");
    expect(clientIp(["5.6.7.8"], undefined)).toBe("5.6.7.8");
  });

  it("falls back to the socket IP, then unknown", () => {
    expect(clientIp(undefined, "9.9.9.9")).toBe("9.9.9.9");
    expect(clientIp(undefined, undefined)).toBe("unknown");
  });
});
