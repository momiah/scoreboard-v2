jest.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (_options: unknown, handler: unknown) => handler,
}));
jest.mock("firebase-admin", () => ({ firestore: jest.fn() }));

const mockSendNotification = jest.fn();
jest.mock("./helpers/sendNotification", () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}));

import type * as admin from "firebase-admin";
import {
  getDueLadderMatchReminder,
  ladderMatchReminderMessage,
  runSendLadderMatchReminders,
} from "./sendLadderMatchReminders";
import type { LadderMatch } from "courtchamps-shared/types";

const NOW = new Date("2026-10-11T17:00:00Z").getTime(); // 18:00 in London (BST)

const match = (id: string, matchDate: string, start: string) =>
  ({
    ladderMatchId: id,
    matchDate,
    matchTime: { start },
    participants: ["u1", "u2"],
    court: { courtName: "Bethnal Green" },
    matchStatus: "accepted",
  }) as unknown as LadderMatch;

describe("getDueLadderMatchReminder", () => {
  it("reads the match time as London time", () => {
    expect(getDueLadderMatchReminder(match("a", "11-10-2026", "18:30"), NOW)).toBe("hour");
    expect(getDueLadderMatchReminder(match("b", "11-10-2026", "19:00"), NOW)).toBe("hour");
    expect(getDueLadderMatchReminder(match("c", "11-10-2026", "19:15"), NOW)).toBe("day");
    expect(getDueLadderMatchReminder(match("d", "12-10-2026", "18:00"), NOW)).toBe("day");
  });

  it("sends nothing more than a day ahead, after the start or for a bad date", () => {
    expect(getDueLadderMatchReminder(match("e", "12-10-2026", "18:15"), NOW)).toBeNull();
    expect(getDueLadderMatchReminder(match("f", "11-10-2026", "17:45"), NOW)).toBeNull();
    expect(getDueLadderMatchReminder(match("g", "nope", "18:00"), NOW)).toBeNull();
  });
});

describe("ladderMatchReminderMessage", () => {
  it("says today or tomorrow, and asks for check-in an hour before", () => {
    expect(ladderMatchReminderMessage(match("a", "12-10-2026", "09:00"), "day", NOW)).toBe(
      "Reminder: your ladder match at Bethnal Green is tomorrow at 09:00.",
    );
    expect(ladderMatchReminderMessage(match("b", "11-10-2026", "21:00"), "day", NOW)).toBe(
      "Reminder: your ladder match at Bethnal Green is today at 21:00.",
    );
    expect(ladderMatchReminderMessage(match("c", "11-10-2026", "18:30"), "hour", NOW)).toBe(
      "Your ladder match at Bethnal Green starts at 18:30. Remember to check in at the court.",
    );
  });
});

describe("runSendLadderMatchReminders", () => {
  const fakeDb = (matches: LadderMatch[]) => {
    const where = jest.fn(() => ({
      get: async () => ({ docs: matches.map((m) => ({ data: () => m })) }),
    }));
    return {
      where,
      db: {
        collection: () => ({
          get: async () => ({
            docs: [{ id: "L1", ref: { collection: () => ({ where }) } }],
          }),
        }),
      } as unknown as admin.firestore.Firestore,
    };
  };

  beforeEach(() => mockSendNotification.mockReset());

  it("reminds every player of due accepted matches with a fixed id per match time", async () => {
    const { db, where } = fakeDb([
      match("m1", "11-10-2026", "18:30"),
      match("m2", "20-10-2026", "18:30"),
    ]);
    expect(await runSendLadderMatchReminders({ db, nowMs: NOW })).toBe(1);
    expect(where).toHaveBeenCalledWith("matchStatus", "==", "accepted");
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    const [notification, options] = mockSendNotification.mock.calls[0];
    expect(notification).toMatchObject({
      recipientId: "u1",
      title: "Match reminder",
      data: { ladderId: "L1", tab: "Schedule", matchId: "m1" },
    });
    expect(options).toEqual({ id: "match-reminder-hour-m1-11-10-2026-18:30-L1-u1" });
  });
});
