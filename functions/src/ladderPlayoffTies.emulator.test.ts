import { LADDER_PLAYOFF_TIE_DAYS } from "courtchamps-shared/types";
import * as admin from "firebase-admin";
import {
  LADDER_MATCH_STATUS,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
} from "courtchamps-shared/types";
import type { LadderPlayoffTie } from "courtchamps-shared/types";
import {
  LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS,
  buildLadderPlayoffTies,
  getLadderPlacePrize,
  getLadderPlayoffLegHost,
} from "courtchamps-shared/helpers";
import type { LadderPlayoffEntrant } from "courtchamps-shared/helpers";

const PROJECT_ID = "demo-courtchamps";
const DAY_MS = 24 * 60 * 60 * 1000;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "Run these tests with `npm run test:emulator` so the Firestore emulator is running.",
  );
}

if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });

import { runProcessLadderPhases } from "./processLadderPhases";
import * as prizeAwards from "./helpers/prizeAwards";
import { applyLadderPrizeReview } from "./onLadderPrizePayoutReviewed";
import {
  completeAndPayLadder,
  completeLadderPlayoffsIfFinished,
  notifyLadderPlayoffResolution,
  resolveLadderPlayoffTie,
  autoAcceptDueLadderPlayoffMatches,
  sendDueLadderPlayoffReminders,
  sendLadderPlayoffHostOverdueNotices,
  settleDisqualifiedLadderPlayoffTies,
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
const ladder = {
  ladderId: LADDER,
  name: "Test Ladder",
  entryFee: 20,
  participantCount: 128,
  maxPlayers: 256,
  currencyType: "GBP",
};

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
    ...ladder,
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

const PLACE_KEYS = ["first", "second", "third", "fourth"] as const;
const startingXp = new Map<string, number>();

const seedProfiles = async (ids: string[]) => {
  const writer = db.bulkWriter();
  ids.forEach((id, index) => {
    const XP = 1200 + index * 173;
    startingXp.set(id, XP);
    void writer.set(db.doc(`users/${id}`), {
      userId: id,
      username: id,
      pushTokens: [],
      profileDetail: {
        XP,
        memberSince: "Mar 2026",
        numberOfWins: 14 + index,
        numberOfLosses: 9,
        leagueStats: { first: index % 2, second: 0, third: 1, fourth: 0 },
        tournamentStats: { first: 0, second: 1, third: 0, fourth: 0 },
        ...(index % 3 === 0 ? {} : { ladderStats: { first: 0, second: 0, third: 0, fourth: 0 } }),
      },
    });
  });
  await writer.close();
};

const profileOf = async (userId: string) =>
  (await db.doc(`users/${userId}`).get()).data()?.profileDetail;

const xpGained = async (userId: string) =>
  (await profileOf(userId)).XP - (startingXp.get(userId) as number);

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
    if (!first) throw new Error("expected a resolution");
    expect(first.tie.tieId).toBe(semiOne.tieId);
    await notifyLadderPlayoffResolution({ ladder, resolution: first });
    expect(await notificationIds(a)).toEqual([`playoff-through-r2-s0-${LADDER}-${a}`]);
    expect(await notificationIds(b)).toEqual([`playoff-through-r2-s1-${LADDER}-${b}`]);
    const through = await db.doc(`users/${a}/notifications/playoff-through-r2-s0-${LADDER}-${a}`).get();
    expect(through.data()).toMatchObject({
      title: "Congratulations, you're through to the Final!",
      message: `You're through to the Final in ${ladder.name}! We'll let you know as soon as your opponent is decided.`,
    });
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
    expect(await notificationIds(a)).toContain(`playoff-opponent-r2-s0-${LADDER}-${a}`);
    expect(await notificationIds(a)).not.toContain(`playoff-round-r2-s0-${LADDER}-${a}`);
    expect(await notificationIds(d)).toContain(`playoff-round-r2-s0-${LADDER}-${d}`);
    expect(await notificationIds(b)).toContain(`playoff-opponent-r2-s1-${LADDER}-${b}`);
    expect(await notificationIds(c)).toContain(`playoff-round-r2-s1-${LADDER}-${c}`);
    const ready = await db.doc(`users/${a}/notifications/playoff-opponent-r2-s0-${LADDER}-${a}`).get();
    expect(ready.data()).toMatchObject({
      title: "Your Final opponent is decided",
      message: `Your Final against ${d} is ready! You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`,
    });
    const arrived = await db.doc(`users/${d}/notifications/playoff-round-r2-s0-${LADDER}-${d}`).get();
    expect(arrived.data()).toMatchObject({
      title: "Congratulations, you're through to the Final!",
      message: `Congratulations! You've made it to the Final in ${ladder.name}. You have ${LADDER_PLAYOFF_TIE_DAYS} days to play your matches.`,
    });
  });

  it("tells a knocked-out player what they won", async () => {
    const ties = await seedBracket(8);
    const [quarter] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(quarter);
    await seedUsers([a, b]);
    await seedLeg(quarter, 1, [a, a, a]);
    await seedLeg(quarter, 2, [a, b, a]);

    const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: quarter.tieId, now: start });
    if (!resolution) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder, resolution });

    const out = await db.doc(`users/${b}/notifications/playoff-out-${quarter.tieId}-${LADDER}-${b}`).get();
    expect(out.data()).toMatchObject({
      title: "Knocked out in the Quarter-Final",
      message: "You've been knocked out in the Quarter-Final of Test Ladder. You've been awarded £160 and 400 CP, paid when the playoffs finish.",
    });

  });

  it("doesn't mention prizes to a player knocked out before the paid places", async () => {
    const ties = await seedBracket(16);
    const [first] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await seedUsers([a, b]);
    await seedLeg(first, 1, [a, a, a]);
    await seedLeg(first, 2, [a, a, a]);

    const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: first.tieId, now: start });
    if (!resolution) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder: { ...ladder, participantCount: 256 }, resolution });

    const out = await db.doc(`users/${b}/notifications/playoff-out-${first.tieId}-${LADDER}-${b}`).get();
    expect(out.data()?.message).toBe("You've been knocked out in the Round of 16 of Test Ladder.");
  });

  it("places the last four, tells them what they won and completes the ladder", async () => {
    const ties = await seedBracket(4);
    const [semiOne, semiTwo] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(semiOne);
    const [c, d] = sidesOf(semiTwo);
    await seedUsers([a, b, c, d]);
    for (const semi of [semiOne, semiTwo]) {
      const [winner, loser] = sidesOf(semi);
      await seedLeg(semi, 1, [winner, winner, loser]);
      await seedLeg(semi, 2, [winner, winner, winner]);
      const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: semi.tieId, now: start });
      if (!resolution) throw new Error("expected a resolution");
      await notifyLadderPlayoffResolution({ ladder, resolution });
    }

    const final = await readTie("r2-s0");
    const thirdPlace = await readTie("r2-s1");
    const [f1, f2] = sidesOf(final);
    const [t1, t2] = sidesOf(thirdPlace);
    expect(await notificationIds(b)).toContain(`playoff-through-r2-s1-${LADDER}-${b}`);
    const thirdNotice = await db.doc(`users/${t2}/notifications/playoff-round-r2-s1-${LADDER}-${t2}`).get();
    expect(thirdNotice.data()).toMatchObject({
      title: "You'll play for 3rd place",
      message: `Your Semi-Final in ${ladder.name} is over, and you'll play for 3rd place against ${t1}. You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`,
    });
    const thirdReady = await db.doc(`users/${t1}/notifications/playoff-opponent-r2-s1-${LADDER}-${t1}`).get();
    expect(thirdReady.data()).toMatchObject({
      title: "Your 3rd-place tie opponent is decided",
      message: `Your Semi-Final in ${ladder.name} is over, and your 3rd-place tie against ${t2} is ready! You have ${LADDER_PLAYOFF_TIE_DAYS} days to complete both matches`,
    });

    await seedLeg(final, 1, [f1, f1, f2]);
    await seedLeg(final, 2, [f1, f1, f1]);
    const finalResolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: "r2-s0", now: start });
    if (!finalResolution) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder, resolution: finalResolution });
    expect(await completeLadderPlayoffsIfFinished({ db, ladderId: LADDER, resolution: finalResolution, now: start })).toBe(false);

    const champion = await db.doc(`users/${f1}/notifications/playoff-finish-r2-s0-${LADDER}-${f1}`).get();
    expect(champion.data()).toMatchObject({
      title: "You placed 1st",
      message: "Congratulations, you have placed 1st in Test Ladder and been awarded £897 and 2,240 CP, paid when the playoffs finish.",
    });
    const runnerUp = await db.doc(`users/${f2}/notifications/playoff-finish-r2-s0-${LADDER}-${f2}`).get();
    expect(runnerUp.data()?.message).toBe("Congratulations, you have placed 2nd in Test Ladder and been awarded £512 and 1,280 CP, paid when the playoffs finish.");

    await seedLeg(thirdPlace, 1, [t2, t2, t1]);
    await seedLeg(thirdPlace, 2, [t2, t2, t2]);
    const thirdResolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: "r2-s1", now: start });
    if (!thirdResolution) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder, resolution: thirdResolution });
    const fourth = await db.doc(`users/${t1}/notifications/playoff-finish-r2-s1-${LADDER}-${t1}`).get();
    expect(fourth.data()?.message).toBe("Congratulations, you have placed 4th in Test Ladder and been awarded £204 and 512 CP.");

    expect(await completeLadderPlayoffsIfFinished({ db, ladderId: LADDER, resolution: thirdResolution, now: start })).toBe(true);
    expect((await db.doc(`ladders/${LADDER}`).get()).data()).toMatchObject({
      status: LADDER_STATUS.COMPLETED,
      playoffsCompletedAt: admin.firestore.Timestamp.fromDate(start),
    });
    expect(await completeLadderPlayoffsIfFinished({ db, ladderId: LADDER, resolution: thirdResolution, now: start })).toBe(false);
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
    const notice = await db.doc(`users/${b}/notifications/playoff-decider-${tie.tieId}-${LADDER}-${b}`).get();
    expect(notice.data()).toMatchObject({
      title: "You have a deciding game left to play",
      message: `You have a deciding game left to play as your matches in the Semi-Final of ${ladder.name} resulted in a draw!`,
    });
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

