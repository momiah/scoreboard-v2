import * as admin from "firebase-admin";
import {
  LADDER_MATCH_STATUS,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
} from "courtchamps-shared/types";
import type { LadderPlayoffTie } from "courtchamps-shared/types";
import { buildLadderPlayoffTies, getLadderPlayoffLegHost } from "courtchamps-shared/helpers";
import type { LadderPlayoffEntrant } from "courtchamps-shared/helpers";

const PROJECT_ID = "demo-courtchamps";
const DAY_MS = 24 * 60 * 60 * 1000;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "Run these tests with `npm run test:emulator` so the Firestore emulator is running.",
  );
}

if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });

import {
  notifyLadderPlayoffResolution,
  resolveLadderPlayoffTie,
  sendDueLadderPlayoffReminders,
  toLadderPlayoffTie,
} from "./helpers/ladderPlayoffTies";

const db = admin.firestore();
const realFetch = global.fetch;

const clearEmulator = async () => {
  await realFetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
};

const start = new Date("2026-10-01T09:00:00Z");
const LADDER = "L1";
const ladder = { ladderId: LADDER, name: "Test Ladder" };

const entrant = (key: string): LadderPlayoffEntrant => ({
  entrantKey: key,
  teamId: null,
  players: [{ userId: key, firstName: key, lastName: "", username: key }],
  competitionXP: 0,
  numberOfWins: 0,
  totalPointDifference: 0,
  globalXp: 0,
  joinedAt: null,
  homeCourt: null,
});

const court = { courtId: "c1", courtName: "Court One" };

const approvedGame = (matchId: string, n: number, winner: string, loser: string) => ({
  gameId: `${matchId}-g${n}`,
  gameNumber: n,
  approvalStatus: "approved",
  team1: { player1: { userId: winner }, player2: null, score: 21 },
  team2: { player1: { userId: loser }, player2: null, score: 15 },
  result: {
    winner: { team: "Team 1", players: [winner], score: 21 },
    loser: { team: "Team 2", players: [loser], score: 15 },
  },
  approvers: [],
  numberOfApprovals: 1,
  numberOfDeclines: 0,
  reporter: winner,
  gamescore: "21-15",
});

const tiePath = (tieId: string) => `ladders/${LADDER}/playoffTies/${tieId}`;
const readTie = async (tieId: string) =>
  toLadderPlayoffTie(tieId, (await db.doc(tiePath(tieId)).get()).data() ?? {});

const seedBracket = async (size = 4) => {
  await db.doc(`ladders/${LADDER}`).set({
    name: ladder.name,
    status: LADDER_STATUS.PLAYOFFS,
    ladderType: LADDER_TYPE.SINGLES,
  });
  const ties = buildLadderPlayoffTies({
    ladderId: LADDER,
    qualifiers: Array.from({ length: size }, (_, i) => entrant(`p${i}`)),
    createdAt: start,
  });
  const writer = db.bulkWriter();
  ties.forEach((tie) => {
    void writer.set(db.doc(tiePath(tie.tieId)), {
      ...tie,
    });
  });
  await writer.close();
  return ties;
};

const sidesOf = (tie: LadderPlayoffTie) => [
  tie.side1?.entrantKey as string,
  tie.side2?.entrantKey as string,
];

const seedLeg = async (
  tie: LadderPlayoffTie,
  leg: 1 | 2 | 3,
  winners: string[],
  status: string = LADDER_MATCH_STATUS.COMPLETED,
  extra: Record<string, unknown> = {},
) => {
  const [a, b] = sidesOf(tie);
  const matchId = `${tie.tieId}-leg${leg}`;
  await db.doc(`ladders/${LADDER}/ladderMatches/${matchId}`).set({
    ladderMatchId: matchId,
    playoffTieId: tie.tieId,
    playoffLeg: leg,
    ladderType: LADDER_TYPE.SINGLES,
    matchStatus: status,
    participants: [a, b],
    bestOf: winners.length,
    court,
    matchDate: "2026-10-05",
    matchTime: { start: "18:00" },
    currencyType: "GBP",
    shuttleType: "Feather",
    courtFee: 0,
    checkIn: { checkedInBy: [a, b], checkedInAt: {}, completed: true, completedAt: start },
    games: winners.map((winner, i) =>
      approvedGame(matchId, i + 1, winner, winner === a ? b : a),
    ),
    ...extra,
  });
};

