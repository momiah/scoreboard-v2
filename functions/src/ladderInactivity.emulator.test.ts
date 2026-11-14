import * as admin from "firebase-admin";
import {
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
} from "courtchamps-shared/types";
import {
  LADDER_INACTIVITY_WARNING_DAYS,
  LADDER_MIN_PLAYOFF_SIZE,
  getLadderInactivityRemoval,
  getLadderInactivityWarning,
} from "courtchamps-shared/helpers";

const PROJECT_ID = "demo-courtchamps";
const DAY_MS = 24 * 60 * 60 * 1000;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "Run these tests with `npm run test:emulator` so the Firestore emulator is running.",
  );
}

if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });

import { runProcessLadderPhases } from "./processLadderPhases";
import { LADDER_INACTIVITY_CANCELLED_REASON } from "./helpers/ladderInactivity";

const db = admin.firestore();
const now = new Date();
const daysFromNow = (days: number) => new Date(now.getTime() + days * DAY_MS);

const clearEmulator = async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
};

const writeAll = async (writes: [string, Record<string, unknown>][]) => {
  const writer = db.bulkWriter();
  writes.forEach(([path, data]) => void writer.set(db.doc(path), data));
  await writer.close();
};

const seedLadder = (ladderId: string, overrides: Record<string, unknown> = {}) =>
  db.doc(`ladders/${ladderId}`).set({
    name: `Ladder ${ladderId}`,
    ladderType: LADDER_TYPE.SINGLES,
    status: LADDER_STATUS.REGISTRATION_OPEN,
    registrationClosesAt: daysFromNow(-0.01),
    playoffStartsAt: daysFromNow(30),
    maxPlayers: 2048,
    entryFee: 0,
    currencyType: "GBP",
    participantCount: 0,
    ...overrides,
  });

const playedMatch = (participants: string[], extra: Record<string, unknown> = {}) => ({
  matchStatus: LADDER_MATCH_STATUS.COMPLETED,
  participants,
  playoffTieId: null,
  ...extra,
});

const activeSingles = (ladderId: string, count: number) => {
  const ids = Array.from({ length: count }, (_, i) => `active${String(i).padStart(3, "0")}`);
  const writes: [string, Record<string, unknown>][] = ids.map((userId) => [
    `ladders/${ladderId}/ladderParticipants/${userId}`,
    { userId },
  ]);
  for (let i = 0; i < ids.length; i += 2) {
    writes.push([
      `ladders/${ladderId}/ladderMatches/played${i}`,
      playedMatch([ids[i], ids[i + 1]]),
    ]);
  }
  return { ids, writes };
};

const notification = (userId: string, id: string) =>
  db.doc(`users/${userId}/notifications/${id}`).get();

beforeEach(clearEmulator);

describe("inactivity warnings", () => {
  it("warns only players without a completed match, once per warning day", async () => {
    const [first, second] = LADDER_INACTIVITY_WARNING_DAYS;
    await seedLadder("L1", { registrationClosesAt: daysFromNow(second - 0.5) });
    await writeAll([
      ["ladders/L1/ladderParticipants/user", { userId: "user" }],
      ["ladders/L1/ladderParticipants/opponent", { userId: "opponent" }],
      ["ladders/L1/ladderParticipants/idle", { userId: "idle" }],
      ["ladders/L1/ladderMatches/m1", playedMatch(["user", "opponent"])],
    ]);

    await runProcessLadderPhases(now);

    const warning = await notification("idle", `inactivity-warning-${second}-L1-idle`);
    expect(warning.data()).toMatchObject(
      getLadderInactivityWarning({ name: "Ladder L1" }, second),
    );
    expect((await notification("user", `inactivity-warning-${second}-L1-user`)).exists).toBe(false);
    expect((await db.doc("ladders/L1").get()).data()?.inactivityWarningDaysSent).toEqual([first, second]);

    await db.doc(`users/idle/notifications/inactivity-warning-${second}-L1-idle`).delete();
    await runProcessLadderPhases(now);
    expect((await notification("idle", `inactivity-warning-${second}-L1-idle`)).exists).toBe(false);
  });
});

