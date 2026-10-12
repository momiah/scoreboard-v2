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
    expect(tie(my.tieId).coinToss).toBeTruthy();
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

  it("dresses every other game as production would, with scores that add up", async () => {
    await seed(PLAYOFF_MATCH_STAGE.COIN_PENDING);
    const roundOne = Array.from({ length: 8 }, (_, slot) => tie(`r1-s${slot}`));
    const others = roundOne.filter((t) => t.tieId !== my.tieId);
    const legsOf = (t) => legs(t.tieId);

    const settledTies = others.filter((t) => t.status === "completed");
    expect(settledTies.map((t) => t.outcome)).toEqual(["played"]);
    settledTies.forEach((t) => {
      expect(t.coinToss).toMatchObject({ call: "logo" });
      const tally = tallyLadderPlayoffTie(t, legsOf(t));
      expect(tally[games(t.winner)]).toBeGreaterThan(
        tally[games(t.winner === "team1" ? "team2" : "team1")],
      );
    });

    const levelTie = others.find((t) => t.deciderRequired);
    const levelTally = tallyLadderPlayoffTie(
      levelTie,
      legsOf(levelTie).filter((m) => m.playoffLeg !== 3),
    );
    expect(levelTally.team1Games).toBe(levelTally.team2Games);
    expect(legsOf(levelTie).find((m) => m.playoffLeg === 3)).toMatchObject({
      bestOf: 1,
      matchStatus: "accepted",
    });

    const neighbour = tie(`r1-s${tie(my.tieId).slot ^ 1}`);
    const live = legsOf(neighbour).find((m) => m.matchStatus === "accepted");
    expect(
      live.games.filter((g) => g.approvalStatus === "pending"),
    ).toHaveLength(1);
    expect(others.filter((t) => !t.coinToss)).toHaveLength(1);
    expect(legsOf(others.find((t) => !t.coinToss))).toHaveLength(0);
    expect(
      others.some((t) => legsOf(t).some((m) => m.matchStatus === "posted")),
    ).toBe(true);
  });

  it("keeps every seeded match internally consistent", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEVEL);
    const all = [...mockDocs]
      .filter(([path]) =>
        path.startsWith(`ladders/${MAESTRO_PO_LADDER_ID}/ladderMatches/`),
      )
      .map(([, data]) => data);
    expect(all.length).toBeGreaterThan(10);
    all.forEach((m) => {
      const t = tie(m.playoffTieId);
      const majority = Math.floor(m.bestOf / 2) + 1;
      const approved = m.games.filter((g) => g.approvalStatus === "approved");
      const won = (label) =>
        approved.filter((g) => g.result.winner.team === label).length;
      const decided = won("Team 1") >= majority || won("Team 2") >= majority;
      expect([m.ladderMatchId, decided]).toEqual([
        m.ladderMatchId,
        m.matchStatus === "completed",
      ]);
      expect(Math.max(won("Team 1"), won("Team 2"))).toBeLessThanOrEqual(
        majority,
      );

      m.games
        .filter((g) => g.result)
        .forEach((g) => {
          const winnerScore =
            g.result.winner.team === "Team 1" ? g.team1.score : g.team2.score;
          const loserScore =
            g.result.winner.team === "Team 1" ? g.team2.score : g.team1.score;
          expect(winnerScore).toBe(g.result.winner.score);
          expect(loserScore).toBe(g.result.loser.score);
          expect(winnerScore - loserScore).toBeGreaterThanOrEqual(2);
          expect(winnerScore).toBeGreaterThanOrEqual(21);
          expect(g.gamescore).toBe(`${g.team1.score}-${g.team2.score}`);
          expect(g.numberOfApprovals).toBe(
            g.approvalStatus === "approved" ? 1 : 0,
          );
          expect(g.approvers).toHaveLength(g.numberOfApprovals);
          expect(g.reportedAt.getTime()).toBeLessThanOrEqual(Date.now());
        });

      if (m.games.some((g) => g.result) || m.playoffLeg === 3) {
        expect(m.checkIn).toMatchObject({ completed: true });
        expect([...m.checkIn.checkedInBy].sort()).toEqual(
          [...m.participants].sort(),
        );
      } else {
        expect(m.checkIn).toBeUndefined();
      }

      const [d, mo, y] = m.matchDate.split("-").map(Number);
      const [h, mi] = m.matchTime.start.split(":").map(Number);
      const startMs = new Date(y, mo - 1, d, h, mi).getTime();
      expect(startMs).toBeGreaterThanOrEqual(t.scheduledAt.getTime());
      expect(startMs).toBeLessThanOrEqual(t.deadlineAt.getTime());
    });
  });
});