const notificationIds = async (userId: string) =>
  (await db.collection(`users/${userId}/notifications`).get()).docs.map((d) => d.id);

const seedUsers = async (ids: string[]) => {
  const writer = db.bulkWriter();
  ids.forEach((id) => {
    void writer.set(db.doc(`users/${id}`), { userId: id, pushTokens: [] });
  });
  await writer.close();
};

beforeEach(async () => {
  await clearEmulator();
  global.fetch = jest.fn(async () => ({ ok: true })) as unknown as typeof fetch;
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterAll(() => {
  global.fetch = realFetch;
});

describe("resolveLadderPlayoffTie", () => {
  it("sends the aggregate winner through and opens the Final once both semis finish", async () => {
    const ties = await seedBracket(4);
    const [semiOne, semiTwo] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(semiOne);
    const [c, d] = sidesOf(semiTwo);
    await seedUsers([a, b, c, d]);

    await seedLeg(semiOne, 1, [a, a, b]);
    await seedLeg(semiOne, 2, [b, a, a]);
    const first = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: semiOne.tieId, now: start });
    expect(first?.tie.tieId).toBe(semiOne.tieId);
    expect(await readTie(semiOne.tieId)).toMatchObject({
      status: LADDER_PLAYOFF_TIE_STATUS.COMPLETED,
      winner: "team1",
      outcome: LADDER_PLAYOFF_TIE_OUTCOME.PLAYED,
    });
    expect((await readTie("r2-s0")).status).toBe(LADDER_PLAYOFF_TIE_STATUS.AWAITING_ENTRANTS);

    await seedLeg(semiTwo, 1, [d, d, d]);
    await seedLeg(semiTwo, 2, [c, d, d]);
    const second = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: semiTwo.tieId, now: start });
    if (!second) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder, resolution: second });

    const final = await readTie("r2-s0");
    expect(sidesOf(final)).toEqual([a, d]);
    expect(final).toMatchObject({
      status: LADDER_PLAYOFF_TIE_STATUS.SCHEDULED,
      deadlineAt: new Date(start.getTime() + 10 * DAY_MS),
    });
    const thirdPlace = await readTie("r2-s1");
    expect(sidesOf(thirdPlace)).toEqual([b, c]);
    expect(thirdPlace.status).toBe(LADDER_PLAYOFF_TIE_STATUS.SCHEDULED);
    expect(await notificationIds(a)).toContain(`playoff-round-r2-s0-${LADDER}-${a}`);
    expect(await notificationIds(c)).toContain(`playoff-round-r2-s1-${LADDER}-${c}`);
  });

  it("does nothing until both matches are complete", async () => {
    const ties = await seedBracket(4);
    const tie = ties[0];
    const [a] = sidesOf(tie);
    await seedLeg(tie, 1, [a, a, a]);
    expect(await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: tie.tieId, now: start })).toBeNull();
    expect((await readTie(tie.tieId)).status).toBe(LADDER_PLAYOFF_TIE_STATUS.SCHEDULED);
  });

  it("creates one checked-in deciding game at match 2's court when level", async () => {
    const ties = await seedBracket(4);
    const tie = ties[0];
    const [a, b] = sidesOf(tie);
    await seedUsers([a, b]);
    await seedLeg(tie, 1, [a, a, a]);
    await seedLeg(tie, 2, [b, b, b]);

    const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: tie.tieId, now: start });
    expect(resolution?.deciderCreated).toBe(true);
    if (resolution) await notifyLadderPlayoffResolution({ ladder, resolution });
    expect(await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: tie.tieId, now: start })).toBeNull();

    const [hostId, awayId] =
      getLadderPlayoffLegHost(tie, 3) === "team1" ? [a, b] : [b, a];
    const deciders = (
      await db.collection(`ladders/${LADDER}/ladderMatches`).where("playoffLeg", "==", 3).get()
    ).docs.map((d) => d.data());
    expect(deciders).toHaveLength(1);
    expect(deciders[0]).toMatchObject({
      playoffTieId: tie.tieId,
      bestOf: 1,
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      court,
      courtFee: 0,
      checkIn: { completed: true },
      createdBy: hostId,
      acceptedBy: awayId,
      participants: [hostId, awayId],
    });
    expect((await readTie(tie.tieId)).deciderRequired).toBe(true);
    expect(await notificationIds(b)).toContain(`playoff-decider-${tie.tieId}-${LADDER}-${b}`);
  });

  it("puts the decider at the court of whichever match was played last", async () => {
    const ties = await seedBracket(4);
    const tie = ties[0];
    const [a, b] = sidesOf(tie);
    await seedUsers([a, b]);
    const otherCourt = { ...court, courtId: "c-late", courtName: "Played last" };
    await seedLeg(tie, 1, [a, a, a], LADDER_MATCH_STATUS.COMPLETED, {
      court: otherCourt,
      completedAt: new Date(start.getTime() + 2 * DAY_MS),
    });
    await seedLeg(tie, 2, [b, b, b], LADDER_MATCH_STATUS.COMPLETED, {
      completedAt: new Date(start.getTime() + DAY_MS),
    });

    await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: tie.tieId, now: start });
    const [decider] = (
      await db.collection(`ladders/${LADDER}/ladderMatches`).where("playoffLeg", "==", 3).get()
    ).docs.map((d) => d.data());
    expect(decider.court).toEqual(otherCourt);
  });

  it("lets the decider settle a level tie", async () => {
    const ties = await seedBracket(4);
    const tie = ties[0];
    const [a, b] = sidesOf(tie);
    await seedLeg(tie, 1, [a, a, a]);
    await seedLeg(tie, 2, [b, b, b]);
    await seedLeg(tie, 3, [b]);

    await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: tie.tieId, now: start });

    expect(await readTie(tie.tieId)).toMatchObject({ status: LADDER_PLAYOFF_TIE_STATUS.COMPLETED, winner: "team2" });
  });
});

