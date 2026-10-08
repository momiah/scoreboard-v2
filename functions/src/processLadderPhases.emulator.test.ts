import * as admin from "firebase-admin";
import {
  DISPUTE_STAGE,
  LADDER_CANCELLED_REASON,
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
  TEAM_STATUS,
} from "courtchamps-shared/types";

const PROJECT_ID = "demo-courtchamps";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const DAY_MS = 24 * 60 * 60 * 1000;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "Run these tests with `npm run test:emulator` so the Firestore emulator is running.",
  );
}

if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });

import {
  processLadderPhases,
  runProcessLadderPhases,
} from "./processLadderPhases";

const db = admin.firestore();
const realFetch = global.fetch;

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  priority: string;
  data: Record<string, unknown>;
}

const pushRequests: PushMessage[][] = [];

const clearEmulator = async () => {
  await realFetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
};

const now = new Date();
const daysFromNow = (days: number) => new Date(now.getTime() + days * DAY_MS);

const pad = (value: number, size = 4) => String(value).padStart(size, "0");

const homeCourt = {
  courtId: "court-london",
  courtName: "London",
  location: {
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "",
    address: "",
    latitude: 51.5074,
    longitude: -0.1278,
  },
};

const writeAll = async (writes: [string, Record<string, unknown>][]) => {
  const writer = db.bulkWriter();
  writes.forEach(([path, data]) => {
    void writer.set(db.doc(path), data);
  });
  await writer.close();
};

const userDoc = (userId: string, index: number) => ({
  userId,
  firstName: `First ${index}`,
  lastName: `Last ${index}`,
  username: userId,
  profileDetail: { XP: 500 },
  pushTokens: [`ExponentPushToken[${userId}]`],
});

const seedLadder = async (
  ladderId: string,
  overrides: Record<string, unknown> = {},
) => {
  await db.doc(`ladders/${ladderId}`).set({
    name: `Ladder ${ladderId}`,
    ladderType: LADDER_TYPE.SINGLES,
    status: LADDER_STATUS.REGISTRATION_CLOSED,
    registrationClosesAt: daysFromNow(-30),
    playoffStartsAt: daysFromNow(-1),
    maxPlayers: 2048,
    entryFee: 0,
    currencyType: "GBP",
    ...overrides,
  });
};

const seedSingles = async (ladderId: string, count: number) => {
  const writes: [string, Record<string, unknown>][] = [];
  for (let rank = 0; rank < count; rank += 1) {
    const userId = `u${pad(rank)}`;
    writes.push([`users/${userId}`, userDoc(userId, rank)]);
    writes.push([
      `ladders/${ladderId}/ladderParticipants/${userId}`,
      {
        userId,
        competitionXP: 10000 - rank * 3,
        numberOfWins: 40,
        totalPointDifference: 0,
        joinedAt: new Date(now.getTime() - 90 * DAY_MS + rank * 1000),
        homeCourt,
      },
    ]);
  }
  await writeAll(writes);
};

const seedTeams = async (ladderId: string, teamCount: number) => {
  const writes: [string, Record<string, unknown>][] = [];
  for (let rank = 0; rank < teamCount; rank += 1) {
    const first = `a${pad(rank)}`;
    const second = `b${pad(rank)}`;
    writes.push([`users/${first}`, userDoc(first, rank)]);
    writes.push([`users/${second}`, userDoc(second, rank)]);
    writes.push([
      `ladders/${ladderId}/ladderTeams/t${pad(rank)}`,
      {
        teamKey: `t${pad(rank)}`,
        teamId: `t${pad(rank)}`,
        playerIds: [first, second],
        players: [{ userId: first }, { userId: second }],
        status: TEAM_STATUS.ACTIVE,
        XP: 10000 - rank * 3,
        numberOfWins: 40,
        totalPointDifference: 0,
        joinedAt: new Date(now.getTime() - 90 * DAY_MS + rank * 1000),
        homeCourt,
      },
    ]);
  }
  await writeAll(writes);
};

interface StoredNotification {
  recipientId: string;
  title: string;
  message: string;
  type: string;
  senderId: string;
  data: { ladderId: string; tab: string };
}

const notifications = async (): Promise<StoredNotification[]> =>
  (await db.collectionGroup("notifications").get()).docs.map(
    (doc) => doc.data() as StoredNotification,
  );

const byTitle = (all: StoredNotification[], title: string) =>
  all.filter((notification) => notification.title === title);

