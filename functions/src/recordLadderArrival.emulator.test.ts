import * as admin from "firebase-admin";
import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";

const PROJECT_ID = "demo-courtchamps";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "Run these tests with `npm run test:emulator` so the Firestore emulator is running.",
  );
}

if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });

import { recordArrival } from "./recordLadderArrival";

const db = admin.firestore();

const clearEmulator = async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
};

const nowMs = Date.now();
const court = { courtId: "c1", courtName: "Court One", location: { latitude: 51.5, longitude: -0.1 } };
const reading = (over: Record<string, unknown> = {}) => ({
  latitude: 51.5,
  longitude: -0.1,
  accuracy: 15,
  timestamp: nowMs - 2000,
  mocked: false,
  ...over,
});
const matchPath = "ladders/L1/ladderMatches/m1";
const record = (userId: string, over: Record<string, unknown> = {}) =>
  recordArrival({ db, userId, ladderId: "L1", matchId: "m1", reading: reading(over), nowMs });

beforeEach(async () => {
  await clearEmulator();
  await db.doc(matchPath).set({
    matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
    participants: ["a", "b"],
    court,
    matchDate: new Date(nowMs).toLocaleDateString("en-GB", { timeZone: "Europe/London" }).replace(/\//g, "-"),
    matchTime: { start: "00:00" },
  });
});

describe("recordArrival", () => {
  it("records a real reading at the court with the server's clock", async () => {
    expect(await record("a")).toEqual({ ok: true, distanceMeters: 0, opponentArrived: false });
    const arrival = (await db.doc(matchPath).get()).data()?.arrivals?.a;
    expect(arrival).toMatchObject({ distanceMeters: 0, accuracyMeters: 15 });
    expect(arrival.verifiedAt).toBeInstanceOf(admin.firestore.Timestamp);
  });

  it("tells the second player their opponent has arrived", async () => {
    await record("a");
    expect(await record("b")).toMatchObject({ ok: true, opponentArrived: true });
  });

  it("refuses mocked or distant readings and writes nothing", async () => {
    expect(await record("a", { mocked: true })).toMatchObject({ ok: false, reason: "mocked" });
    expect(await record("a", { latitude: 51.53 })).toMatchObject({ ok: false, reason: "too_far" });
    expect((await db.doc(matchPath).get()).data()?.arrivals).toBeUndefined();
  });

  it("refuses someone who isn't playing", async () => {
    await expect(record("z")).rejects.toThrow("not playing");
  });
});