describe("an inactive side", () => {
  const afterDeadline = new Date(start.getTime() + 10 * DAY_MS + 1000);

  const postedLeg = async (tie: LadderPlayoffTie, leg: 1 | 2, createdBy: string, extra: Record<string, unknown> = {}) => {
    const [a, b] = sidesOf(tie);
    const id = `${tie.tieId}-leg${leg}`;
    await db.doc(`ladders/${LADDER}/ladderMatches/${id}`).set({
      ladderMatchId: id,
      playoffTieId: tie.tieId,
      playoffLeg: leg,
      ladderType: LADDER_TYPE.SINGLES,
      matchStatus: LADDER_MATCH_STATUS.POSTED,
      participants: [a, b],
      createdBy,
      createdAt: start,
      games: [],
      ...extra,
    });
  };

  it("hands the tie to the only side that arranged a match, and tells both", async () => {
    const ties = await seedBracket(8);
    const [first] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await seedUsers([a, b]);
    await postedLeg(first, 2, a);

    const resolution = await resolveLadderPlayoffTie({
      db, ladderId: LADDER, tieId: first.tieId, now: afterDeadline, atDeadline: true,
    });
    if (!resolution) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder, resolution });
    expect(await readTie(first.tieId)).toMatchObject({
      winner: "team1",
      outcome: LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER,
      walkoverReason: "inactiveOpponent",
    });
    const out = await db.doc(`users/${b}/notifications/playoff-out-${first.tieId}-${LADDER}-${b}`).get();
    expect(out.data()?.message).toBe(
      `You've been knocked out in the Quarter-Final of ${ladder.name} because you didn't arrange or play a match before the deadline. You've been awarded £160 and 400 CP, paid when the playoffs finish.`,
    );
    const through = await db.doc(`users/${a}/notifications/playoff-through-r2-s0-${LADDER}-${a}`).get();
    expect(through.data()?.message).toContain("Your opponent didn't arrange or play a match, so you go through on a walkover.");
  });

  it("voids the tie when both sides did something or neither did", async () => {
    const ties = await seedBracket(8);
    const [first, second] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await postedLeg(first, 1, a);
    await postedLeg(first, 2, b);
    await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: first.tieId, now: afterDeadline, atDeadline: true });
    expect((await readTie(first.tieId)).outcome).toBe(LADDER_PLAYOFF_TIE_OUTCOME.VOID);
    await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: second.tieId, now: afterDeadline, atDeadline: true });
    expect((await readTie(second.tieId)).outcome).toBe(LADDER_PLAYOFF_TIE_OUTCOME.VOID);
  });

  it("doesn't count an auto-accepted match as activity from the side it was accepted for", async () => {
    const ties = await seedBracket(8);
    const [first] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await postedLeg(first, 1, a, {
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      acceptedBy: b,
      autoAccepted: true,
    });
    await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: first.tieId, now: afterDeadline, atDeadline: true });
    expect(await readTie(first.tieId)).toMatchObject({ winner: "team1", outcome: LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER });
  });

  it("tells both sides once, after 48 hours, that match 1 isn't arranged", async () => {
    const ties = await seedBracket(4);
    const [first] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await seedUsers([a, b]);
    const scheduled = async () => [await readTie(first.tieId)];
    const fortyEight = new Date(start.getTime() + 48 * 60 * 60 * 1000);

    expect(
      await sendLadderPlayoffHostOverdueNotices({ db, ladder, ties: await scheduled(), now: new Date(fortyEight.getTime() - 1000) }),
    ).toBe(0);
    expect(await sendLadderPlayoffHostOverdueNotices({ db, ladder, ties: await scheduled(), now: fortyEight })).toBe(1);
    expect((await db.doc(tiePath(first.tieId)).get()).data()?.hostOverdueNoticeSentAt).toEqual(
      admin.firestore.Timestamp.fromDate(fortyEight),
    );
    expect(await sendLadderPlayoffHostOverdueNotices({ db, ladder, ties: await scheduled(), now: fortyEight })).toBe(0);

    const host = getLadderPlayoffLegHost(first, 1) === "team1" ? a : b;
    const waiting = host === a ? b : a;
    const waitingNotice = await db.doc(`users/${waiting}/notifications/playoff-host-overdue-waiting-${first.tieId}-${LADDER}-${waiting}`).get();
    expect(waitingNotice.data()).toMatchObject({
      title: "You can arrange your match now",
      message: `${host} hasn't arranged match 1, so you can now arrange your home match without waiting.`,
    });
    const hostNotice = await db.doc(`users/${host}/notifications/playoff-host-overdue-host-${first.tieId}-${LADDER}-${host}`).get();
    expect(hostNotice.data()?.title).toBe("Arrange match 1");
  });

  it("says nothing when match 1 is already arranged", async () => {
    const ties = await seedBracket(4);
    const [first] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await seedUsers([a, b]);
    const host = getLadderPlayoffLegHost(first, 1) === "team1" ? a : b;
    await postedLeg(first, 1, host);
    const later = new Date(start.getTime() + 5 * DAY_MS);
    expect(
      await sendLadderPlayoffHostOverdueNotices({ db, ladder, ties: [await readTie(first.tieId)], now: later }),
    ).toBe(0);
  });
});

