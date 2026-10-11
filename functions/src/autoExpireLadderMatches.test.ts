jest.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (_options: unknown, handler: unknown) => handler,
}));
jest.mock("firebase-admin", () => ({ firestore: jest.fn() }));

const mockSendNotification = jest.fn();
jest.mock("./helpers/sendNotification", () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}));

import {
  isLadderMatchExtensionEnding,
  remindEndingLadderMatchExtensions,
} from "./autoExpireLadderMatches";
import type { LadderMatch } from "courtchamps-shared/types";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-10-11T10:00:00Z").getTime();

const match = (id: string, hoursLeft: number | null) =>
  ({
    ladderMatchId: id,
    participants: ["u1", "u2"],
    court: { courtName: "Bethnal Green" },
    extension:
      hoursLeft === null
        ? null
        : {
            requestedBy: "u1",
            requestedAt: new Date(NOW),
            expiresAt: new Date(NOW + hoursLeft * HOUR),
          },
  }) as unknown as LadderMatch;

beforeEach(() => mockSendNotification.mockReset());

describe("isLadderMatchExtensionEnding", () => {
  it("is true only in the last day of an extension", () => {
    expect(isLadderMatchExtensionEnding(match("a", 23), NOW)).toBe(true);
    expect(isLadderMatchExtensionEnding(match("b", 24), NOW)).toBe(true);
    expect(isLadderMatchExtensionEnding(match("c", 25), NOW)).toBe(false);
    expect(isLadderMatchExtensionEnding(match("d", -1), NOW)).toBe(false);
    expect(isLadderMatchExtensionEnding(match("e", null), NOW)).toBe(false);
  });

  it("reads Firestore timestamps", () => {
    const expiresAt = { toDate: () => new Date(NOW + 2 * HOUR) };
    expect(
      isLadderMatchExtensionEnding(
        { extension: { expiresAt } } as unknown as LadderMatch,
        NOW,
      ),
    ).toBe(true);
  });
});

describe("remindEndingLadderMatchExtensions", () => {
  it("tells every player once, with a fixed id per match and player", async () => {
    const sent = await remindEndingLadderMatchExtensions(
      "L1",
      [match("m1", 5), match("m2", 100)],
      NOW,
    );
    expect(sent).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    const [notification, options] = mockSendNotification.mock.calls[0];
    expect(notification).toMatchObject({
      recipientId: "u1",
      message:
        "Your extension has 1 day left to complete your match at Bethnal Green.",
      data: { ladderId: "L1", tab: "Schedule", matchId: "m1" },
    });
    expect(options).toEqual({ id: "extension-ending-m1-L1-u1" });
  });
});