describe("deadlines", () => {
  const afterDeadline = new Date(start.getTime() + 10 * DAY_MS + 1000);

  it("waits until the deadline", async () => {
    const ties = await seedBracket(4);
    expect(
      await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: ties[0].tieId, now: start, atDeadline: true }),
    ).toBeNull();
  });

  it("decides on what was played, then voids a tie nobody played", async () => {
    const ties = await seedBracket(4);
    const [semiOne, semiTwo] = ties.filter((t) => t.round === 1);
    const [, b] = sidesOf(semiOne);
    await seedLeg(semiOne, 1, [b], LADDER_MATCH_STATUS.ACCEPTED);

    await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: semiOne.tieId, now: afterDeadline, atDeadline: true });
    expect(await readTie(semiOne.tieId)).toMatchObject({
      winner: "team2",
      outcome: LADDER_PLAYOFF_TIE_OUTCOME.DEADLINE,
    });

    await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: semiTwo.tieId, now: afterDeadline, atDeadline: true });
    expect(await readTie(semiTwo.tieId)).toMatchObject({ winner: null, outcome: LADDER_PLAYOFF_TIE_OUTCOME.VOID });

    expect(await readTie("r2-s0")).toMatchObject({
      status: LADDER_PLAYOFF_TIE_STATUS.COMPLETED,
      winner: "team1",
      outcome: LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER,
    });
    expect((await readTie("r2-s0")).side1?.entrantKey).toBe(b);
  });
});

describe("sendDueLadderPlayoffReminders", () => {
  it("sends the day-3 reminder once", async () => {
    const ties = await seedBracket(4);
    const tie = ties[0];
    const [a, b] = sidesOf(tie);
    await seedUsers([a, b]);
    const dayThree = new Date(start.getTime() + 3 * DAY_MS + 1000);
    const scheduled = (await Promise.all(ties.map((t) => readTie(t.tieId)))).filter(
      (t) => t.status === LADDER_PLAYOFF_TIE_STATUS.SCHEDULED,
    );

    expect(await sendDueLadderPlayoffReminders({ db, ladder, ties: scheduled, now: dayThree })).toBe(2);
    expect((await readTie(tie.tieId)).remindersSentDays).toEqual([3]);
    expect(await notificationIds(a)).toContain(`playoff-reminder-${tie.tieId}-day3-${LADDER}-${a}`);

    const again = (await Promise.all(ties.map((t) => readTie(t.tieId)))).filter(
      (t) => t.status === LADDER_PLAYOFF_TIE_STATUS.SCHEDULED,
    );
    expect(await sendDueLadderPlayoffReminders({ db, ladder, ties: again, now: dayThree })).toBe(0);
  });
});
