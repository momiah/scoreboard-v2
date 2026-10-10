import {
  DISPUTE_STAGE,
  LADDER_CANCELLED_REASON,
  LADDER_MATCH_STATUS,
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
  TEAM_STATUS,
} from "courtchamps-shared/types";

type Data = Record<string, unknown>;

const store = new Map<string, Data>();

const snapshot = (path: string) => {
  const data = store.get(path);
  return {
    id: path.split("/").pop() as string,
    ref: docRef(path),
    exists: data !== undefined,
    data: () => (data === undefined ? undefined : { ...data }),
  };
};

const childPaths = (collectionPath: string): string[] =>
  [...store.keys()].filter(
    (path) =>
      path.startsWith(`${collectionPath}/`) &&
      !path.slice(collectionPath.length + 1).includes("/"),
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docRef(path: string): any {
  return {
    path,
    id: path.split("/").pop(),
    collection: (name: string) => collectionRef(`${path}/${name}`),
    get: async () => snapshot(path),
    update: async (data: Data) => {
      store.set(path, { ...(store.get(path) ?? {}), ...data });
      writeLog.push({ op: "update", path });
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function collectionRef(path: string): any {
  const docs = () => childPaths(path).map(snapshot);
  return {
    path,
    doc: (id: string) => docRef(`${path}/${id}`),
    get: async () => ({ docs: docs() }),
    count: () => ({
      get: async () => ({ data: () => ({ count: docs().length }) }),
    }),
    where: (field: string, op: string, values: unknown[]) => {
      if (op !== "in") throw new Error(`unsupported op ${op}`);
      return {
        get: async () => ({
          docs: docs().filter((doc) =>
            values.includes((doc.data() as Data)[field]),
          ),
        }),
      };
    },
  };
}

const writeLog: { op: string; path: string }[] = [];

const db = {
  collection: (name: string) => collectionRef(name),
  getAll: async (...refs: { path: string }[]) =>
    refs.map((ref) => snapshot(ref.path)),
  runTransaction: async <T>(
    fn: (transaction: unknown) => Promise<T>,
  ): Promise<T> => {
    const writes: (() => void)[] = [];
    const transaction = {
      get: async (ref: { path: string }) => snapshot(ref.path),
      create: (ref: { path: string }, data: Data) => {
        writes.push(() => {
          if (store.has(ref.path)) {
            throw new Error(`ALREADY_EXISTS: ${ref.path}`);
          }
          store.set(ref.path, data);
          writeLog.push({ op: "create", path: ref.path });
        });
      },
      update: (ref: { path: string }, data: Data) => {
        writes.push(() => {
          store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...data });
          writeLog.push({ op: "update", path: ref.path });
        });
      },
    };
    const result = await fn(transaction);
    const snapshotBefore = new Map(store);
    const logLength = writeLog.length;
    try {
      writes.forEach((write) => write());
    } catch (error) {
      store.clear();
      snapshotBefore.forEach((value, key) => store.set(key, value));
      writeLog.length = logLength;
      throw error;
    }
    return result;
  },
};

jest.mock("firebase-admin", () => ({ firestore: () => db }));

const mockSendNotification = jest.fn();
jest.mock("./helpers/sendNotification", () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}));

const mockRefund = jest.fn();
jest.mock("./helpers/refundLadderEntryFees", () => ({
  refundLadderEntryFees: (...args: unknown[]) => mockRefund(...args),
}));

import { runProcessLadderPhases } from "./processLadderPhases";

const now = new Date("2026-10-06T12:00:00Z");
const daysFromNow = (days: number) =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const CITIES: Record<string, [number, number]> = {
  london: [51.5074, -0.1278],
  croydon: [51.3762, -0.0982],
  manchester: [53.4808, -2.2426],
  salford: [53.4875, -2.2901],
  birmingham: [52.4862, -1.8904],
  coventry: [52.4068, -1.5197],
  leeds: [53.8008, -1.5491],
  bradford: [53.796, -1.7594],
};

const homeCourt = (city: string) => ({
  courtId: `court-${city}`,
  courtName: city,
  location: {
    city,
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "",
    address: "",
    latitude: CITIES[city][0],
    longitude: CITIES[city][1],
  },
});

const seedLadder = (ladderId: string, overrides: Data = {}) => {
  store.set(`ladders/${ladderId}`, {
    name: ladderId,
    ladderType: LADDER_TYPE.SINGLES,
    status: LADDER_STATUS.REGISTRATION_CLOSED,
    registrationClosesAt: daysFromNow(-30),
    playoffStartsAt: daysFromNow(-1),
    maxPlayers: 2048,
    entryFee: 10,
    currencyType: "GBP",
    ...overrides,
  });
};