describe("a disqualified player", () => {
  const strikes = async (userId: string) =>
    db.doc(`ladders/${LADDER}/reportCounts/${userId}`).set({ userId, strikes: { cheating: 3 } });

  it("hands the tie to their opponent on a walkover", async () => {
    const ties = await seedBracket(8);
    const [first] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await seedUsers([a, b]);
    await strikes(b);

    const settled = await settleDisqualifiedLadderPlayoffTies({
      db, ladder, ties: [await readTie(first.tieId)], now: start,
    });
    expect(settled).toEqual([first.tieId]);
    expect(await readTie(first.tieId)).toMatchObject({
      winner: "team1",
      outcome: LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER,
      walkoverReason: "disqualifiedOpponent",
    });
    const out = await db.doc(`users/${b}/notifications/playoff-out-${first.tieId}-${LADDER}-${b}`).get();
    expect(out.data()?.message).toContain("because you've been disqualified from the ladder.");
    expect((await db.doc(`users/${a}/notifications/playoff-through-r2-s0-${LADDER}-${a}`).get()).data()?.message).toContain(
      "Your opponent was disqualified from the ladder, so you go through on a walkover.",
    );
  });

  it("voids the tie when both sides are out, and leaves a clean tie alone", async () => {
    const ties = await seedBracket(8);
    const [first, second] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await seedUsers([a, b]);
    await strikes(a);
    await strikes(b);
    const settled = await settleDisqualifiedLadderPlayoffTies({
      db, ladder, ties: [await readTie(first.tieId), await readTie(second.tieId)], now: start,
    });
    expect(settled).toEqual([first.tieId]);
    expect((await readTie(first.tieId)).outcome).toBe(LADDER_PLAYOFF_TIE_OUTCOME.VOID);
    expect((await readTie(second.tieId)).status).toBe(LADDER_PLAYOFF_TIE_STATUS.SCHEDULED);
  });

  it("treats a doubles side with one disqualified partner as out", async () => {
    const ties = await seedBracket(4);
    const [first] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    await seedUsers([a, b, "p2"]);
    await db.doc(tiePath(first.tieId)).update({
      "side2.playerIds": [b, "p2"],
    });
    await strikes("p2");
    const settled = await settleDisqualifiedLadderPlayoffTies({
      db, ladder, ties: [await readTie(first.tieId)], now: start,
    });
    expect(settled).toEqual([first.tieId]);
    expect((await readTie(first.tieId)).winner).toBe("team1");
  });
});