const tieCount = async (ladderId: string) =>
  (await db.collection(`ladders/${ladderId}/playoffTies`).get()).size;

const ladderData = async (ladderId: string) =>
  (await db.doc(`ladders/${ladderId}`).get()).data() as Record<string, unknown>;

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) !== EXPO_PUSH_URL) return realFetch(url, init);
    pushRequests.push(JSON.parse(String(init?.body)) as PushMessage[]);
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  }) as typeof fetch;
});

afterAll(() => {
  global.fetch = realFetch;
});

beforeEach(async () => {
  pushRequests.length = 0;
  await clearEmulator();
});

describe("playoffs generated for a 2048-player ladder", () => {
  it("creates the top-128 bracket, notifies everyone once and pushes to every device", async () => {
    await seedLadder("L2048", { name: "Emulator 2048" });
    await seedSingles("L2048", 2048);

    const summary = await runProcessLadderPhases(now);

    expect(summary).toEqual({
      registrationClosed: [],
      cancelled: [],
      playoffsGenerated: ["L2048"],
      playoffsHeld: [],
    });
    expect(await ladderData("L2048")).toMatchObject({
      status: LADDER_STATUS.PLAYOFFS,
      playoffBracketSize: 128,
      playoffEntrantCount: 2048,
    });
    expect(await tieCount("L2048")).toBe(128);

    const all = await notifications();
    expect(all).toHaveLength(2048);
    expect(new Set(all.map((n) => n.recipientId)).size).toBe(2048);
    const promoted = byTitle(all, "You made the playoffs!");
    const eliminated = byTitle(all, "Playoffs have started");
    expect(promoted).toHaveLength(128);
    expect(eliminated).toHaveLength(1920);
    expect(promoted.map((n) => n.recipientId).sort()).toEqual(
      Array.from({ length: 128 }, (_, rank) => `u${pad(rank)}`),
    );
    expect(promoted[0]).toMatchObject({
      senderId: "system",
      type: "ladder",
      message:
        "Congratulations! You've made the playoffs in Emulator 2048. You have 10 days to play both your home and away games.",
      data: { ladderId: "L2048", tab: "Playoffs" },
    });
    expect(eliminated[0]).toMatchObject({
      senderId: "system",
      type: "ladder",
      message:
        "The playoffs in Emulator 2048 have started, and unfortunately you didn't make the cut this time. The ladder is now closed, so you can no longer post matches. Thank you for playing, and come back next season for another chance to win!",
      data: { ladderId: "L2048", tab: "Playoffs" },
    });

    expect(pushRequests).toHaveLength(2048);
    const pushed = pushRequests.map((request) => request[0]);
    expect(new Set(pushed.map((message) => message.to)).size).toBe(2048);
    const qualifierPush = pushed.find(
      (message) => message.to === `ExponentPushToken[u${pad(0)}]`,
    );
    expect(qualifierPush).toMatchObject({
      title: "You made the playoffs!",
      body: promoted[0].message,
      sound: "default",
      priority: "high",
      data: { ladderId: "L2048", tab: "Playoffs", type: "ladder" },
    });
    const eliminatedPush = pushed.find(
      (message) => message.to === `ExponentPushToken[u${pad(2000)}]`,
    );
    expect(eliminatedPush).toMatchObject({
      title: "Playoffs have started",
      body: eliminated[0].message,
      data: { ladderId: "L2048", tab: "Playoffs", type: "ladder" },
    });
  });

  it("changes nothing and sends nothing when run again", async () => {
    await seedLadder("L2048", { name: "Emulator 2048" });
    await seedSingles("L2048", 2048);
    await runProcessLadderPhases(now);
    const before = await ladderData("L2048");
    const notificationsBefore = (await notifications()).length;
    const pushesBefore = pushRequests.length;

    const second = await runProcessLadderPhases(now);

    expect(second.playoffsGenerated).toEqual([]);
    expect(await ladderData("L2048")).toEqual(before);
    expect(await tieCount("L2048")).toBe(128);
    expect((await notifications()).length).toBe(notificationsBefore);
    expect(pushRequests.length).toBe(pushesBefore);
  });
});