describe("inactivity removal at registration close", () => {
  it("removes singles players without a completed match and cancels their open matches", async () => {
    await seedLadder("L1");
    const { ids, writes } = activeSingles("L1", LADDER_MIN_PLAYOFF_SIZE);
    await writeAll([
      ...writes,
      ["ladders/L1/ladderParticipants/idle", { userId: "idle" }],
      ["ladders/L1/ladderParticipants/noShow", { userId: "noShow" }],
      [
        "ladders/L1/ladderMatches/walkover",
        playedMatch([ids[0], "noShow"], { walkover: true, walkoverWinner: ids[0] }),
      ],
      [
        "ladders/L1/ladderMatches/open",
        { matchStatus: LADDER_MATCH_STATUS.ACCEPTED, participants: [ids[1], "idle"], playoffTieId: null },
      ],
    ]);

    const summary = await runProcessLadderPhases(now);

    expect(summary.inactiveRemoved).toEqual(["L1"]);
    expect(summary.registrationClosed).toEqual(["L1"]);
    expect((await db.doc("ladders/L1/ladderParticipants/idle").get()).exists).toBe(false);
    expect((await db.doc("ladders/L1/ladderParticipants/noShow").get()).exists).toBe(false);
    expect((await db.doc(`ladders/L1/ladderParticipants/${ids[0]}`).get()).exists).toBe(true);
    expect((await db.doc("ladders/L1/ladderMatches/open").get()).data()).toMatchObject({
      matchStatus: LADDER_MATCH_STATUS.CANCELLED,
      cancelledReason: LADDER_INACTIVITY_CANCELLED_REASON,
    });
    const ladder = (await db.doc("ladders/L1").get()).data();
    expect(ladder).toMatchObject({
      status: LADDER_STATUS.REGISTRATION_CLOSED,
      participantCount: LADDER_MIN_PLAYOFF_SIZE,
    });
    expect(ladder?.inactivityRemovedAt).toBeInstanceOf(admin.firestore.Timestamp);
    expect((await notification("idle", "inactivity-removed-L1-idle")).data()).toMatchObject(
      getLadderInactivityRemoval({ name: "Ladder L1" }),
    );
  });

  it("removes inactive doubles teams with their member claims and team link", async () => {
    await seedLadder("D1", { ladderType: LADDER_TYPE.DOUBLES });
    const writes: [string, Record<string, unknown>][] = [];
    const teamKeys = Array.from({ length: LADDER_MIN_PLAYOFF_SIZE }, (_, i) => `team${i}`);
    teamKeys.forEach((teamKey, i) =>
      writes.push([
        `ladders/D1/ladderTeams/${teamKey}`,
        { teamKey, teamId: teamKey, playerIds: [`${teamKey}a`, `${teamKey}b`] },
      ]),
    );
    for (let i = 0; i < teamKeys.length; i += 2) {
      const [a, b] = [teamKeys[i], teamKeys[i + 1]];
      writes.push([
        `ladders/D1/ladderMatches/m${i}`,
        playedMatch([`${a}a`, `${a}b`, `${b}a`, `${b}b`], {
          teams: [
            { teamId: a, teamKey: a, playerIds: [`${a}a`, `${a}b`] },
            { teamId: b, teamKey: b, playerIds: [`${b}a`, `${b}b`] },
          ],
        }),
      ]);
    }
    writes.push(
      ["ladders/D1/ladderTeams/idleTeam", { teamKey: "idleTeam", teamId: "idleTeam", playerIds: ["idleA", "idleB"] }],
      ["ladders/D1/ladderMembers/idleA", { userId: "idleA", teamKey: "idleTeam" }],
      ["ladders/D1/ladderMembers/idleB", { userId: "idleB", teamKey: "idleTeam" }],
      ["teams/idleTeam", { teamId: "idleTeam", ladderIds: ["D1", "other"] }],
    );
    await writeAll(writes);

    await runProcessLadderPhases(now);

    expect((await db.doc("ladders/D1/ladderTeams/idleTeam").get()).exists).toBe(false);
    expect((await db.doc("ladders/D1/ladderMembers/idleA").get()).exists).toBe(false);
    expect((await db.doc("teams/idleTeam").get()).data()?.ladderIds).toEqual(["other"]);
    expect((await db.doc("ladders/D1/ladderTeams/team0").get()).exists).toBe(true);
    expect((await notification("idleB", "inactivity-removed-D1-idleB")).exists).toBe(true);
  });

  it("leaves paid ladders alone", async () => {
    await seedLadder("P1", { entryFee: 10 });
    const { writes } = activeSingles("P1", LADDER_MIN_PLAYOFF_SIZE);
    await writeAll([...writes, ["ladders/P1/ladderParticipants/idle", { userId: "idle" }]]);

    const summary = await runProcessLadderPhases(now);

    expect(summary.inactiveRemoved).toEqual([]);
    expect((await db.doc("ladders/P1/ladderParticipants/idle").get()).exists).toBe(true);
  });
});
