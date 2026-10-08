const mockWrites = [];
const mockDocs = new Map();

jest.mock("../../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: (_db, ...path) => ({ path: path.join("/") }),
  doc: (parent, ...path) => ({
    path: [parent?.path, ...path].filter(Boolean).join("/"),
  }),
  getDocs: async () => ({ docs: [] }),
  query: (ref) => ref,
  where: () => ({}),
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
  PLAYOFF_VARIANT,
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
    expect(
      setsUnder(`ladders/${MAESTRO_PO_LADDER_ID}/playoffTies/`),
    ).toHaveLength(0);
  });

  it("generates the top-128 bracket when asked", async () => {
    const outcome = await seedLadderPlayoffs({ testUser, generate: true });

    expect(outcome.generated).toEqual({ bracketSize: 128, tieCount: 128 });
    const roundOne = setsUnder(
      `ladders/${MAESTRO_PO_LADDER_ID}/playoffTies/r1-`,
    );
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
    const outcome = await seedLadderPlayoffsDoubles({
      testUser,
      generate: true,
    });

    expect(outcome.generated).toEqual({ bracketSize: 16, tieCount: 16 });
    const teams = setsUnder(
      `ladders/${MAESTRO_PO_DOUBLES_LADDER_ID}/ladderTeams/`,
    );
    expect(teams).toHaveLength(256);
    expect(teams[0].data.playerIds).toEqual(
      expect.arrayContaining(["test-user", "maestro-pod-u-0001"]),
    );
    const topSide = setsUnder(
      `ladders/${MAESTRO_PO_DOUBLES_LADDER_ID}/playoffTies/r1-`,
    )
      .flatMap((w) => [w.data.side1, w.data.side2])
      .find((side) => side.rank === 1);
    expect(topSide.playerIds).toEqual(
      expect.arrayContaining(["test-user", "maestro-pod-u-0001"]),
    );
  });
});

const fixtureKey = (n) => `maestro-po-u-${String(n).padStart(4, "0")}`;

const roundOneTies = (ladderId) =>
  setsUnder(`ladders/${ladderId}/playoffTies/r1-`).map((w) => w.data);

const notificationsFor = (userId) =>
  setsUnder(`users/${userId}/notifications/`).map((w) => w.data);

const PINNED_TIERS = [
  { size: 2048, bracket: 128, game: 9, opponent: 8 },
  { size: 1024, bracket: 64, game: 5, opponent: 8 },
  { size: 512, bracket: 32, game: 3, opponent: 8 },
  { size: 256, bracket: 16, game: 2, opponent: 8 },
  { size: 128, bracket: 8, game: 1, opponent: 1 },
  { size: 255, bracket: 8, game: 1, opponent: 1 },
  { size: 511, bracket: 16, game: 2, opponent: 8 },
  { size: 1023, bracket: 32, game: 3, opponent: 8 },
];

describe("seedLadderPlayoffs tiers", () => {
  it.each(PINNED_TIERS)(
    "size $size qualifies exactly the test user and the next $bracket - 1 fixtures, and pins the user's game",
    async ({ size, bracket, game, opponent }) => {
      const outcome = await seedLadderPlayoffs({
        testUser,
        generate: true,
        size,
      });

      expect(outcome).toMatchObject({
        entrants: size,
        expectedBracketSize: bracket,
      });
      expect(outcome.generated).toEqual({
        bracketSize: bracket,
        tieCount: expect.any(Number),
      });

      const ties = roundOneTies(MAESTRO_PO_LADDER_ID);
      expect(ties).toHaveLength(bracket / 2);
      const keys = ties
        .flatMap((tie) => [tie.side1, tie.side2])
        .sort((a, b) => a.rank - b.rank)
        .map((side) => side.entrantKey);
      expect(keys).toEqual([
        "test-user",
        ...Array.from({ length: bracket - 1 }, (_, i) => fixtureKey(i + 1)),
      ]);
      expect(keys).not.toContain(fixtureKey(bracket));

      const mine = ties.find((tie) =>
        [tie.side1, tie.side2].some((side) => side.entrantKey === "test-user"),
      );
      expect(mine.gameNumber).toBe(game);
      const other = [mine.side1, mine.side2].find(
        (side) => side.entrantKey !== "test-user",
      );
      expect(other.entrantKey).toBe(fixtureKey(opponent));
    },
    60000,
  );

  it("writes the promotion notification the function would send, and an entry notification per tab", async () => {
    await seedLadderPlayoffs({ testUser, generate: true, size: 256 });

    const notifications = notificationsFor("test-user");
    const promotion = notifications.find(
      (n) => n.title === "You made the playoffs!",
    );
    expect(promotion).toMatchObject({
      recipientId: "test-user",
      senderId: "system",
      type: "ladder",
      message:
        "Congratulations! You've made the playoffs in Maestro Playoffs 256. You have 10 days to play both your home and away games.",
      data: { ladderId: MAESTRO_PO_LADDER_ID, tab: "Playoffs" },
    });
    expect(notifications.map((n) => n.message)).toEqual(
      expect.arrayContaining([
        "Maestro: open Maestro Playoffs 256 on Summary",
        "Maestro: open Maestro Playoffs 256 on Playoffs",
      ]),
    );
  });

  it("sends no promotion when the bracket is left to the function", async () => {
    await seedLadderPlayoffs({ testUser, size: 256 });

    expect(
      notificationsFor("test-user").some(
        (n) => n.title === "You made the playoffs!",
      ),
    ).toBe(false);
    expect(roundOneTies(MAESTRO_PO_LADDER_ID)).toHaveLength(0);
  });
});

