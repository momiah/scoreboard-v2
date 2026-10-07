const mockWrites = [];
const mockDocs = new Map();

jest.mock("../../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: (_db, ...path) => ({ path: path.join("/") }),
  doc: (_db, ...path) => ({ path: path.join("/") }),
  getDocs: async () => ({ docs: [] }),
  writeBatch: () => ({
    set: (ref, data) => mockWrites.push({ op: "set", path: ref.path, data }),
    update: (ref, data) =>
      mockWrites.push({ op: "update", path: ref.path, data }),
    delete: (ref) => mockWrites.push({ op: "delete", path: ref.path }),
    commit: async () => {
      mockWrites.forEach((write) => {
        if (write.op === "set") mockDocs.set(write.path, write.data);
      });
    },
  }),
}));

import {
  MAESTRO_PO_DOUBLES_LADDER_ID,
  MAESTRO_PO_LADDER_ID,
  seedLadderPlayoffs,
  seedLadderPlayoffsDoubles,
} from "./seedLadderPlayoffs";

const testUser = {
  userId: "test-user",
  firstName: "Test",
  lastName: "User",
  username: "tester",
  profileDetail: { XP: 100 },
};

const setsUnder = (prefix) =>
  mockWrites.filter((w) => w.op === "set" && w.path.startsWith(prefix));

beforeEach(() => {
  mockWrites.length = 0;
  mockDocs.clear();
});

describe("seedLadderPlayoffs (singles)", () => {
  it("seeds 2048 ranked participants past their playoff start", async () => {
    const outcome = await seedLadderPlayoffs({ testUser });

    expect(outcome).toMatchObject({ entrants: 2048, expectedBracketSize: 128 });
    const participants = setsUnder(
      `ladders/${MAESTRO_PO_LADDER_ID}/ladderParticipants/`,
    );
    expect(participants).toHaveLength(2048);
    expect(participants[0].data).toMatchObject({
      userId: "test-user",
      competitionXP: 10000,
    });
    expect(participants.every((p) => p.data.homeCourt?.courtId)).toBe(true);

    const ladder = setsUnder(`ladders/${MAESTRO_PO_LADDER_ID}`).find(
      (w) => w.path === `ladders/${MAESTRO_PO_LADDER_ID}`,
    ).data;
    expect(ladder.status).toBe("registrationClosed");
    expect(ladder.playoffStartsAt.getTime()).toBeLessThan(Date.now());
    expect(setsUnder(`ladders/${MAESTRO_PO_LADDER_ID}/playoffTies/`)).toHaveLength(0);
  });

  it("generates the top-128 bracket when asked", async () => {
    const outcome = await seedLadderPlayoffs({ testUser, generate: true });

    expect(outcome.generated).toEqual({ bracketSize: 128, tieCount: 128 });
    const roundOne = setsUnder(`ladders/${MAESTRO_PO_LADDER_ID}/playoffTies/r1-`);
    expect(roundOne).toHaveLength(64);
    const qualified = roundOne
      .flatMap((w) => [w.data.side1, w.data.side2])
      .sort((a, b) => a.rank - b.rank)
      .map((side) => side.entrantKey);
    expect(qualified).toEqual([
      "test-user",
      ...Array.from(
        { length: 127 },
        (_, i) => `maestro-po-u-${String(i + 1).padStart(4, "0")}`,
      ),
    ]);
    const ladderUpdate = mockWrites.find(
      (w) => w.op === "update" && w.path === `ladders/${MAESTRO_PO_LADDER_ID}`,
    );
    expect(ladderUpdate.data).toMatchObject({
      status: "playoffs",
      playoffBracketSize: 128,
      playoffEntrantCount: 2048,
    });
  });

  it("requires a test user", async () => {
    await expect(seedLadderPlayoffs({})).rejects.toThrow("testUser");
  });
});

describe("seedLadderPlayoffsDoubles", () => {
  it("seeds 256 teams with the test user's team first and a top 16", async () => {
    const outcome = await seedLadderPlayoffsDoubles({ testUser, generate: true });

    expect(outcome.generated).toEqual({ bracketSize: 16, tieCount: 16 });
    const teams = setsUnder(`ladders/${MAESTRO_PO_DOUBLES_LADDER_ID}/ladderTeams/`);
    expect(teams).toHaveLength(256);
    expect(teams[0].data.playerIds).toEqual(
      expect.arrayContaining(["test-user", "maestro-pod-u-0001"]),
    );
    const topSide = setsUnder(`ladders/${MAESTRO_PO_DOUBLES_LADDER_ID}/playoffTies/r1-`)
      .flatMap((w) => [w.data.side1, w.data.side2])
      .find((side) => side.rank === 1);
    expect(topSide.playerIds).toEqual(
      expect.arrayContaining(["test-user", "maestro-pod-u-0001"]),
    );
  });
});