describe("a ladder with fewer than 128 registrations", () => {
  it("cancels at registration close, refunds, and tells every entrant once", async () => {
    await seedLadder("L127", {
      name: "Emulator 127",
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
      entryFee: 10,
    });
    await seedSingles("L127", 127);

    const summary = await runProcessLadderPhases(now);

    expect(summary.cancelled).toEqual(["L127"]);
    expect(await ladderData("L127")).toMatchObject({
      status: LADDER_STATUS.CANCELLED,
      cancelledReason: LADDER_CANCELLED_REASON.TOO_FEW_REGISTRATIONS,
    });
    expect(await tieCount("L127")).toBe(0);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Refund stub: ladder L127 would refund 127"),
    );

    const all = await notifications();
    expect(all).toHaveLength(127);
    expect(new Set(all.map((n) => n.recipientId)).size).toBe(127);
    expect(all[0]).toMatchObject({
      title: "Ladder cancelled",
      senderId: "system",
      type: "ladder",
      message:
        "Emulator 127 has been cancelled because not enough players signed up before registration closed. If you paid an entry fee, it will be refunded to you in full.",
      data: { ladderId: "L127", tab: "Summary" },
    });
    expect(pushRequests).toHaveLength(127);

    await runProcessLadderPhases(now);
    expect((await notifications()).length).toBe(127);
    expect(pushRequests).toHaveLength(127);
  });
});