describe("seedLadderPlayoffs variants", () => {
  it("ranks the test user just below the cutoff so they do not qualify", async () => {
    await seedLadderPlayoffs({
      testUser,
      generate: true,
      size: 256,
      variant: PLAYOFF_VARIANT.NOT_QUALIFIED,
    });

    const keys = roundOneTies(MAESTRO_PO_LADDER_ID)
      .flatMap((tie) => [tie.side1, tie.side2])
      .sort((a, b) => a.rank - b.rank)
      .map((side) => side.entrantKey);
    expect(keys).toEqual(
      Array.from({ length: 16 }, (_, i) => fixtureKey(i + 1)),
    );
    expect(keys).not.toContain("test-user");

    const testUserRow = setsUnder(
      `ladders/${MAESTRO_PO_LADDER_ID}/ladderParticipants/test-user`,
    )[0].data;
    expect(testUserRow.competitionXP).toBe(10000 - 16 * 3);
    expect(
      notificationsFor("test-user").some(
        (n) => n.title === "You made the playoffs!",
      ),
    ).toBe(false);
  });

  it("seeds an upcoming ladder with the playoffs in the future and no bracket", async () => {
    const outcome = await seedLadderPlayoffs({
      testUser,
      generate: true,
      size: 256,
      variant: PLAYOFF_VARIANT.UPCOMING,
    });

    expect(outcome.generated).toBeNull();
    const ladder = setsUnder(`ladders/${MAESTRO_PO_LADDER_ID}`).find(
      (w) => w.path === `ladders/${MAESTRO_PO_LADDER_ID}`,
    ).data;
    expect(ladder.status).toBe("registrationClosed");
    expect(ladder.playoffStartsAt.getTime()).toBeGreaterThan(Date.now());
    expect(roundOneTies(MAESTRO_PO_LADDER_ID)).toHaveLength(0);
    expect(
      notificationsFor("test-user").some(
        (n) => n.title === "You made the playoffs!",
      ),
    ).toBe(false);
  });

  it("seeds a cancelled 127-player ladder with the function's cancellation notification", async () => {
    const outcome = await seedLadderPlayoffs({
      testUser,
      generate: true,
      size: 127,
      variant: PLAYOFF_VARIANT.CANCELLED,
    });

    expect(outcome).toMatchObject({ entrants: 127, expectedBracketSize: 0 });
    expect(outcome.generated).toBeNull();
    const ladder = setsUnder(`ladders/${MAESTRO_PO_LADDER_ID}`).find(
      (w) => w.path === `ladders/${MAESTRO_PO_LADDER_ID}`,
    ).data;
    expect(ladder).toMatchObject({
      status: "cancelled",
      cancelledReason: "Too few registrations",
      participantCount: 127,
    });
    expect(roundOneTies(MAESTRO_PO_LADDER_ID)).toHaveLength(0);

    const cancellation = notificationsFor("test-user").find(
      (n) => n.title === "Ladder cancelled",
    );
    expect(cancellation).toMatchObject({
      recipientId: "test-user",
      senderId: "system",
      type: "ladder",
      message:
        "Maestro Playoffs 127 has been cancelled because not enough players signed up before registration closed. If you paid an entry fee, it will be refunded to you in full.",
      data: { ladderId: MAESTRO_PO_LADDER_ID, tab: "Summary" },
    });
  });

  it("rejects sizes outside the fixture pool", async () => {
    await expect(seedLadderPlayoffs({ testUser, size: 2049 })).rejects.toThrow(
      "size",
    );
  });
});

describe("seedLadderPlayoffsDoubles tiers", () => {
  it("seeds 128 teams with a top 8 and the user's team in round 1", async () => {
    const outcome = await seedLadderPlayoffsDoubles({
      testUser,
      generate: true,
      teams: 128,
    });

    expect(outcome).toMatchObject({
      entrants: 128,
      expectedBracketSize: 8,
      ladderName: "Maestro Playoffs Doubles 128",
    });
    const ties = roundOneTies(MAESTRO_PO_DOUBLES_LADDER_ID);
    expect(ties).toHaveLength(4);
    const mine = ties.find((tie) =>
      [tie.side1, tie.side2].some((side) =>
        side.playerIds.includes("test-user"),
      ),
    );
    expect(mine.gameNumber).toBe(1);
    expect(
      notificationsFor("test-user").find(
        (n) => n.title === "You made the playoffs!",
      ).message,
    ).toBe(
      "Congratulations! You've made the playoffs in Maestro Playoffs Doubles 128. You have 10 days to play both your home and away games.",
    );
  });
});