describe("the scheduled job", () => {
  it("settles a disqualified side, sends the 48-hour notice and hands over an inactive tie at the deadline", async () => {
    const ties = await seedBracket(8);
    const [first, second, third] = ties.filter((t) => t.round === 1);
    const [a, b] = sidesOf(first);
    const [c] = sidesOf(second);
    const [d] = sidesOf(third);
    await seedUsers([...ties.filter((t) => t.round === 1).flatMap(sidesOf)]);
    await db.doc(`ladders/${LADDER}/reportCounts/${b}`).set({ userId: b, strikes: { cheating: 3 } });
    await db.doc(`ladders/${LADDER}/ladderMatches/third-leg2`).set({
      ladderMatchId: "third-leg2",
      playoffTieId: third.tieId,
      playoffLeg: 2,
      ladderType: LADDER_TYPE.SINGLES,
      matchStatus: LADDER_MATCH_STATUS.POSTED,
      participants: sidesOf(third),
      createdBy: d,
      createdAt: new Date(start.getTime() + 11 * DAY_MS),
      games: [],
    });

    const early = await runProcessLadderPhases(new Date(start.getTime() + 3 * DAY_MS));
    expect(early.playoffTiesSettled).toEqual([`${LADDER}/${first.tieId}`]);
    expect(await readTie(first.tieId)).toMatchObject({ winner: "team1", outcome: LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER });
    expect(early.playoffHostNoticesSent).toBe(3);
    expect(await notificationIds(c)).toContain(`playoff-host-overdue-waiting-${second.tieId}-${LADDER}-${c}`);

    const late = await runProcessLadderPhases(new Date(start.getTime() + 10 * DAY_MS + 1000));
    expect(late.playoffTiesSettled).toContain(`${LADDER}/${third.tieId}`);
    expect(await readTie(third.tieId)).toMatchObject({ winner: "team1", outcome: LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER });
    expect((await readTie(second.tieId)).outcome).toBe(LADDER_PLAYOFF_TIE_OUTCOME.VOID);
    expect(a).toBeTruthy();
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

describe("autoAcceptDueLadderPlayoffMatches", () => {
  const postedLeg = async (
    tie: LadderPlayoffTie,
    leg: 1 | 2,
    createdAt: Date,
    extra: Record<string, unknown> = {},
  ) => {
    const [a, b] = sidesOf(tie);
    const matchId = `${tie.tieId}-leg${leg}`;
    await db.doc(`ladders/${LADDER}/ladderMatches/${matchId}`).set({
      ladderMatchId: matchId,
      playoffTieId: tie.tieId,
      playoffLeg: leg,
      ladderType: LADDER_TYPE.SINGLES,
      matchStatus: LADDER_MATCH_STATUS.POSTED,
      participants: [a, b],
      createdBy: a,
      createdAt,
      bestOf: 7,
      court,
      matchDate: "05-10-2026",
      matchTime: { start: "18:30" },
      games: [],
      scheduleDeclines: 1,
      ...extra,
    });
    return matchId;
  };
  const readMatch = async (matchId: string) =>
    (await db.doc(`ladders/${LADDER}/ladderMatches/${matchId}`).get()).data();
  const now = new Date(start.getTime() + 2 * DAY_MS);

  it("accepts a match the away side hasn't answered in 24 hours and tells both sides", async () => {
    const ties = await seedBracket(4);
    const tie = ties[0];
    const [a, b] = sidesOf(tie);
    await seedUsers([a, b]);
    const matchId = await postedLeg(tie, 1, new Date(now.getTime() - (LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS + 1) * 60 * 60 * 1000));

    expect(await autoAcceptDueLadderPlayoffMatches({ db, ladder, now })).toEqual([matchId]);
    expect(await readMatch(matchId)).toMatchObject({
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      acceptedBy: b,
      autoAccepted: true,
      scheduleDeclines: 1,
    });
    const away = await db.doc(`users/${b}/notifications/playoff-auto-accepted-${matchId}-${LADDER}-${b}`).get();
    expect(away.data()).toMatchObject({
      title: "Playoff match accepted",
      message: `You didn't reply within ${LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS} hours, so playoff match 1 at Court One, 5 Oct, 18:30 has been accepted for you.`,
    });
    const host = await db.doc(`users/${a}/notifications/playoff-auto-accept-host-${matchId}-${LADDER}-${a}`).get();
    expect(host.data()?.message).toBe(
      `Your opponent didn't reply within ${LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS} hours, so playoff match 1 at Court One, 5 Oct, 18:30 has been accepted for them.`,
    );
    expect(await autoAcceptDueLadderPlayoffMatches({ db, ladder, now })).toEqual([]);
  });

  it("leaves a match alone until 24 hours have passed", async () => {
    const ties = await seedBracket(4);
    const matchId = await postedLeg(ties[0], 1, new Date(now.getTime() - (LADDER_PLAYOFF_MATCH_AUTO_ACCEPT_HOURS - 1) * 60 * 60 * 1000));
    expect(await autoAcceptDueLadderPlayoffMatches({ db, ladder, now })).toEqual([]);
    expect((await readMatch(matchId))?.matchStatus).toBe(LADDER_MATCH_STATUS.POSTED);
  });

  it("never accepts a play-now offer for anyone", async () => {
    const ties = await seedBracket(4);
    const matchId = await postedLeg(ties[0], 2, new Date(now.getTime() - 48 * 60 * 60 * 1000), {
      playNow: true,
    });
    expect(await autoAcceptDueLadderPlayoffMatches({ db, ladder, now })).toEqual([]);
    expect((await readMatch(matchId))?.matchStatus).toBe(LADDER_MATCH_STATUS.POSTED);
  });

  it("ignores posted matches that aren't playoff matches and ties that are over", async () => {
    const ties = await seedBracket(4);
    const [a, b] = sidesOf(ties[0]);
    const old = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    await db.doc(`ladders/${LADDER}/ladderMatches/regular`).set({
      ladderMatchId: "regular",
      matchStatus: LADDER_MATCH_STATUS.POSTED,
      participants: [a, b],
      createdBy: a,
      createdAt: old,
    });
    const matchId = await postedLeg(ties[0], 1, old);
    await db.doc(tiePath(ties[0].tieId)).update({ status: LADDER_PLAYOFF_TIE_STATUS.COMPLETED });
    expect(await autoAcceptDueLadderPlayoffMatches({ db, ladder, now })).toEqual([]);
    expect((await readMatch("regular"))?.matchStatus).toBe(LADDER_MATCH_STATUS.POSTED);
    expect((await readMatch(matchId))?.matchStatus).toBe(LADDER_MATCH_STATUS.POSTED);
  });
});

describe("doubles ties", () => {
  const doublesEntrant = (key: string): LadderPlayoffEntrant => ({
    entrantKey: `team-${key}`,
    teamId: `t-${key}`,
    players: [key, `${key}2`].map((userId) => ({
      userId,
      firstName: userId,
      lastName: "",
      username: userId,
    })),
    competitionXP: 0,
    numberOfWins: 0,
    totalPointDifference: 0,
    globalXp: 0,
    joinedAt: null,
    homeCourt: null,
  });

  const seedDoublesBracket = async (size = 4) => {
    await db.doc(`ladders/${LADDER}`).set({
      ...ladder,
      status: LADDER_STATUS.PLAYOFFS,
      ladderType: LADDER_TYPE.DOUBLES,
    });
    const ties = buildLadderPlayoffTies({
      ladderId: LADDER,
      qualifiers: Array.from({ length: size }, (_, i) => doublesEntrant(`p${i}`)),
      createdAt: start,
    });
    const writer = db.bulkWriter();
    ties.forEach((tie) => {
      void writer.set(db.doc(tiePath(tie.tieId)), { ...tie });
    });
    await writer.close();
    return ties;
  };

  const pairs = (tie: LadderPlayoffTie) => [
    tie.side1?.playerIds as string[],
    tie.side2?.playerIds as string[],
  ];

  const doublesGame = (matchId: string, n: number, winner: string[], loser: string[]) => ({
    ...approvedGame(matchId, n, winner[0], loser[0]),
    team1: { player1: { userId: winner[0] }, player2: { userId: winner[1] }, score: 21 },
    team2: { player1: { userId: loser[0] }, player2: { userId: loser[1] }, score: 15 },
    result: {
      winner: { team: "Team 1", players: winner, score: 21 },
      loser: { team: "Team 2", players: loser, score: 15 },
    },
  });

  const seedDoublesLeg = async (
    tie: LadderPlayoffTie,
    leg: 1 | 2 | 3,
    winners: (0 | 1)[],
    status: string = LADDER_MATCH_STATUS.COMPLETED,
    extra: Record<string, unknown> = {},
  ) => {
    const [first, second] = pairs(tie);
    const matchId = `${tie.tieId}-leg${leg}`;
    const everyone = [...first, ...second];
    await db.doc(`ladders/${LADDER}/ladderMatches/${matchId}`).set({
      ladderMatchId: matchId,
      playoffTieId: tie.tieId,
      playoffLeg: leg,
      ladderType: LADDER_TYPE.DOUBLES,
      matchStatus: status,
      participants: everyone,
      teams: [
        { teamId: tie.side1?.teamId, teamKey: tie.side1?.entrantKey, playerIds: first },
        { teamId: tie.side2?.teamId, teamKey: tie.side2?.entrantKey, playerIds: second },
      ],
      bestOf: winners.length,
      court,
      matchDate: "05-10-2026",
      matchTime: { start: "18:00" },
      currencyType: "GBP",
      shuttleType: "Feather",
      courtFee: 0,
      checkIn: { checkedInBy: everyone, checkedInAt: {}, completed: true, completedAt: start },
      games: winners.map((winner, i) =>
        doublesGame(matchId, i + 1, winner === 0 ? first : second, winner === 0 ? second : first),
      ),
      ...extra,
    });
  };

  it("settles on games across both matches and tells all four players", async () => {
    const ties = await seedDoublesBracket(4);
    const [semiOne] = ties.filter((t) => t.round === 1);
    const [first, second] = pairs(semiOne);
    await seedUsers([...first, ...second]);
    await seedDoublesLeg(semiOne, 1, [0, 0, 1]);
    await seedDoublesLeg(semiOne, 2, [1, 0, 0]);

    const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: semiOne.tieId, now: start });
    if (!resolution) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder, resolution });

    expect(await readTie(semiOne.tieId)).toMatchObject({ winner: "team1", outcome: LADDER_PLAYOFF_TIE_OUTCOME.PLAYED });
    for (const id of first) {
      expect(await notificationIds(id)).toContain(`playoff-through-r2-s0-${LADDER}-${id}`);
    }
    for (const id of second) {
      expect(await notificationIds(id)).toContain(`playoff-through-r2-s1-${LADDER}-${id}`);
    }
  });

  it("creates a decider for all four players with both teams and the carried check-in", async () => {
    const ties = await seedDoublesBracket(4);
    const tie = ties[0];
    const [first, second] = pairs(tie);
    await seedUsers([...first, ...second]);
    await seedDoublesLeg(tie, 1, [0, 0, 0]);
    await seedDoublesLeg(tie, 2, [1, 1, 1]);

    const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: tie.tieId, now: start });
    expect(resolution?.deciderCreated).toBe(true);
    if (resolution) await notifyLadderPlayoffResolution({ ladder, resolution });

    const [decider] = (
      await db.collection(`ladders/${LADDER}/ladderMatches`).where("playoffLeg", "==", 3).get()
    ).docs.map((d) => d.data());
    const hostIsFirst = getLadderPlayoffLegHost(tie, 3) === "team1";
    const [hostIds, awayIds] = hostIsFirst ? [first, second] : [second, first];
    expect(decider).toMatchObject({
      ladderType: LADDER_TYPE.DOUBLES,
      bestOf: 1,
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      participants: [...hostIds, ...awayIds],
      createdBy: hostIds[0],
      acceptedBy: awayIds[0],
      checkIn: { completed: true },
    });
    expect(decider.teams.map((team: { playerIds: string[] }) => team.playerIds)).toEqual([hostIds, awayIds]);
    for (const id of [...first, ...second]) {
      expect(await notificationIds(id)).toContain(`playoff-decider-${tie.tieId}-${LADDER}-${id}`);
    }
  });

  it("places both players of each finalist and completes the ladder", async () => {
    const ties = await seedDoublesBracket(4);
    const [semiOne, semiTwo] = ties.filter((t) => t.round === 1);
    const everyone = ties.filter((t) => t.round === 1).flatMap(pairs).flat();
    await seedUsers(everyone);
    for (const semi of [semiOne, semiTwo]) {
      const [winner] = pairs(semi);
      void winner;
      await seedDoublesLeg(semi, 1, [0, 0, 1]);
      await seedDoublesLeg(semi, 2, [0, 0, 0]);
      const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: semi.tieId, now: start });
      if (!resolution) throw new Error("expected a resolution");
      await notifyLadderPlayoffResolution({ ladder, resolution });
    }
    const final = await readTie("r2-s0");
    const third = await readTie("r2-s1");
    await seedDoublesLeg(final, 1, [0, 0, 1]);
    await seedDoublesLeg(final, 2, [0, 0, 0]);
    await seedDoublesLeg(third, 1, [0, 0, 1]);
    await seedDoublesLeg(third, 2, [0, 0, 0]);
    for (const tie of [final, third]) {
      const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: tie.tieId, now: start });
      if (!resolution) throw new Error("expected a resolution");
      await notifyLadderPlayoffResolution({ ladder, resolution });
      await completeLadderPlayoffsIfFinished({ db, ladderId: LADDER, resolution, now: start });
    }
    for (const tie of [final, third]) {
      for (const id of pairs(tie).flat()) {
        expect(await notificationIds(id)).toContain(`playoff-finish-${tie.tieId}-${LADDER}-${id}`);
      }
    }
    expect((await db.doc(`ladders/${LADDER}`).get()).data()?.status).toBe(LADDER_STATUS.COMPLETED);
  });

  it("splits every placed pair's prize equally between both players", async () => {
    const freeLadder = { ...ladder, entryFee: 0, maxPlayers: 128, playoffEntrantCount: 128 };
    const ties = await seedDoublesBracket(8);
    await db.doc(`ladders/${LADDER}`).update({ entryFee: 0, maxPlayers: 128, playoffEntrantCount: 128, playoffBracketSize: 8, prizesDistributed: false });
    await seedProfiles(ties.filter((t) => t.round === 1).flatMap(pairs).flat());
    const settle = async (tieId: string) => {
      const tie = await readTie(tieId);
      await seedDoublesLeg(tie, 1, [0, 0, 1]);
      await seedDoublesLeg(tie, 2, [0, 0, 0]);
      const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId, now: start });
      if (!resolution) throw new Error("expected a resolution");
      await notifyLadderPlayoffResolution({ ladder: freeLadder, resolution });
      await completeLadderPlayoffsIfFinished({ db, ladderId: LADDER, resolution, now: start });
    };
    const quarterLosers: string[][] = [];
    for (const slot of [0, 1, 2, 3]) {
      quarterLosers.push((await readTie(`r1-s${slot}`)).side2?.playerIds as string[]);
      await settle(`r1-s${slot}`);
    }
    await settle("r2-s0");
    await settle("r2-s1");
    const thirdId = (await db.collection(`ladders/${LADDER}/playoffTies`).where("isThirdPlacePlayoff", "==", true).get()).docs[0].id;
    await settle(thirdId);
    await settle("r3-s0");

    const final = await readTie("r3-s0");
    const third = await readTie(thirdId);
    const placed: [string[], number, string][] = [
      [final.side1?.playerIds as string[], 1, "r3-s0"],
      [final.side2?.playerIds as string[], 2, "r3-s0"],
      [third.side1?.playerIds as string[], 3, thirdId],
      [third.side2?.playerIds as string[], 4, thirdId],
    ];
    for (const [playerIds, place, tieId] of placed) {
      const { cp } = getLadderPlacePrize(freeLadder, place);
      expect(playerIds).toHaveLength(2);
      for (const userId of playerIds) {
        expect(await xpGained(userId)).toBe(cp / 2);
        expect((await profileOf(userId)).ladderStats[PLACE_KEYS[place - 1]]).toBe(1);
        const notice = await db.doc(`users/${userId}/notifications/playoff-finish-${tieId}-${LADDER}-${userId}`).get();
        expect(notice.data()?.message).toContain(`awarded ${cp.toLocaleString("en-GB")} CP for your team (${(cp / 2).toLocaleString("en-GB")} CP each)`);
        expect((await db.doc(`ladders/${LADDER}/prizePayouts/${tieId}-${userId}`).get()).data()).toMatchObject({
          status: "paid",
          sidePlayerIds: playerIds,
          prize: { cash: 0, cp: cp / 2 },
          paid: { cash: 0, cp: cp / 2 },
        });
      }
    }
    for (const userId of quarterLosers.flat()) {
      expect(await xpGained(userId)).toBe(getLadderPlacePrize(freeLadder, 8).cp / 2);
    }
    expect((await db.doc(`ladders/${LADDER}`).get()).data()?.unclaimedPrizePot).toEqual({ cash: 0, cp: 0 });
  });

  it("auto-accepts for the away team and tells both pairs", async () => {
    const ties = await seedDoublesBracket(4);
    const tie = ties[0];
    const [first, second] = pairs(tie);
    await seedUsers([...first, ...second]);
    await seedDoublesLeg(tie, 1, [], LADDER_MATCH_STATUS.POSTED, {
      createdBy: first[1],
      createdAt: new Date(start.getTime() - 30 * 60 * 60 * 1000),
      games: [],
    });
    const accepted = await autoAcceptDueLadderPlayoffMatches({ db, ladder, now: start });
    expect(accepted).toEqual([`${tie.tieId}-leg1`]);
    expect(
      (await db.doc(`ladders/${LADDER}/ladderMatches/${tie.tieId}-leg1`).get()).data(),
    ).toMatchObject({ matchStatus: LADDER_MATCH_STATUS.ACCEPTED, acceptedBy: second[0], autoAccepted: true });
    for (const id of second) {
      expect(await notificationIds(id)).toContain(`playoff-auto-accepted-${tie.tieId}-leg1-${LADDER}-${id}`);
    }
    for (const id of first) {
      expect(await notificationIds(id)).toContain(`playoff-auto-accept-host-${tie.tieId}-leg1-${LADDER}-${id}`);
    }
  });

  it("gives the tie to the pair whose partner was the only one who arranged anything", async () => {
    const ties = await seedDoublesBracket(8);
    const [tie] = ties.filter((t) => t.round === 1);
    const [first, second] = pairs(tie);
    await seedUsers([...first, ...second]);
    await seedDoublesLeg(tie, 2, [], LADDER_MATCH_STATUS.POSTED, { createdBy: first[1], games: [] });
    const resolution = await resolveLadderPlayoffTie({
      db, ladderId: LADDER, tieId: tie.tieId, now: new Date(start.getTime() + 10 * DAY_MS + 1000), atDeadline: true,
    });
    if (!resolution) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder, resolution });
    expect(await readTie(tie.tieId)).toMatchObject({ winner: "team1", outcome: LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER });
    for (const id of second) {
      expect(await notificationIds(id)).toContain(`playoff-out-${tie.tieId}-${LADDER}-${id}`);
    }
    for (const id of first) {
      expect(await notificationIds(id)).toContain(`playoff-through-r2-s0-${LADDER}-${id}`);
    }
  });
});