describe("registration close with enough players", () => {
  it("closes registration without a bracket or any notification", async () => {
    await seedLadder("L300", {
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    await seedSingles("L300", 300);

    const summary = await runProcessLadderPhases(now);

    expect(summary.registrationClosed).toEqual(["L300"]);
    expect((await ladderData("L300")).status).toBe(
      LADDER_STATUS.REGISTRATION_CLOSED,
    );
    expect(await tieCount("L300")).toBe(0);
    expect(await notifications()).toHaveLength(0);
    expect(pushRequests).toHaveLength(0);
  });
});

describe("entrants dropping below 128 after registration closed", () => {
  it("still runs a top 8 and tells the other players they missed out", async () => {
    await seedLadder("L100", { name: "Emulator 100", maxPlayers: 256 });
    await seedSingles("L100", 100);

    await runProcessLadderPhases(now);

    expect(await ladderData("L100")).toMatchObject({
      status: LADDER_STATUS.PLAYOFFS,
      playoffBracketSize: 8,
      playoffEntrantCount: 100,
    });
    expect(await tieCount("L100")).toBe(8);
    const all = await notifications();
    expect(byTitle(all, "You made the playoffs!")).toHaveLength(8);
    expect(byTitle(all, "Playoffs have started")).toHaveLength(92);
  });
});

describe("playoffs generated for a 128-team doubles ladder", () => {
  it("builds a top-8 bracket and notifies both players of every team", async () => {
    await seedLadder("D128", {
      name: "Emulator Doubles",
      ladderType: LADDER_TYPE.DOUBLES,
      maxPlayers: 128,
    });
    await seedTeams("D128", 128);

    await runProcessLadderPhases(now);

    expect(await ladderData("D128")).toMatchObject({
      status: LADDER_STATUS.PLAYOFFS,
      playoffBracketSize: 8,
      playoffEntrantCount: 128,
    });
    expect(await tieCount("D128")).toBe(8);

    const all = await notifications();
    const promoted = byTitle(all, "You made the playoffs!");
    const eliminated = byTitle(all, "Playoffs have started");
    expect(promoted).toHaveLength(16);
    expect(eliminated).toHaveLength(240);
    expect(new Set(all.map((n) => n.recipientId)).size).toBe(256);
    const promotedIds = promoted.map((n) => n.recipientId);
    expect(promotedIds).toEqual(
      expect.arrayContaining([`a${pad(7)}`, `b${pad(7)}`]),
    );
    expect(promotedIds).not.toContain(`a${pad(8)}`);
    expect(eliminated.map((n) => n.recipientId)).toEqual(
      expect.arrayContaining([`a${pad(8)}`, `b${pad(8)}`]),
    );
  });
});

describe("two scheduler runs at the same time", () => {
  it("generate one bracket and notify every player exactly once", async () => {
    await seedLadder("LRACE", { name: "Emulator Race", maxPlayers: 512 });
    await seedSingles("LRACE", 300);

    const [first, second] = await Promise.all([
      runProcessLadderPhases(now),
      runProcessLadderPhases(now),
    ]);

    expect(
      first.playoffsGenerated.length + second.playoffsGenerated.length,
    ).toBe(1);
    expect(await tieCount("LRACE")).toBe(16);
    const all = await notifications();
    expect(all).toHaveLength(300);
    expect(new Set(all.map((n) => n.recipientId)).size).toBe(300);
  });
});

describe("a run that stopped part-way", () => {
  it("sends only the missing notifications on the next run", async () => {
    await seedLadder("LRESUME", { name: "Emulator Resume", maxPlayers: 512 });
    await seedSingles("LRESUME", 300);
    await runProcessLadderPhases(now);
    expect(await notifications()).toHaveLength(300);

    await db.doc("ladders/LRESUME").update({
      playoffNotificationsSentAt: admin.firestore.FieldValue.delete(),
    });
    const missing = ["u0000", "u0005", "u0200", "u0299"];
    for (const userId of missing) {
      const docs = await db.collection(`users/${userId}/notifications`).get();
      await Promise.all(docs.docs.map((doc) => doc.ref.delete()));
    }
    pushRequests.length = 0;

    await runProcessLadderPhases(now);

    const all = await notifications();
    expect(all).toHaveLength(300);
    expect(new Set(all.map((n) => n.recipientId)).size).toBe(300);
    expect(pushRequests).toHaveLength(missing.length);
    expect(
      (await ladderData("LRESUME")).playoffNotificationsSentAt,
    ).toBeDefined();

    pushRequests.length = 0;
    await runProcessLadderPhases(now);
    expect(pushRequests).toHaveLength(0);
    expect(await notifications()).toHaveLength(300);
  });
});

describe("games and disputes still open at the playoff start", () => {
  it("holds the bracket until the dispute is resolved, then generates", async () => {
    await seedLadder("LHOLD", { name: "Emulator Hold", maxPlayers: 512 });
    await seedSingles("LHOLD", 300);
    await db.doc("disputes/d1").set({
      ladderId: "LHOLD",
      stage: DISPUTE_STAGE.UNDER_REVIEW,
    });
    await db.doc("ladders/LHOLD/ladderMatches/m1").set({
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      games: [{ approvalStatus: "Pending" }],
    });

    const held = await runProcessLadderPhases(now);

    expect(held.playoffsHeld).toEqual(["LHOLD"]);
    expect(await ladderData("LHOLD")).toMatchObject({
      status: LADDER_STATUS.REGISTRATION_CLOSED,
      playoffHold: { openDisputes: 1, pendingGames: 1 },
    });
    expect(await tieCount("LHOLD")).toBe(0);
    expect(await notifications()).toHaveLength(0);

    await db.doc("disputes/d1").update({ stage: DISPUTE_STAGE.RESOLVED });
    await db
      .doc("ladders/LHOLD/ladderMatches/m1")
      .update({ games: [{ approvalStatus: "approved" }] });
    const released = await runProcessLadderPhases(now);

    expect(released.playoffsGenerated).toEqual(["LHOLD"]);
    expect((await ladderData("LHOLD")).playoffHold).toBeNull();
    expect(await tieCount("LHOLD")).toBe(16);
  });
});

describe("who can qualify", () => {
  it("skips deleted accounts and disqualified players but still tells the disqualified they missed out", async () => {
    await seedLadder("LELIG", {
      name: "Emulator Eligibility",
      maxPlayers: 256,
    });
    await seedSingles("LELIG", 140);
    await db.doc("users/u0000").delete();
    await db.doc("ladders/LELIG/reportCounts/u0001").set({
      strikes: { cheating: 3 },
    });

    await runProcessLadderPhases(now);

    const ties = await db.collection("ladders/LELIG/playoffTies").get();
    const qualifiers = ties.docs
      .map((doc) => doc.data())
      .filter((tie) => tie.round === 1)
      .flatMap((tie) => [tie.side1.entrantKey, tie.side2.entrantKey]);
    expect(qualifiers).toHaveLength(8);
    expect(qualifiers).not.toContain("u0000");
    expect(qualifiers).not.toContain("u0001");
    expect(qualifiers).toContain("u0009");

    const all = await notifications();
    const recipients = all.map((n) => n.recipientId);
    expect(recipients).not.toContain("u0000");
    expect(
      byTitle(all, "Playoffs have started").map((n) => n.recipientId),
    ).toContain("u0001");
    expect(all).toHaveLength(139);
  });
});

describe("schedule", () => {
  it("runs every 15 minutes", () => {
    const endpoint = (
      processLadderPhases as unknown as {
        __endpoint: { scheduleTrigger: { schedule: string } };
      }
    ).__endpoint;

    expect(endpoint.scheduleTrigger.schedule).toBe("every 15 minutes");
  });
});