const seedUser = (userId: string, xp = 0) => {
  store.set(`users/${userId}`, {
    userId,
    firstName: `First ${userId}`,
    lastName: `Last ${userId}`,
    username: userId,
    profileDetail: { XP: xp },
  });
};

const seedParticipant = (
  ladderId: string,
  userId: string,
  overrides: Data = {},
  xp = 0,
) => {
  seedUser(userId, xp);
  store.set(`ladders/${ladderId}/ladderParticipants/${userId}`, {
    userId,
    competitionXP: 0,
    numberOfWins: 0,
    totalPointDifference: 0,
    homeCourt: homeCourt("london"),
    ...overrides,
  });
};

const seedParticipants = (
  ladderId: string,
  count: number,
  build: (index: number) => Data = () => ({}),
) => {
  for (let index = 0; index < count; index += 1) {
    seedParticipant(
      ladderId,
      `p${String(index).padStart(4, "0")}`,
      build(index),
    );
  }
};

const ties = (ladderId: string) =>
  childPaths(`ladders/${ladderId}/playoffTies`).map(
    (path) => store.get(path) as Data,
  );

const ladder = (ladderId: string) => store.get(`ladders/${ladderId}`) as Data;

beforeEach(() => {
  store.clear();
  writeLog.length = 0;
  mockRefund.mockReset();
  mockSendNotification.mockReset();
  mockSendNotification.mockResolvedValue(undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("registration close", () => {
  it("cancels a ladder below 128 registrations and refunds it", async () => {
    seedLadder("L1", {
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    seedParticipants("L1", 127);

    const summary = await runProcessLadderPhases(now);

    expect(summary.cancelled).toEqual(["L1"]);
    expect(ladder("L1")).toMatchObject({
      status: LADDER_STATUS.CANCELLED,
      cancelledAt: now,
      cancelledReason: LADDER_CANCELLED_REASON.TOO_FEW_REGISTRATIONS,
    });
    expect(mockRefund).toHaveBeenCalledWith({
      ladder: expect.objectContaining({ ladderId: "L1", entryFee: 10 }),
      entrantCount: 127,
    });
    expect(ties("L1")).toHaveLength(0);
  });

  it("closes registration at 128 or more", async () => {
    seedLadder("L1", {
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    seedParticipants("L1", 128);

    const summary = await runProcessLadderPhases(now);

    expect(summary.registrationClosed).toEqual(["L1"]);
    expect(ladder("L1").status).toBe(LADDER_STATUS.REGISTRATION_CLOSED);
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("counts teams, not players, for doubles", async () => {
    seedLadder("L1", {
      ladderType: LADDER_TYPE.DOUBLES,
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    seedParticipants("L1", 200);
    for (let index = 0; index < 100; index += 1) {
      store.set(`ladders/L1/ladderTeams/t${index}`, {
        teamKey: `t${index}`,
        playerIds: [`a${index}`, `b${index}`],
      });
    }

    await runProcessLadderPhases(now);

    expect(ladder("L1").status).toBe(LADDER_STATUS.CANCELLED);
  });

  it("leaves ladders alone before their dates", async () => {
    seedLadder("L1", {
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(1),
      playoffStartsAt: daysFromNow(30),
    });
    seedParticipants("L1", 10);

    const summary = await runProcessLadderPhases(now);

    expect(summary).toEqual({
      registrationClosed: [],
      cancelled: [],
      playoffsGenerated: [],
      playoffsHeld: [],
    });
    expect(writeLog).toHaveLength(0);
  });
});

describe("playoff generation (singles)", () => {
  const seedRankedLadder = () => {
    seedLadder("L1");
    seedParticipants("L1", 300, (index) => ({
      competitionXP: 1000 - index,
      numberOfWins: index < 250 ? 5 : 0,
      joinedAt: daysFromNow(-60),
    }));
  };

  it("creates a 16-entrant bracket for 300 registrations and starts playoffs", async () => {
    seedRankedLadder();

    const summary = await runProcessLadderPhases(now);

    expect(summary.playoffsGenerated).toEqual(["L1"]);
    expect(ladder("L1")).toMatchObject({
      status: LADDER_STATUS.PLAYOFFS,
      playoffsGeneratedAt: now,
      playoffBracketSize: 16,
      playoffEntrantCount: 300,
    });

    const allTies = ties("L1");
    expect(allTies).toHaveLength(16);
    expect(allTies.map((tie) => tie.tieId as string).sort()).toEqual(
      [
        ...Array.from({ length: 8 }, (_, slot) => `r1-s${slot}`),
        ...Array.from({ length: 4 }, (_, slot) => `r2-s${slot}`),
        "r3-s0",
        "r3-s1",
        "r4-s0",
        "r4-s1",
      ].sort(),
    );
    expect(allTies.filter((tie) => tie.isThirdPlacePlayoff)).toHaveLength(1);
  });

  it("qualifies exactly the top 16 with their ranking positions", async () => {
    seedRankedLadder();

    await runProcessLadderPhases(now);

    const sides = ties("L1")
      .filter((tie) => tie.round === 1)
      .flatMap((tie) => [tie.side1, tie.side2]) as Data[];
    const byRank = [...sides].sort(
      (a, b) => (a.rank as number) - (b.rank as number),
    );
    expect(byRank.map((side) => side.entrantKey)).toEqual(
      Array.from(
        { length: 16 },
        (_, index) => `p${String(index).padStart(4, "0")}`,
      ),
    );
    expect(byRank.map((side) => side.rank)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
  });

  it("fills round 1 with players and leaves later rounds empty", async () => {
    seedRankedLadder();

    await runProcessLadderPhases(now);

    ties("L1").forEach((tie) => {
      if (tie.round === 1) {
        expect(tie.status).toBe(LADDER_PLAYOFF_TIE_STATUS.SCHEDULED);
        const side1 = tie.side1 as Data;
        expect(tie.team1).toEqual({
          player1: {
            userId: side1.entrantKey,
            firstName: `First ${side1.entrantKey}`,
            lastName: `Last ${side1.entrantKey}`,
            username: side1.entrantKey,
          },
          player2: null,
        });
      } else {
        expect(tie).toMatchObject({
          status: LADDER_PLAYOFF_TIE_STATUS.AWAITING_ENTRANTS,
          side1: null,
          side2: null,
          winner: null,
        });
      }
    });
  });

  it("pairs qualifiers by nearest home court", async () => {
    seedLadder("L1", { maxPlayers: 256 });
    const cities = Object.keys(CITIES);
    seedParticipants("L1", 140, (index) => ({
      competitionXP: 1000 - index,
      homeCourt: homeCourt(index < 8 ? cities[index] : "london"),
    }));

    await runProcessLadderPhases(now);

    expect(ladder("L1").playoffBracketSize).toBe(8);
    const pairs = ties("L1")
      .filter((tie) => tie.round === 1)
      .map((tie) =>
        [
          ((tie.side1 as Data).homeCourt as Data).courtName,
          ((tie.side2 as Data).homeCourt as Data).courtName,
        ].sort(),
      )
      .sort();
    expect(pairs).toEqual([
      ["birmingham", "coventry"],
      ["bradford", "leeds"],
      ["croydon", "london"],
      ["manchester", "salford"],
    ]);
  });

  it("fills leftover spots with entrants who never played and pairs them together", async () => {
    seedLadder("L1", { maxPlayers: 256 });
    const cities = [
      "london",
      "croydon",
      "manchester",
      "salford",
      "birmingham",
      "coventry",
    ];
    seedParticipants("L1", 128, (index) =>
      index < 6
        ? {
            competitionXP: 100 - index,
            numberOfWins: 3,
            homeCourt: homeCourt(cities[index]),
            joinedAt: daysFromNow(-60),
          }
        : { homeCourt: null, joinedAt: daysFromNow(-50 + index) },
    );

    await runProcessLadderPhases(now);

    const roundOne = ties("L1").filter((tie) => tie.round === 1);
    const pairs = roundOne
      .map((tie) =>
        [(tie.side1 as Data).entrantKey, (tie.side2 as Data).entrantKey].sort(),
      )
      .sort();
    expect(pairs).toEqual([
      ["p0000", "p0001"],
      ["p0002", "p0003"],
      ["p0004", "p0005"],
      ["p0006", "p0007"],
    ]);
    const neverPlayed = roundOne
      .flatMap((tie) => [tie.side1, tie.side2] as Data[])
      .filter((side) => side.homeCourt === null)
      .map((side) => [side.entrantKey, side.rank]);
    expect(neverPlayed).toEqual(
      expect.arrayContaining([
        ["p0006", 7],
        ["p0007", 8],
      ]),
    );
  });

  it("fills spots from entrants with no wins", async () => {
    seedLadder("L1", { maxPlayers: 256 });
    seedParticipants("L1", 130);

    await runProcessLadderPhases(now);

    expect(ladder("L1").playoffBracketSize).toBe(8);
    expect(ties("L1").filter((tie) => tie.round === 1)).toHaveLength(4);
  });

  it("breaks a tie on the last spots by global XP, then join date", async () => {
    seedLadder("L1", { maxPlayers: 256 });
    seedParticipants("L1", 140, (index) => ({
      competitionXP: index < 6 ? 1000 - index : 500 - index,
    }));
    const level = { competitionXP: 990, numberOfWins: 3 };
    seedParticipant("L1", "p0007", { ...level, joinedAt: daysFromNow(-5) }, 10);
    seedParticipant(
      "L1",
      "zz-higher-xp",
      { ...level, joinedAt: daysFromNow(-1) },
      500,
    );
    seedParticipant(
      "L1",
      "zz-early",
      { ...level, joinedAt: daysFromNow(-90) },
      10,
    );

    await runProcessLadderPhases(now);

    const qualified = ties("L1")
      .filter((tie) => tie.round === 1)
      .flatMap((tie) => [
        (tie.side1 as Data).entrantKey,
        (tie.side2 as Data).entrantKey,
      ]);
    expect(qualified).toContain("zz-higher-xp");
    expect(qualified).toContain("zz-early");
    expect(qualified).not.toContain("p0007");
  });

  it("closes registration and generates in the same run when both are due", async () => {
    seedLadder("L1", { status: LADDER_STATUS.REGISTRATION_OPEN });
    seedParticipants("L1", 128);

    const summary = await runProcessLadderPhases(now);

    expect(summary.registrationClosed).toEqual(["L1"]);
    expect(summary.playoffsGenerated).toEqual(["L1"]);
    expect(ladder("L1").status).toBe(LADDER_STATUS.PLAYOFFS);
  });

  it("still runs a top 8 when entrants dropped below 128 after registration closed", async () => {
    seedLadder("L1");
    seedParticipants("L1", 127, (index) => ({ competitionXP: 1000 - index }));

    const summary = await runProcessLadderPhases(now);

    expect(summary.playoffsGenerated).toEqual(["L1"]);
    expect(ladder("L1")).toMatchObject({
      status: LADDER_STATUS.PLAYOFFS,
      playoffBracketSize: 8,
      playoffEntrantCount: 127,
    });
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("waits until playoffStartsAt", async () => {
    seedLadder("L1", { playoffStartsAt: daysFromNow(1) });
    seedParticipants("L1", 300);

    await runProcessLadderPhases(now);

    expect(ladder("L1").status).toBe(LADDER_STATUS.REGISTRATION_CLOSED);
    expect(ties("L1")).toHaveLength(0);
  });
});

describe("idempotency", () => {
  it("does nothing on a second run", async () => {
    seedLadder("L1");
    seedParticipants("L1", 300);

    await runProcessLadderPhases(now);
    const writesAfterFirstRun = writeLog.length;
    const tiesAfterFirstRun = ties("L1");

    const second = await runProcessLadderPhases(now);

    expect(second.playoffsGenerated).toEqual([]);
    expect(writeLog).toHaveLength(writesAfterFirstRun);
    expect(ties("L1")).toEqual(tiesAfterFirstRun);
  });

  it("skips a ladder already marked as generated", async () => {
    seedLadder("L1", { playoffsGeneratedAt: daysFromNow(-1) });
    seedParticipants("L1", 300);

    await runProcessLadderPhases(now);

    expect(ties("L1")).toHaveLength(0);
    expect(ladder("L1").status).toBe(LADDER_STATUS.REGISTRATION_CLOSED);
  });

  it("writes nothing if any bracket slot already exists", async () => {
    seedLadder("L1");
    seedParticipants("L1", 300);
    store.set("ladders/L1/playoffTies/r1-s0", { stale: true });

    const summary = await runProcessLadderPhases(now);

    expect(summary.playoffsGenerated).toEqual([]);
    expect(ladder("L1").status).toBe(LADDER_STATUS.REGISTRATION_CLOSED);
    expect(ties("L1")).toEqual([{ stale: true }]);
  });

  it("ignores ladders already in playoffs, completed or cancelled", async () => {
    seedLadder("A", { status: LADDER_STATUS.PLAYOFFS });
    seedLadder("B", { status: LADDER_STATUS.COMPLETED });
    seedLadder("C", { status: LADDER_STATUS.CANCELLED });
    ["A", "B", "C"].forEach((ladderId) => seedParticipants(ladderId, 300));

    await runProcessLadderPhases(now);

    expect(writeLog).toHaveLength(0);
  });
});

describe("playoff generation (doubles)", () => {
  it("uses active two-player teams with combined XP and their home court", async () => {
    seedLadder("L1", { ladderType: LADDER_TYPE.DOUBLES, maxPlayers: 256 });
    for (let index = 0; index < 130; index += 1) {
      const [a, b] = [`a${index}`, `b${index}`];
      seedUser(a, 100);
      seedUser(b, 100);
      store.set(`ladders/L1/ladderTeams/${a}_${b}`, {
        teamKey: `${a}_${b}`,
        teamId: `team-${index}`,
        playerIds: [a, b],
        XP: 1000 - index,
        numberOfWins: 1,
        status: TEAM_STATUS.ACTIVE,
        homeCourt: homeCourt(index === 0 ? "london" : "croydon"),
      });
    }
    store.set("ladders/L1/ladderTeams/pending", {
      teamKey: "pending",
      playerIds: ["solo", "nobody"],
      XP: 999999,
      status: TEAM_STATUS.PENDING,
    });

    await runProcessLadderPhases(now);

    expect(ladder("L1")).toMatchObject({
      status: LADDER_STATUS.PLAYOFFS,
      playoffBracketSize: 8,
      playoffEntrantCount: 130,
    });
    const sides = ties("L1")
      .filter((tie) => tie.round === 1)
      .flatMap((tie) => [tie.side1, tie.side2]) as Data[];
    expect(sides.map((side) => side.entrantKey)).not.toContain("pending");
    const top = sides.find((side) => side.rank === 1) as Data;
    expect(top).toMatchObject({
      entrantKey: "a0_b0",
      teamId: "team-0",
      playerIds: ["a0", "b0"],
    });
    expect((top.homeCourt as Data).courtId).toBe("court-london");
    const topTie = ties("L1").find(
      (tie) =>
        (tie.side1 as Data | null)?.entrantKey === "a0_b0" ||
        (tie.side2 as Data | null)?.entrantKey === "a0_b0",
    ) as Data;
    const topTeam =
      (topTie.side1 as Data).entrantKey === "a0_b0"
        ? topTie.team1
        : topTie.team2;
    expect(topTeam).toMatchObject({
      player1: { userId: "a0", username: "a0" },
      player2: { userId: "b0", username: "b0" },
    });
  });
});

describe("notifications", () => {
  const sent = () =>
    mockSendNotification.mock.calls.map(([notification]) => notification);

  it("tells every entrant when a ladder is cancelled", async () => {
    seedLadder("L1", {
      name: "North London Ladder",
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    seedParticipants("L1", 127);

    await runProcessLadderPhases(now);

    expect(sent()).toHaveLength(127);
    expect(sent()[0]).toMatchObject({
      senderId: "system",
      title: "Ladder cancelled",
      message:
        "North London Ladder has been cancelled because not enough players signed up before registration closed. If you paid an entry fee, it will be refunded to you in full.",
      type: "ladder",
      data: { ladderId: "L1", tab: "Summary" },
    });
    expect(new Set(sent().map((n) => n.recipientId)).size).toBe(127);
  });

  it("tells both players of each cancelled doubles team", async () => {
    seedLadder("L1", {
      ladderType: LADDER_TYPE.DOUBLES,
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    for (let index = 0; index < 3; index += 1) {
      store.set(`ladders/L1/ladderTeams/t${index}`, {
        teamKey: `t${index}`,
        playerIds: [`a${index}`, `b${index}`],
      });
    }

    await runProcessLadderPhases(now);

    expect(
      sent()
        .map((n) => n.recipientId)
        .sort(),
    ).toEqual(["a0", "a1", "a2", "b0", "b1", "b2"]);
  });

  it("congratulates only the qualifiers when playoffs are generated", async () => {
    seedLadder("L1", { name: "North London Ladder", maxPlayers: 256 });
    seedParticipants("L1", 140, (index) => ({ competitionXP: 1000 - index }));

    await runProcessLadderPhases(now);

    const promoted = sent().filter((n) => n.title === "You made the playoffs!");
    expect(promoted.map((n) => n.recipientId).sort()).toEqual(
      Array.from(
        { length: 8 },
        (_, index) => `p${String(index).padStart(4, "0")}`,
      ),
    );
    expect(promoted[0]).toMatchObject({
      message:
        "Congratulations! You've made the playoffs in North London Ladder. You have 10 days to play both your home and away games.",
      data: { ladderId: "L1", tab: "Playoffs" },
    });
  });

  it("tells every player who did not qualify that the ladder is closed", async () => {
    seedLadder("L1", { name: "North London Ladder", maxPlayers: 256 });
    seedParticipants("L1", 140, (index) => ({ competitionXP: 1000 - index }));

    await runProcessLadderPhases(now);

    const eliminated = sent().filter(
      (n) => n.title === "Playoffs have started",
    );
    expect(eliminated).toHaveLength(132);
    expect(eliminated.map((n) => n.recipientId).sort()).toEqual(
      Array.from(
        { length: 132 },
        (_, index) => `p${String(index + 8).padStart(4, "0")}`,
      ),
    );
    expect(eliminated[0]).toMatchObject({
      senderId: "system",
      type: "ladder",
      message:
        "The playoffs in North London Ladder have started, and unfortunately you didn't make the cut this time. The ladder is now closed, so you can no longer post matches. Thank you for playing, and come back next season for another chance to win!",
      data: { ladderId: "L1", tab: "Playoffs" },
    });
    expect(sent()).toHaveLength(140);
  });

  it("tells both players of every doubles team that did not qualify", async () => {
    seedLadder("L1", {
      ladderType: LADDER_TYPE.DOUBLES,
      name: "Doubles Ladder",
      maxPlayers: 256,
    });
    for (let index = 0; index < 130; index += 1) {
      const id = String(index).padStart(3, "0");
      seedUser(`a${id}`);
      seedUser(`b${id}`);
      store.set(`ladders/L1/ladderTeams/t${id}`, {
        teamKey: `t${id}`,
        teamId: `t${id}`,
        playerIds: [`a${id}`, `b${id}`],
        status: TEAM_STATUS.ACTIVE,
        XP: 1000 - index,
        homeCourt: homeCourt("london"),
      });
    }

    await runProcessLadderPhases(now);

    const eliminated = sent().filter(
      (n) => n.title === "Playoffs have started",
    );
    expect(eliminated).toHaveLength((130 - 8) * 2);
    const recipients = eliminated.map((n) => n.recipientId);
    expect(recipients).toContain("a008");
    expect(recipients).toContain("b008");
    expect(recipients).not.toContain("a007");
    expect(recipients).not.toContain("b007");
  });

  it("sends no elimination notice when a ladder is cancelled instead", async () => {
    seedLadder("L1", {
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    seedParticipants("L1", 127);

    await runProcessLadderPhases(now);

    expect(sent().some((n) => n.title === "Playoffs have started")).toBe(false);
  });

  it("sends nothing on a second run", async () => {
    seedLadder("L1");
    seedParticipants("L1", 300);

    await runProcessLadderPhases(now);
    const firstRun = mockSendNotification.mock.calls.length;
    await runProcessLadderPhases(now);

    expect(firstRun).toBe(300);
    expect(mockSendNotification).toHaveBeenCalledTimes(firstRun);
  });
});

describe("playoff hold for unsettled games", () => {
  const seedDueLadder = () => {
    seedLadder("L1", { name: "North London Ladder", maxPlayers: 256 });
    seedParticipants("L1", 140, (index) => ({ competitionXP: 1000 - index }));
  };

  it("waits while a dispute is still open and records why", async () => {
    seedDueLadder();
    store.set("disputes/d1", {
      ladderId: "L1",
      stage: DISPUTE_STAGE.UNDER_REVIEW,
    });

    const summary = await runProcessLadderPhases(now);

    expect(summary.playoffsHeld).toEqual(["L1"]);
    expect(summary.playoffsGenerated).toEqual([]);
    expect(ladder("L1").status).toBe(LADDER_STATUS.REGISTRATION_CLOSED);
    expect(ladder("L1").playoffHold).toMatchObject({
      openDisputes: 1,
      pendingGames: 0,
    });
    expect(ties("L1")).toHaveLength(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("waits while a reported game is still pending approval", async () => {
    seedDueLadder();
    store.set("ladders/L1/ladderMatches/m1", {
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      games: [{ approvalStatus: "Pending" }, { approvalStatus: "approved" }],
    });

    const summary = await runProcessLadderPhases(now);

    expect(summary.playoffsHeld).toEqual(["L1"]);
    expect(ladder("L1").playoffHold).toMatchObject({
      openDisputes: 0,
      pendingGames: 1,
    });
  });

  it("ignores resolved disputes and approved games", async () => {
    seedDueLadder();
    store.set("disputes/d1", {
      ladderId: "L1",
      stage: DISPUTE_STAGE.RESOLVED,
    });
    store.set("disputes/d2", {
      ladderId: "OTHER",
      stage: DISPUTE_STAGE.UNDER_REVIEW,
    });
    store.set("ladders/L1/ladderMatches/m1", {
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      games: [{ approvalStatus: "approved" }, { approvalStatus: "" }],
    });

    const summary = await runProcessLadderPhases(now);

    expect(summary.playoffsGenerated).toEqual(["L1"]);
  });

  it("generates once the dispute is resolved and clears the hold", async () => {
    seedDueLadder();
    store.set("disputes/d1", {
      ladderId: "L1",
      stage: DISPUTE_STAGE.UNDER_REVIEW,
    });
    await runProcessLadderPhases(now);

    store.set("disputes/d1", { ladderId: "L1", stage: DISPUTE_STAGE.RESOLVED });
    const summary = await runProcessLadderPhases(now);

    expect(summary.playoffsGenerated).toEqual(["L1"]);
    expect(ladder("L1").status).toBe(LADDER_STATUS.PLAYOFFS);
    expect(ladder("L1").playoffHold).toBeNull();
  });

  it("stops waiting 48 hours after the playoff start", async () => {
    seedDueLadder();
    store.set("disputes/d1", {
      ladderId: "L1",
      stage: DISPUTE_STAGE.UNDER_REVIEW,
    });
    const afterHold = new Date(
      (ladder("L1").playoffStartsAt as Date).getTime() + 49 * 60 * 60 * 1000,
    );

    const summary = await runProcessLadderPhases(afterHold);

    expect(summary.playoffsGenerated).toEqual(["L1"]);
  });
});

describe("who can qualify", () => {
  it("never seeds an entrant whose account no longer exists", async () => {
    seedLadder("L1", { maxPlayers: 256 });
    seedParticipants("L1", 140, (index) => ({ competitionXP: 1000 - index }));
    store.delete("users/p0000");
    store.delete("users/p0003");

    await runProcessLadderPhases(now);

    const qualifiers = ties("L1")
      .filter((tie) => tie.round === 1)
      .flatMap((tie) => [tie.side1, tie.side2] as { entrantKey: string }[])
      .map((side) => side.entrantKey);
    expect(qualifiers).toHaveLength(8);
    expect(qualifiers).not.toContain("p0000");
    expect(qualifiers).not.toContain("p0003");
    expect(qualifiers).toContain("p0008");
    expect(qualifiers).toContain("p0009");
    expect(ladder("L1").playoffEntrantCount).toBe(138);
  });

  it("does not notify an account that no longer exists", async () => {
    seedLadder("L1", { maxPlayers: 256 });
    seedParticipants("L1", 140, (index) => ({ competitionXP: 1000 - index }));
    store.delete("users/p0000");

    await runProcessLadderPhases(now);

    const recipients = mockSendNotification.mock.calls.map(
      ([notification]) => notification.recipientId,
    );
    expect(recipients).not.toContain("p0000");
    expect(recipients).toHaveLength(139);
  });

  it("excludes a disqualified player, fills the spot, and tells them they missed out", async () => {
    seedLadder("L1", { maxPlayers: 256 });
    seedParticipants("L1", 140, (index) => ({ competitionXP: 1000 - index }));
    store.set("ladders/L1/reportCounts/p0001", { strikes: { cheating: 3 } });
    store.set("ladders/L1/reportCounts/p0002", { strikes: { no_show: 4 } });

    await runProcessLadderPhases(now);

    const qualifiers = ties("L1")
      .filter((tie) => tie.round === 1)
      .flatMap((tie) => [tie.side1, tie.side2] as { entrantKey: string }[])
      .map((side) => side.entrantKey);
    expect(qualifiers).not.toContain("p0001");
    expect(qualifiers).toContain("p0002");
    expect(qualifiers).toContain("p0008");
    const eliminated = mockSendNotification.mock.calls
      .map(([notification]) => notification)
      .filter((n) => n.title === "Playoffs have started")
      .map((n) => n.recipientId);
    expect(eliminated).toContain("p0001");
    expect(eliminated).not.toContain("p0002");
  });

  it("excludes a doubles team when either player is disqualified or gone", async () => {
    seedLadder("L1", {
      ladderType: LADDER_TYPE.DOUBLES,
      maxPlayers: 256,
    });
    for (let index = 0; index < 130; index += 1) {
      const id = String(index).padStart(3, "0");
      seedUser(`a${id}`);
      seedUser(`b${id}`);
      store.set(`ladders/L1/ladderTeams/t${id}`, {
        teamKey: `t${id}`,
        teamId: `t${id}`,
        playerIds: [`a${id}`, `b${id}`],
        status: TEAM_STATUS.ACTIVE,
        XP: 1000 - index,
        homeCourt: homeCourt("london"),
      });
    }
    store.set("ladders/L1/reportCounts/b000", { strikes: { abuse: 3 } });
    store.delete("users/a001");

    await runProcessLadderPhases(now);

    const qualifiers = ties("L1")
      .filter((tie) => tie.round === 1)
      .flatMap((tie) => [tie.side1, tie.side2] as { entrantKey: string }[])
      .map((side) => side.entrantKey);
    expect(qualifiers).not.toContain("t000");
    expect(qualifiers).not.toContain("t001");
    expect(qualifiers).toContain("t002");
    expect(qualifiers).toContain("t009");
  });
});

describe("registration count for doubles", () => {
  it("does not count pending or one-player teams towards the 128 minimum", async () => {
    seedLadder("L1", {
      ladderType: LADDER_TYPE.DOUBLES,
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    for (let index = 0; index < 100; index += 1) {
      store.set(`ladders/L1/ladderTeams/t${index}`, {
        teamKey: `t${index}`,
        playerIds: [`a${index}`, `b${index}`],
        status: TEAM_STATUS.ACTIVE,
      });
    }
    for (let index = 0; index < 40; index += 1) {
      store.set(`ladders/L1/ladderTeams/pending${index}`, {
        teamKey: `pending${index}`,
        playerIds: [`c${index}`],
        status: TEAM_STATUS.PENDING,
      });
    }

    const summary = await runProcessLadderPhases(now);

    expect(summary.cancelled).toEqual(["L1"]);
    expect(ladder("L1").status).toBe(LADDER_STATUS.CANCELLED);
  });
});

describe("resuming notifications", () => {
  const sentIds = () =>
    mockSendNotification.mock.calls.map(([, options]) => options?.id);

  const seedGeneratedLadder = async () => {
    seedLadder("L1", { name: "North London Ladder", maxPlayers: 256 });
    seedParticipants("L1", 140, (index) => ({ competitionXP: 1000 - index }));
  };

  it("sends every message with a deterministic id and marks the ladder notified", async () => {
    await seedGeneratedLadder();

    await runProcessLadderPhases(now);

    expect(sentIds()).toHaveLength(140);
    expect(new Set(sentIds()).size).toBe(140);
    expect(sentIds()).toContain("playoffs-promotion-L1-p0000");
    expect(sentIds()).toContain("playoffs-elimination-L1-p0139");
    expect(ladder("L1").playoffNotificationsSentAt).toBeInstanceOf(Date);
  });

  it("finishes sending on the next run when the first run failed part-way", async () => {
    await seedGeneratedLadder();
    let calls = 0;
    mockSendNotification.mockImplementation(async () => {
      calls += 1;
      if (calls === 60) throw new Error("function timed out");
    });

    const first = await runProcessLadderPhases(now);

    expect(first.playoffsGenerated).toEqual([]);
    expect(ladder("L1").status).toBe(LADDER_STATUS.PLAYOFFS);
    expect(ladder("L1").playoffNotificationsSentAt).toBeUndefined();

    mockSendNotification.mockReset();
    mockSendNotification.mockResolvedValue(undefined);
    await runProcessLadderPhases(now);

    expect(sentIds()).toHaveLength(140);
    expect(ladder("L1").playoffNotificationsSentAt).toBeInstanceOf(Date);

    mockSendNotification.mockClear();
    await runProcessLadderPhases(now);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("finishes cancellation messages the same way", async () => {
    seedLadder("L1", {
      status: LADDER_STATUS.REGISTRATION_OPEN,
      registrationClosesAt: daysFromNow(-1),
      playoffStartsAt: daysFromNow(30),
    });
    seedParticipants("L1", 127);
    let calls = 0;
    mockSendNotification.mockImplementation(async () => {
      calls += 1;
      if (calls === 20) throw new Error("function timed out");
    });
    await runProcessLadderPhases(now);
    expect(ladder("L1").cancellationNotificationsSentAt).toBeUndefined();

    mockSendNotification.mockReset();
    mockSendNotification.mockResolvedValue(undefined);
    await runProcessLadderPhases(now);

    expect(sentIds()).toHaveLength(127);
    expect(sentIds()[0]).toMatch(/^ladder-cancelled-L1-/);
    expect(ladder("L1").cancellationNotificationsSentAt).toBeInstanceOf(Date);
  });

  it("does not resend for a ladder that finished long ago", async () => {
    store.set("ladders/OLD", {
      name: "Old",
      ladderType: LADDER_TYPE.SINGLES,
      status: LADDER_STATUS.PLAYOFFS,
      playoffsGeneratedAt: daysFromNow(-10),
    });
    seedParticipant("OLD", "p0000");

    await runProcessLadderPhases(now);

    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