describe("prize payouts", () => {
  const freeLadder = {
    ...ladder,
    entryFee: 0,
    participantCount: 128,
    maxPlayers: 128,
    playoffEntrantCount: 128,
  };

  const seedFreeBracket = async () => {
    const ties = await seedBracket(8);
    await db.doc(`ladders/${LADDER}`).update({
      entryFee: 0,
      maxPlayers: 128,
      playoffEntrantCount: 128,
      playoffBracketSize: 8,
      prizesDistributed: false,
    });
    await seedProfiles(ties.filter((t) => t.round === 1).flatMap(sidesOf));
    return ties;
  };

  const play = async (tieId: string, now = start) => {
    const tie = await readTie(tieId);
    const [user, opponent] = sidesOf(tie);
    await seedLeg(tie, 1, [user, user, opponent]);
    await seedLeg(tie, 2, [user, user, user]);
    const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId, now });
    if (!resolution) throw new Error("expected a resolution");
    await notifyLadderPlayoffResolution({ ladder: freeLadder, resolution });
    await completeLadderPlayoffsIfFinished({ db, ladderId: LADDER, resolution, now });
    return { winner: user, loser: opponent };
  };

  const thirdPlaceId = async () =>
    (await db.collection(`ladders/${LADDER}/playoffTies`).where("isThirdPlacePlayoff", "==", true).get()).docs[0].id;

  const playThroughSemis = async () => {
    const quarterLosers: string[] = [];
    for (const slot of [0, 1, 2, 3]) quarterLosers.push((await play(`r1-s${slot}`)).loser);
    await play("r2-s0");
    await play("r2-s1");
    return quarterLosers;
  };

  const ladderDoc = async () => (await db.doc(`ladders/${LADDER}`).get()).data();

  it("pays every placed player the CP their placing notification quoted, once", async () => {
    await seedFreeBracket();
    const quarterLosers = await playThroughSemis();
    const third = await play(await thirdPlaceId());
    expect((await ladderDoc())?.prizesDistributed).toBe(false);
    const final = await play("r3-s0");

    const placed: [string, number][] = [
      [final.winner, 1],
      [final.loser, 2],
      [third.winner, 3],
      [third.loser, 4],
      ...quarterLosers.map((userId): [string, number] => [userId, 8]),
    ];
    for (const [userId, place] of placed) {
      const { cp } = getLadderPlacePrize(freeLadder, place);
      expect(await xpGained(userId)).toBe(cp);
      const stats = (await profileOf(userId)).ladderStats ?? {};
      PLACE_KEYS.forEach((key, index) =>
        expect(stats[key] ?? 0).toBe(index === place - 1 ? 1 : 0),
      );
    }
    expect(await xpGained(final.winner)).toBe(2240);
    expect(await xpGained(quarterLosers[0])).toBe(400);
    expect((await profileOf(final.winner)).tournamentStats).toEqual({ first: 0, second: 1, third: 0, fourth: 0 });
    expect((await profileOf(final.winner)).cashWon).toBeUndefined();

    const champion = await db.doc(`users/${final.winner}/notifications/playoff-finish-r3-s0-${LADDER}-${final.winner}`).get();
    expect(champion.data()?.message).toBe("Congratulations, you have placed 1st in Test Ladder and been awarded 2,240 CP.");
    const fourth = await db.doc(`users/${third.loser}/notifications/playoff-finish-${await thirdPlaceId()}-${LADDER}-${third.loser}`).get();
    expect(fourth.data()?.message).toBe("Congratulations, you have placed 4th in Test Ladder and been awarded 512 CP, paid when the playoffs finish.");

    expect(await ladderDoc()).toMatchObject({
      status: LADDER_STATUS.COMPLETED,
      prizesDistributed: true,
      playoffsCompletedAt: admin.firestore.Timestamp.fromDate(start),
    });
    expect((await ladderDoc())?.prizeDistributionDate).toBeInstanceOf(admin.firestore.Timestamp);

    const paidOnce = await Promise.all(placed.map(([userId]) => xpGained(userId)));
    expect(await completeAndPayLadder({ db, ladderId: LADDER, now: start })).toEqual({ completed: false, paid: false, payouts: [] });
    const rerun = await runProcessLadderPhases(new Date(start.getTime() + DAY_MS));
    expect(rerun.laddersPaid).toEqual([]);
    expect(await Promise.all(placed.map(([userId]) => xpGained(userId)))).toEqual(paidOnce);
  });

  it("pays nothing when a write fails half way, then pays once on the next run", async () => {
    await seedFreeBracket();
    const quarterLosers = await playThroughSemis();
    await play(await thirdPlaceId());
    const real = prizeAwards.buildPrizeAwardUpdate;
    let calls = 0;
    const spy = jest.spyOn(prizeAwards, "buildPrizeAwardUpdate").mockImplementation((args: Parameters<typeof real>[0]) => {
      calls += 1;
      if (calls === 5) throw new Error("write failed");
      return real(args);
    });
    const final = await readTie("r3-s0");
    const [user, opponent] = sidesOf(final);
    await seedLeg(final, 1, [user, user, opponent]);
    await seedLeg(final, 2, [user, user, user]);
    const resolution = await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: "r3-s0", now: start });
    if (!resolution) throw new Error("expected a resolution");
    await expect(completeLadderPlayoffsIfFinished({ db, ladderId: LADDER, resolution, now: start })).rejects.toThrow("write failed");
    spy.mockRestore();

    for (const userId of [user, opponent, ...quarterLosers]) expect(await xpGained(userId)).toBe(0);
    expect(await ladderDoc()).toMatchObject({ status: LADDER_STATUS.PLAYOFFS, prizesDistributed: false });

    const retry = await runProcessLadderPhases(new Date(start.getTime() + DAY_MS));
    expect(retry.laddersPaid).toEqual([LADDER]);
    expect(await xpGained(user)).toBe(getLadderPlacePrize(freeLadder, 1).cp);
    expect(await xpGained(quarterLosers[2])).toBe(getLadderPlacePrize(freeLadder, 8).cp);
    expect(await ladderDoc()).toMatchObject({ status: LADDER_STATUS.COMPLETED, prizesDistributed: true });

    await runProcessLadderPhases(new Date(start.getTime() + 2 * DAY_MS));
    expect(await xpGained(user)).toBe(getLadderPlacePrize(freeLadder, 1).cp);
  });

  it("pays a ladder that was completed before payouts existed", async () => {
    await seedFreeBracket();
    await playThroughSemis();
    await play(await thirdPlaceId());
    const spy = jest.spyOn(prizeAwards, "buildPrizeAwardUpdate").mockImplementation(() => {
      throw new Error("write failed");
    });
    const final = await readTie("r3-s0");
    const [user, opponent] = sidesOf(final);
    await seedLeg(final, 1, [user, user, opponent]);
    await seedLeg(final, 2, [user, user, user]);
    await resolveLadderPlayoffTie({ db, ladderId: LADDER, tieId: "r3-s0", now: start });
    spy.mockRestore();
    await db.doc(`ladders/${LADDER}`).update({ status: LADDER_STATUS.COMPLETED, playoffsCompletedAt: start });

    const run = await runProcessLadderPhases(new Date(start.getTime() + DAY_MS));
    expect(run.laddersPaid).toEqual([LADDER]);
    expect(await xpGained(user)).toBe(getLadderPlacePrize(freeLadder, 1).cp);
    expect(await xpGained(opponent)).toBe(getLadderPlacePrize(freeLadder, 2).cp);
    expect((await ladderDoc())?.playoffsCompletedAt).toEqual(admin.firestore.Timestamp.fromDate(start));
  });

  it("holds a disqualified finalist's prize for review, then carries out the admin's decision once", async () => {
    await seedFreeBracket();
    await playThroughSemis();
    await play(await thirdPlaceId());
    const final = await readTie("r3-s0");
    const [user, opponent] = sidesOf(final);
    await db.doc(`ladders/${LADDER}/reportCounts/${opponent}`).set({ userId: opponent, strikes: { cheating: 3 } });

    await settleDisqualifiedLadderPlayoffTies({ db, ladder: freeLadder, ties: [final], now: start });

    expect(await xpGained(user)).toBe(getLadderPlacePrize(freeLadder, 1).cp);
    expect(await xpGained(opponent)).toBe(0);
    expect((await profileOf(opponent)).ladderStats?.second ?? 0).toBe(0);
    const out = await db.doc(`users/${opponent}/notifications/playoff-out-r3-s0-${LADDER}-${opponent}`).get();
    expect(out.data()?.message).toBe("You've been knocked out in the Final of Test Ladder because you've been disqualified from the ladder.");
    expect(await notificationIds(opponent)).not.toContain(`playoff-finish-r3-s0-${LADDER}-${opponent}`);
    const payoutPath = `ladders/${LADDER}/prizePayouts/r3-s0-${opponent}`;
    expect((await db.doc(payoutPath).get()).data()).toMatchObject({
      status: "held",
      place: 2,
      prize: { cash: 0, cp: 1280 },
      paid: { cash: 0, cp: 0 },
      reason: "Disqualified: 3 cheating offences",
    });
    const held = await db.doc(`users/${opponent}/notifications/playoff-prize-${LADDER}-${opponent}`).get();
    expect(held.data()).toMatchObject({
      title: "Your prize is under review",
      message: "Your prize for 2nd place in Test Ladder (1,280 CP) is under review because you were disqualified from the ladder. We'll let you know the outcome.",
    });
    expect(await ladderDoc()).toMatchObject({ status: LADDER_STATUS.COMPLETED, prizesDistributed: true });

    await db.doc(payoutPath).update({
      review: { decision: "payPart", amount: { cash: 0, cp: 640 }, reason: "Disqualified after the Final was arranged", decidedBy: "admin", decidedAt: start },
    });
    const applied = await applyLadderPrizeReview({ db, ladderId: LADDER, payoutId: `r3-s0-${opponent}`, now: start });
    expect(applied).toMatchObject({ status: "partPaid", paid: { cash: 0, cp: 640 } });
    expect(await xpGained(opponent)).toBe(640);
    expect((await profileOf(opponent)).ladderStats.second).toBe(1);
    const outcome = await db.doc(`users/${opponent}/notifications/playoff-prize-review-${LADDER}-${opponent}`).get();
    expect(outcome.data()?.message).toBe(
      "After review, you've been paid 640 CP of your 1,280 CP prize for 2nd place in Test Ladder. Reason: Disqualified after the Final was arranged",
    );
    expect(await applyLadderPrizeReview({ db, ladderId: LADDER, payoutId: `r3-s0-${opponent}`, now: start })).toBeNull();
    expect(await xpGained(opponent)).toBe(640);
  });

  it("withholds a held prize when the admin decides not to pay", async () => {
    await seedFreeBracket();
    const quarterLosers = await playThroughSemis();
    await db.doc(`ladders/${LADDER}/reportCounts/${quarterLosers[1]}`).set({ userId: quarterLosers[1], strikes: { abuse: 3 } });
    await play(await thirdPlaceId());
    await play("r3-s0");
    const payoutId = `r1-s1-${quarterLosers[1]}`;
    expect((await db.doc(`ladders/${LADDER}/prizePayouts/${payoutId}`).get()).data()?.status).toBe("held");
    await db.doc(`ladders/${LADDER}/prizePayouts/${payoutId}`).update({
      review: { decision: "withhold", reason: "Abuse towards an opponent", decidedBy: "admin", decidedAt: start },
    });
    expect(await applyLadderPrizeReview({ db, ladderId: LADDER, payoutId, now: start })).toMatchObject({ status: "withheld", paid: { cash: 0, cp: 0 } });
    expect(await xpGained(quarterLosers[1])).toBe(0);
    const outcome = await db.doc(`users/${quarterLosers[1]}/notifications/playoff-prize-review-${LADDER}-${quarterLosers[1]}`).get();
    expect(outcome.data()?.message).toBe("After review, your 400 CP prize for 8th place in Test Ladder won't be paid. Reason: Abuse towards an opponent");
  });

  it("pays an earlier-round loser disqualified later in the playoffs nothing", async () => {
    await seedFreeBracket();
    const quarterLosers = await playThroughSemis();
    await db.doc(`ladders/${LADDER}/reportCounts/${quarterLosers[1]}`).set({ userId: quarterLosers[1], strikes: { cheating: 3 } });
    await play(await thirdPlaceId());
    await play("r3-s0");
    expect(await xpGained(quarterLosers[1])).toBe(0);
    expect(await xpGained(quarterLosers[0])).toBe(getLadderPlacePrize(freeLadder, 8).cp);
  });

  it("pays both sides of a void Final joint 2nd and shares the 1st prize equally with everyone else", async () => {
    await seedFreeBracket();
    const quarterLosers = await playThroughSemis();
    const third = await play(await thirdPlaceId());
    const final = await readTie("r3-s0");
    const [user, opponent] = sidesOf(final);

    const deadline = new Date((final.deadlineAt as Date).getTime() + 1000);
    const run = await runProcessLadderPhases(deadline);
    expect(run.laddersPaid).toEqual([LADDER]);
    expect((await readTie("r3-s0")).outcome).toBe(LADDER_PLAYOFF_TIE_OUTCOME.VOID);
    const second = getLadderPlacePrize(freeLadder, 2).cp;
    const share = (getLadderPlacePrize(freeLadder, 1).cp - second) / 6;
    expect(share).toBe(160);
    expect(await xpGained(user)).toBe(second);
    expect(await xpGained(opponent)).toBe(second);
    expect((await profileOf(user)).ladderStats.second).toBe(1);
    expect(await xpGained(third.winner)).toBe(getLadderPlacePrize(freeLadder, 3).cp + share);
    expect(await xpGained(quarterLosers[3])).toBe(getLadderPlacePrize(freeLadder, 8).cp + share);
    expect(await ladderDoc()).toMatchObject({
      status: LADDER_STATUS.COMPLETED,
      prizesDistributed: true,
      unclaimedPrizePot: { cash: 0, cp: 960 },
      retainedPrizeMoney: { cash: 0, cp: 0 },
    });
    const voided = await db.doc(`users/${user}/notifications/playoff-prize-${LADDER}-${user}`).get();
    expect(voided.data()?.message).toBe("Your Final in Test Ladder wasn't played, so you finish joint 2nd and have been awarded 1,280 CP.");
    const extra = await db.doc(`users/${third.winner}/notifications/playoff-prize-${LADDER}-${third.winner}`).get();
    expect(extra.data()).toMatchObject({
      title: "Extra prize money",
      message: "You've been awarded 160 CP from Test Ladder's Unclaimed Prize Pot: prize money from playoff ties that weren't played.",
    });
  });

  it("pays only the places a short bracket fills, and skips a deleted profile", async () => {
    const ties = await seedFreeBracket();
    const [voidUser, voidOpponent] = sidesOf(ties.find((t) => t.tieId === "r1-s0") as LadderPlayoffTie);
    const quarterLosers = [];
    for (const slot of [1, 2, 3]) quarterLosers.push((await play(`r1-s${slot}`)).loser);
    await db.doc(`users/${quarterLosers[0]}`).delete();
    const semi = await play("r2-s1");

    const deadline = new Date(start.getTime() + LADDER_PLAYOFF_TIE_DAYS * DAY_MS + 1000);
    await runProcessLadderPhases(deadline);
    expect((await readTie("r1-s0")).outcome).toBe(LADDER_PLAYOFF_TIE_OUTCOME.VOID);
    expect((await readTie(await thirdPlaceId())).outcome).toBe(LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER);
    const final = await play("r3-s0", deadline);

    const share = 18;
    expect(await xpGained(final.winner)).toBe(getLadderPlacePrize(freeLadder, 1).cp + share + 4);
    expect(await xpGained(final.loser)).toBe(getLadderPlacePrize(freeLadder, 2).cp + share);
    expect(await xpGained(semi.loser)).toBe(getLadderPlacePrize(freeLadder, 3).cp + share);
    expect(await xpGained(voidUser)).toBe(getLadderPlacePrize(freeLadder, 8).cp);
    expect(await xpGained(voidOpponent)).toBe(getLadderPlacePrize(freeLadder, 8).cp);
    expect((await db.doc(`users/${quarterLosers[0]}`).get()).exists).toBe(false);
    expect((await db.doc(`ladders/${LADDER}/prizePayouts/r1-s1-${quarterLosers[0]}`).get()).data()).toMatchObject({
      status: "kept",
      reason: "Account deleted before payout",
      paid: { cash: 0, cp: 0 },
    });
    expect(await xpGained(quarterLosers[1])).toBe(getLadderPlacePrize(freeLadder, 8).cp + share);
    expect(await ladderDoc()).toMatchObject({
      status: LADDER_STATUS.COMPLETED,
      prizesDistributed: true,
      unclaimedPrizePot: { cash: 0, cp: 112 },
    });
  });
});
