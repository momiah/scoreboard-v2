import {
  LADDER_CANCELLED_REASON,
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

function docRef(path: string): any {
  return {
    path,
    id: path.split("/").pop(),
    collection: (name: string) => collectionRef(`${path}/${name}`),
    get: async () => snapshot(path),
  };
}

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
    ...overrides,
  });
};

const seedParticipants = (
  ladderId: string,
  count: number,
  build: (index: number) => Data = () => ({}),
) => {
  for (let index = 0; index < count; index += 1) {
    seedParticipant(ladderId, `p${String(index).padStart(4, "0")}`, build(index));
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
    expect(
      allTies.map((tie) => tie.tieId as string).sort(),
    ).toEqual(
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
      Array.from({ length: 16 }, (_, index) => `p${String(index).padStart(4, "0")}`),
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
      homeCourt: index < 8 ? homeCourt(cities[index]) : null,
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
    seedParticipant("L1", "zz-higher-xp", { ...level, joinedAt: daysFromNow(-1) }, 500);
    seedParticipant("L1", "zz-early", { ...level, joinedAt: daysFromNow(-90) }, 10);

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

  it("cancels instead when entrants have dropped below the minimum", async () => {
    seedLadder("L1");
    seedParticipants("L1", 100);

    const summary = await runProcessLadderPhases(now);

    expect(summary.cancelled).toEqual(["L1"]);
    expect(ladder("L1").status).toBe(LADDER_STATUS.CANCELLED);
    expect(ties("L1")).toHaveLength(0);
    expect(mockRefund).toHaveBeenCalledTimes(1);
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
        homeCourt: index === 0 ? homeCourt("london") : null,
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
      (topTie.side1 as Data).entrantKey === "a0_b0" ? topTie.team1 : topTie.team2;
    expect(topTeam).toMatchObject({
      player1: { userId: "a0", username: "a0" },
      player2: { userId: "b0", username: "b0" },
    });
  });
});
