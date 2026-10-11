const mockWrites = [];
const mockDocs = new Map();

jest.mock("../../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: (_db, ...path) => ({ path: path.join("/") }),
  doc: (parent, ...path) => ({
    path: [parent?.path, ...path].filter(Boolean).join("/"),
  }),
  getDocs: async (ref) => ({
    docs: [...mockDocs]
      .filter(([path]) => path.startsWith(`${ref.path}/`))
      .map(([, data]) => ({ data: () => data })),
  }),
  query: (ref) => ref,
  where: () => ({}),
  writeBatch: () => ({
    set: (ref, data) => mockWrites.push({ op: "set", path: ref.path, data }),
    update: (ref, data) =>
      mockWrites.push({ op: "update", path: ref.path, data }),
    delete: (ref) => mockWrites.push({ op: "delete", path: ref.path }),
    commit: async () => {
      mockWrites.forEach((write) => {
        if (write.op === "set") {
          mockDocs.set(write.path, {
            ...mockDocs.get(write.path),
            ...write.data,
          });
        }
      });
    },
  }),
}));

import { decideLadderPlayoffTie, tallyLadderPlayoffTie } from "@shared";
import { MAESTRO_PO_LADDER_ID } from "./seedLadderPlayoffs";
import {
  PLAYOFF_MATCH_STAGE,
  seedLadderPlayoffMatches,
} from "./seedLadderPlayoffMatches";

const testUser = {
  userId: "test-user",
  firstName: "Test",
  lastName: "User",
  username: "tester",
  profileDetail: { XP: 100 },
};

const tie = (tieId) =>
  mockDocs.get(`ladders/${MAESTRO_PO_LADDER_ID}/playoffTies/${tieId}`);
const legs = (tieId) =>
  [...mockDocs]
    .filter(([path]) =>
      path.startsWith(
        `ladders/${MAESTRO_PO_LADDER_ID}/ladderMatches/${tieId}-leg`,
      ),
    )
    .map(([, data]) => data);

beforeEach(() => {
  mockWrites.length = 0;
  mockDocs.clear();
});

let my = { tieId: "", side: "team1", other: "team2" };
const seed = async (stage) => {
  const outcome = await seedLadderPlayoffMatches({ testUser, stage });
  const t = tie(outcome.myTie);
  const side = t.side1.playerIds.includes("test-user") ? "team1" : "team2";
  my = {
    tieId: outcome.myTie,
    side,
    other: side === "team1" ? "team2" : "team1",
  };
  return outcome;
};
const games = (side) => (side === "team1" ? "team1Games" : "team2Games");

describe("seedLadderPlayoffMatches", () => {
  it("leaves the coin for the user to flip", async () => {
    await seed(PLAYOFF_MATCH_STAGE.COIN_PENDING);
    expect(tie(my.tieId).round).toBe(1);
    expect(tie(my.tieId).coinToss).toBeNull();
    expect(tie(my.tieId).bestOf).toBe(7);
    expect(legs(my.tieId)).toHaveLength(0);
  });

  it("gives the coin to the user", async () => {
    await seed(PLAYOFF_MATCH_STAGE.COIN_WON);
    expect(tie(my.tieId).coinToss.firstHost).toBe(my.side);
  });

  it("gives the coin to the opponent", async () => {
    await seed(PLAYOFF_MATCH_STAGE.COIN_LOST);
    expect(tie(my.tieId).coinToss.firstHost).toBe(my.other);
  });

  it("posts match 1 from the opponent for the user to accept", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG1_POSTED);
    const [leg1] = legs(my.tieId);
    expect(leg1).toMatchObject({
      matchStatus: "posted",
      playoffLeg: 1,
      playoffTieId: my.tieId,
    });
    expect(leg1.createdBy).not.toBe("test-user");
  });

  it("completes match 1 with the user 4-2 up and hosting match 2", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG1_COMPLETE);
    const t = tie(my.tieId);
    expect(t.coinToss.firstHost).toBe(my.other);
    const tally = tallyLadderPlayoffTie(t, legs(my.tieId));
    expect([tally[games(my.side)], tally[games(my.other)]]).toEqual([4, 2]);
  });

  it("levels the aggregate with a decider", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEVEL);
    const all = legs(my.tieId);
    expect(all.map((m) => m.playoffLeg).sort()).toEqual([1, 2, 3]);
    expect(all.find((m) => m.playoffLeg === 3)).toMatchObject({
      bestOf: 1,
      matchStatus: "accepted",
    });
    expect(decideLadderPlayoffTie(tie(my.tieId), all)).toMatchObject({
      decided: false,
      deciderRequired: true,
    });
    expect(
      mockDocs.get(
        `users/test-user/notifications/maestro-po-decider-${my.tieId}`,
      ).title,
    ).toBe("One deciding game to play");
  });

  it("settles the user's game and opens the quarter-final", async () => {
    await seed(PLAYOFF_MATCH_STAGE.SETTLED);
    expect(tie(my.tieId)).toMatchObject({
      status: "completed",
      winner: my.side,
      outcome: "played",
    });
    const next = tie(`r2-s${Math.floor(tie(my.tieId).slot / 2)}`);
    expect([next.side1?.playerIds, next.side2?.playerIds]).toContainEqual([
      "test-user",
    ]);
    expect(next.side1 && next.side2).toBeTruthy();
    expect(next.deadlineAt).toBeInstanceOf(Date);
  });

  it("dresses other games for browsing: in progress, played, void and level", async () => {
    await seed(PLAYOFF_MATCH_STAGE.COIN_PENDING);
    const others = Array.from({ length: 8 }, (_, slot) =>
      tie(`r1-s${slot}`),
    ).filter((t) => t.tieId !== my.tieId);
    const neighbour = tie(`r1-s${tie(my.tieId).slot ^ 1}`);
    expect(
      legs(neighbour.tieId)
        .map((m) => m.matchStatus)
        .sort(),
    ).toEqual(["accepted", "completed"]);
    const settled = others.filter((t) => t.status === "completed");
    expect(settled.map((t) => t.outcome).sort()).toEqual(["played", "void"]);
    const levelTie = others.find((t) => t.deciderRequired);
    expect(legs(levelTie.tieId)).toHaveLength(3);
  });
});
