import * as admin from "firebase-admin";
import {
  LADDER_ELIGIBILITY_COLLECTION,
  LADDER_ELIGIBILITY_RADIUS_MILES,
  getLadderEligibilityId,
} from "courtchamps-shared/helpers";

const PROJECT_ID = "demo-courtchamps";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "Run these tests with `npm run test:emulator` so the Firestore emulator is running.",
  );
}

if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });

import { verifyEligibility } from "./verifyLadderEligibility";

const db = admin.firestore();

const clearEmulator = async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
};

const nowMs = Date.now();
const reading = (over: Record<string, unknown> = {}) => ({
  latitude: 51.6,
  longitude: -0.2,
  accuracy: 500,
  timestamp: nowMs - 2000,
  mocked: false,
  ...over,
});
const eligibilityPath = `${LADDER_ELIGIBILITY_COLLECTION}/${getLadderEligibilityId("L1", "u1")}`;
const verify = (over: Record<string, unknown> = {}) =>
  verifyEligibility({ db, userId: "u1", ladderId: "L1", reading: reading(over), nowMs });

beforeEach(async () => {
  await clearEmulator();
  await db.doc("courts/c1").set({ courtName: "Barnet", location: { latitude: 51.6252, longitude: -0.1517 } });
  await db.doc("courts/c2").set({ courtName: "Harrow", location: { latitude: 51.5806, longitude: -0.342 } });
  await db.doc("ladders/L1").set({ entryFee: 0, courtIds: ["c1", "c2"] });
});

describe("verifyEligibility", () => {
  it("records the distance to the nearest court, never the coordinates", async () => {
    const result = await verify();
    expect(result).toMatchObject({ ok: true, nearestCourtId: "c1" });
    const saved = (await db.doc(eligibilityPath).get()).data();
    expect(saved).toMatchObject({
      userId: "u1",
      ladderId: "L1",
      nearestCourtId: "c1",
      radiusMiles: LADDER_ELIGIBILITY_RADIUS_MILES,
    });
    expect(saved?.verifiedAt).toBeInstanceOf(admin.firestore.Timestamp);
    expect(saved).not.toHaveProperty("latitude");
    expect(saved).not.toHaveProperty("longitude");
  });

  it("uses the ladder's own radius", async () => {
    await db.doc("ladders/L1").update({ eligibilityRadiusMiles: 1 });
    expect(await verify()).toMatchObject({ ok: false, reason: "too_far", radiusMiles: 1 });
  });

  it("refuses far-away and mocked readings and writes nothing", async () => {
    expect(await verify({ latitude: 13.7563, longitude: 100.5018 })).toMatchObject({
      ok: false,
      reason: "too_far",
    });
    expect(await verify({ mocked: true })).toMatchObject({ ok: false, reason: "mocked" });
    expect((await db.doc(eligibilityPath).get()).exists).toBe(false);
  });

  it("refuses paid ladders, which have no location check", async () => {
    await db.doc("ladders/L1").update({ entryFee: 10 });
    await expect(verify()).rejects.toThrow("no location check");
  });

  it("refuses a ladder whose courts have no location", async () => {
    await db.doc("ladders/L1").update({ courtIds: ["missing"] });
    expect(await verify()).toMatchObject({ ok: false, reason: "no_courts" });
  });
});
