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
  deleteField: () => "__deleted__",
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

import {
  decideLadderPlayoffTie,
  getLadderPlayoffActiveSides,
  getLadderPlayoffLegHost,
  isDisqualified,
  isLadderPlayoffHostArrangeOverdue,
  tallyLadderPlayoffTie,
} from "@shared";
import { MAESTRO_PO_LADDER_ID } from "./seedLadderPlayoffs";
import { realWorldProblems } from "./realWorldChecks.helper";
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
  it("leaves the user's game with nothing arranged", async () => {
    await seed(PLAYOFF_MATCH_STAGE.PENDING);
    expect(tie(my.tieId).round).toBe(1);
    expect(tie(my.tieId).bestOf).toBe(7);
    expect(legs(my.tieId)).toHaveLength(0);
  });

  it("has the lower-ranked opponent host match 1 and the user host match 2", async () => {
    await seed(PLAYOFF_MATCH_STAGE.PENDING);
    expect(getLadderPlayoffLegHost(tie(my.tieId), 1)).toBe(my.other);
    expect(getLadderPlayoffLegHost(tie(my.tieId), 2)).toBe(my.side);
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
    expect(legs(my.tieId)[0].createdBy).not.toBe("test-user");
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
    ).toBe("You have a deciding game left to play");
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

  it("dresses every other game as production would, with scores that add up", async () => {
    await seed(PLAYOFF_MATCH_STAGE.PENDING);
    const roundOne = Array.from({ length: 8 }, (_, slot) => tie(`r1-s${slot}`));
    const others = roundOne.filter((t) => t.tieId !== my.tieId);
    const legsOf = (t) => legs(t.tieId);

    const settledTies = others.filter((t) => t.status === "completed");
    expect(settledTies.map((t) => t.outcome)).toEqual(["played"]);
    settledTies.forEach((t) => {
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
    const decider = legsOf(levelTie).find((m) => m.playoffLeg === 3);
    const matchTwo = legsOf(levelTie).find((m) => m.playoffLeg === 2);
    expect(decider.createdBy).toBe(matchTwo.createdBy);
    expect(decider.participants).toContain(decider.createdBy);
    expect(decider.participants).toContain(decider.acceptedBy);
    expect(decider.court).toEqual(matchTwo.court);

    const neighbour = tie(`r1-s${tie(my.tieId).slot ^ 1}`);
    const live = legsOf(neighbour).find((m) => m.matchStatus === "accepted");
    expect(
      live.games.filter((g) => g.approvalStatus === "pending"),
    ).toHaveLength(1);
    expect(others.filter((t) => legsOf(t).length === 0)).toHaveLength(1);
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

  it("posts match 1 again after one decline", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG1_POSTED_AFTER_DECLINE);
    const [leg1] = legs(my.tieId);
    expect(leg1).toMatchObject({
      matchStatus: "posted",
      playoffLeg: 1,
      scheduleDeclines: 1,
    });
  });

  it("leaves the user without a home court", async () => {
    await seed(PLAYOFF_MATCH_STAGE.NO_HOME_COURT);
    const side = my.side === "team1" ? "side1" : "side2";
    expect(tie(my.tieId)[side].homeCourt).toBeNull();
    expect(
      mockWrites.find(
        (write) =>
          write.op === "update" &&
          write.path.endsWith("ladderParticipants/test-user"),
      ).data,
    ).toEqual({ homeCourt: "__deleted__" });
    expect(legs(my.tieId)[0].matchStatus).toBe("accepted");
  });

  it("leaves the last game of match 1 awaiting the user's approval", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG1_IN_PROGRESS);
    const [leg1] = legs(my.tieId);
    const pending = leg1.games.filter((g) => g.approvalStatus === "pending");
    expect(leg1.matchStatus).toBe("accepted");
    expect(pending).toHaveLength(1);
    expect(pending[0].reporter).not.toBe("test-user");
  });

  it("seeds a regular match beside the playoff match", async () => {
    await seed(PLAYOFF_MATCH_STAGE.PLAYOFF_REGULAR);
    const regular = mockDocs.get(
      `ladders/${MAESTRO_PO_LADDER_ID}/ladderMatches/maestro-po-regular-match`,
    );
    expect(regular).toMatchObject({
      matchStatus: "accepted",
      participants: expect.arrayContaining(["test-user"]),
    });
    expect(regular.playoffTieId).toBeUndefined();
    expect(
      regular.games.filter((g) => g.approvalStatus === "pending"),
    ).toHaveLength(1);
  });

  it("posts match 2 from the user after a completed match 1", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG2_POSTED);
    const [leg1, leg2] = legs(my.tieId);
    expect(leg1.matchStatus).toBe("completed");
    expect(leg2).toMatchObject({ matchStatus: "posted", playoffLeg: 2 });
    expect(leg2.createdBy).toBe("test-user");
  });

  it("accepts match 2 with no games played", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG2_ACCEPTED);
    const [, leg2] = legs(my.tieId);
    expect(leg2.matchStatus).toBe("accepted");
    expect(leg2.games.some((g) => g.result)).toBe(false);
    expect(leg2.checkIn).toBeUndefined();
  });

  it("plays one approved game of match 2", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG2_ONE_GAME);
    const [, leg2] = legs(my.tieId);
    expect(leg2.matchStatus).toBe("accepted");
    expect(leg2.games.filter((g) => g.result)).toHaveLength(1);
    expect(leg2.games[0].approvalStatus).toBe("approved");
    expect(leg2.checkIn).toMatchObject({ completed: true });
  });

  it("keeps every posted match recent so the 24-hour auto-accept leaves it alone", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG2_POSTED);
    const posted = [...mockDocs]
      .filter(([path]) =>
        path.startsWith(`ladders/${MAESTRO_PO_LADDER_ID}/ladderMatches/`),
      )
      .map(([, data]) => data)
      .filter((m) => m.matchStatus === "posted");
    expect(posted.length).toBeGreaterThan(1);
    posted.forEach((m) =>
      expect(Date.now() - m.createdAt.getTime()).toBeLessThan(60 * 60 * 1000),
    );
  });

  it("posts a match that has waited 25 hours for the away side", async () => {
    await seed(PLAYOFF_MATCH_STAGE.LEG1_POSTED_STALE);
    const [leg1] = legs(my.tieId);
    expect(leg1.matchStatus).toBe("posted");
    expect(Date.now() - leg1.createdAt.getTime()).toBeGreaterThan(
      24 * 60 * 60 * 1000,
    );
  });

  it.each(Object.values(PLAYOFF_MATCH_STAGE))(
    "matches what production would have at stage %s",
    async (stage) => {
      await seed(stage);
      const ties = [...mockDocs]
        .filter(([path]) =>
          path.startsWith(`ladders/${MAESTRO_PO_LADDER_ID}/playoffTies/`),
        )
        .map(([, data]) => data);
      const matches = [...mockDocs]
        .filter(([path]) =>
          path.startsWith(`ladders/${MAESTRO_PO_LADDER_ID}/ladderMatches/`),
        )
        .map(([, data]) => data)
        .filter((match) => match.playoffTieId);
      expect(realWorldProblems({ ties, matches })).toEqual([]);
    },
  );

  it("leaves match 1 unarranged inside its first 48 hours for pending", async () => {
    await seed(PLAYOFF_MATCH_STAGE.PENDING);
    expect(isLadderPlayoffHostArrangeOverdue(tie(my.tieId), new Date())).toBe(
      false,
    );
    expect(legs(my.tieId)).toHaveLength(0);
  });

  it("leaves match 1 unarranged past its first 48 hours for matchOneOverdue", async () => {
    await seed(PLAYOFF_MATCH_STAGE.MATCH_ONE_OVERDUE);
    expect(isLadderPlayoffHostArrangeOverdue(tie(my.tieId), new Date())).toBe(
      true,
    );
    expect(legs(my.tieId)).toHaveLength(0);
  });

  it("has only the user arrange anything before a deadline that has passed", async () => {
    await seed(PLAYOFF_MATCH_STAGE.INACTIVE_OPPONENT_PAST_DEADLINE);
    expect(tie(my.tieId).deadlineAt.getTime()).toBeLessThan(Date.now());
    const [leg2] = legs(my.tieId);
    expect(leg2).toMatchObject({
      matchStatus: "posted",
      createdBy: "test-user",
    });
    expect(getLadderPlayoffActiveSides(tie(my.tieId), legs(my.tieId))).toEqual([
      my.side,
    ]);
  });

  it("strikes the opponent out of the ladder", async () => {
    await seed(PLAYOFF_MATCH_STAGE.OPPONENT_DISQUALIFIED);
    const opponentId = tie(my.tieId)[my.other === "team1" ? "side1" : "side2"]
      .playerIds[0];
    const counts = mockDocs.get(
      `ladders/${MAESTRO_PO_LADDER_ID}/reportCounts/${opponentId}`,
    );
    expect(isDisqualified(counts.strikes)).toBe(true);
  });
});
