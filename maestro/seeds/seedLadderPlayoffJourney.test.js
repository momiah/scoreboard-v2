const mockWrites = [];
const mockDocs = new Map();
const mockUpdates = [];

jest.mock("../../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: (_db, ...path) => ({ path: path.join("/") }),
  doc: (parent, ...path) => ({
    path: [parent?.path, ...path].filter(Boolean).join("/"),
  }),
  getDoc: async (ref) => ({
    exists: () => mockDocs.has(ref.path),
    data: () => mockDocs.get(ref.path),
  }),
  getDocs: async (ref) => ({
    docs: [...mockDocs]
      .filter(([path]) => path.startsWith(`${ref.path}/`))
      .map(([, data]) => ({ data: () => data })),
  }),
  query: (ref) => ref,
  where: () => ({}),
  setDoc: async () => {},
  updateDoc: async (ref, data) => {
    mockUpdates.push({ path: ref.path, data });
  },
  writeBatch: () => ({
    set: (ref, data, options) =>
      mockWrites.push({ op: "set", path: ref.path, data, options }),
    update: (ref, data) =>
      mockWrites.push({ op: "update", path: ref.path, data }),
    delete: (ref) => mockWrites.push({ op: "delete", path: ref.path }),
    commit: async () => {
      mockWrites.forEach((write) => {
        if (write.op === "set") {
          mockDocs.set(write.path, {
            ...(write.options?.merge ? mockDocs.get(write.path) : {}),
            ...write.data,
          });
        }
      });
      mockWrites.length = 0;
    },
  }),
}));

import { decideLadderPlayoffTie, tallyLadderPlayoffTie } from "@shared";
import {
  MAESTRO_PO_DOUBLES_LADDER_ID,
  MAESTRO_PO_LADDER_ID,
  MAESTRO_PO_MANUAL_128_LADDER_ID,
} from "./seedLadderPlayoffs";
import { realWorldProblems } from "./realWorldChecks.helper";
import {
  JOURNEY_OUTCOME,
  JOURNEY_ROUND,
  JOURNEY_STAGE,
  seedLadderPlayoffJourney,
} from "./seedLadderPlayoffJourney";

const testUser = {
  userId: "test-user",
  firstName: "Test",
  lastName: "User",
  username: "tester",
  profileDetail: { XP: 100 },
};

const ties = () =>
  [...mockDocs]
    .filter(([path]) =>
      path.startsWith(`ladders/${MAESTRO_PO_LADDER_ID}/playoffTies/`),
    )
    .map(([, data]) => data);
const tie = (tieId) => ties().find((candidate) => candidate.tieId === tieId);
const legs = (tieId) =>
  [...mockDocs]
    .filter(([path]) =>
      path.startsWith(
        `ladders/${MAESTRO_PO_LADDER_ID}/ladderMatches/${tieId}-leg`,
      ),
    )
    .map(([, data]) => data)
    .sort((a, b) => a.playoffLeg - b.playoffLeg);

const seed = (args) => seedLadderPlayoffJourney({ testUser, ...args });
const sideOf = (userTie) =>
  userTie.side1.playerIds.includes("test-user") ? "team1" : "team2";
const pendingGames = (match) =>
  match.games.filter((game) => game.approvalStatus === "pending");

beforeEach(() => {
  mockWrites.length = 0;
  mockDocs.clear();
  mockUpdates.length = 0;
});

describe("seedLadderPlayoffJourney", () => {
  it("starts the first round with nothing arranged", async () => {
    const outcome = await seed({
      round: JOURNEY_ROUND.R16,
      stage: JOURNEY_STAGE.STARTED,
    });
    expect(tie(outcome.tieId)).toMatchObject({
      round: 1,
      status: "scheduled",
    });
    expect(legs(outcome.tieId)).toHaveLength(0);
  });

  it("points the promotion notification at the tie the user is in", async () => {
    const outcome = await seed({
      round: JOURNEY_ROUND.FINAL,
      stage: JOURNEY_STAGE.LEG2_FINISHING,
      outcome: JOURNEY_OUTCOME.WIN,
    });
    expect(outcome.tieId).toBe("r4-s0");
    expect(mockUpdates).toContainEqual({
      path: `users/test-user/notifications/maestro-po-promotion-${MAESTRO_PO_LADDER_ID}`,
      data: { "data.tieId": "r4-s0" },
    });
  });

  describe("a 128-player ladder carried to the Final", () => {
    const docsUnder = (prefix) =>
      [...mockDocs]
        .filter(([path]) => path.startsWith(prefix))
        .map(([, data]) => data);
    const manualTies = () =>
      docsUnder(`ladders/${MAESTRO_PO_MANUAL_128_LADDER_ID}/playoffTies/`);
    const manualMatches = () =>
      docsUnder(`ladders/${MAESTRO_PO_MANUAL_128_LADDER_ID}/ladderMatches/`);

    const seedManual = () =>
      seed({
        size: 128,
        round: JOURNEY_ROUND.LAST,
        stage: JOURNEY_STAGE.STARTED,
        daysIntoRound: 1,
        ladderId: MAESTRO_PO_MANUAL_128_LADDER_ID,
      });

    it("registers 128 players and an 8-player bracket with the Final open", async () => {
      const outcome = await seedManual();
      expect(outcome.tieId).toBe("r3-s0");
      expect(
        docsUnder(
          `ladders/${MAESTRO_PO_MANUAL_128_LADDER_ID}/ladderParticipants/`,
        ),
      ).toHaveLength(128);
      expect(manualTies().filter((t) => !t.isThirdPlacePlayoff)).toHaveLength(
        7,
      );
      const final = manualTies().find((t) => t.tieId === "r3-s0");
      expect(final).toMatchObject({ round: 3, status: "scheduled" });
      expect(
        final.side1.playerIds.concat(final.side2.playerIds),
      ).toContain("test-user");
    });

    it("has every quarter-final and semi-final played and decided", async () => {
      await seedManual();
      manualTies()
        .filter((t) => !t.isThirdPlacePlayoff && t.round < 3)
        .forEach((t) => expect(t.status).toBe("completed"));
      const thirdPlace = manualTies().find((t) => t.isThirdPlacePlayoff);
      expect(thirdPlace.status).toBe("scheduled");
    });

    it("matches what production would have", async () => {
      await seedManual();
      expect(
        realWorldProblems({ ties: manualTies(), matches: manualMatches() }),
      ).toEqual([]);
    });
  });

  it("carries the bracket to the quarter-final with the user through", async () => {
    const outcome = await seed({
      round: JOURNEY_ROUND.QUARTER,
      stage: JOURNEY_STAGE.LEG2_FINISHING,
      outcome: JOURNEY_OUTCOME.WIN,
    });
    expect(outcome.tieId).toBe("r2-s0");
    expect(tie("r2-s0")).toMatchObject({ round: 2, status: "scheduled" });
    ties()
      .filter((candidate) => candidate.round === 1)
      .forEach((candidate) => expect(candidate.status).toBe("completed"));
    const userTie = tie("r2-s0");
    expect(userTie.side1.playerIds.concat(userTie.side2.playerIds)).toContain(
      "test-user",
    );
  });

  it("leaves the last game of match 2 awaiting the user's approval", async () => {
    await seed({
      round: JOURNEY_ROUND.R16,
      stage: JOURNEY_STAGE.LEG2_FINISHING,
      outcome: JOURNEY_OUTCOME.WIN,
    });
    const [first, second] = legs("r1-s1");
    expect(first.matchStatus).toBe("completed");
    expect(second.matchStatus).toBe("accepted");
    const [pending] = pendingGames(second);
    expect(pending.reporter).not.toBe("test-user");
    expect(pendingGames(second)).toHaveLength(1);
    const userTie = tie("r1-s1");
    expect(decideLadderPlayoffTie(userTie, [first, second]).decided).toBe(
      false,
    );
  });

  it("levels the aggregate when the last game is approved", async () => {
    await seed({
      round: JOURNEY_ROUND.R16,
      stage: JOURNEY_STAGE.LEG2_FINISHING,
      outcome: JOURNEY_OUTCOME.LEVEL,
    });
    const userTie = tie("r1-s1");
    const [first, second] = legs("r1-s1");
    const approved = {
      ...second,
      games: second.games.map((game) => ({
        ...game,
        approvalStatus: game.result ? "approved" : game.approvalStatus,
      })),
    };
    const tally = tallyLadderPlayoffTie(userTie, [first, approved]);
    expect(tally.team1Games).toBe(tally.team2Games);
  });

  it("creates the decider with its single game awaiting approval", async () => {
    await seed({
      round: JOURNEY_ROUND.R16,
      stage: JOURNEY_STAGE.DECIDER_FINISHING,
      outcome: JOURNEY_OUTCOME.WIN,
    });
    const all = legs("r1-s1");
    expect(all.map((leg) => leg.playoffLeg)).toEqual([1, 2, 3]);
    expect(tie("r1-s1").deciderRequired).toBe(true);
    expect(all[2]).toMatchObject({ bestOf: 1, matchStatus: "accepted" });
    expect(pendingGames(all[2])).toHaveLength(1);
  });

  it("puts the user in the 3rd-place tie after losing the semi-final", async () => {
    const outcome = await seed({
      round: JOURNEY_ROUND.THIRD_PLACE,
      stage: JOURNEY_STAGE.LEG2_FINISHING,
      outcome: JOURNEY_OUTCOME.WIN,
    });
    const third = tie(outcome.tieId);
    expect(third).toMatchObject({
      isThirdPlacePlayoff: true,
      status: "scheduled",
    });
    const semi = tie("r3-s0");
    expect(semi.status).toBe("completed");
    expect(semi.winner).not.toBe(sideOf(semi));
  });

  it("leaves the 3rd-place tie open beside the user's Final", async () => {
    const outcome = await seed({
      round: JOURNEY_ROUND.FINAL,
      stage: JOURNEY_STAGE.LEG2_FINISHING,
      outcome: JOURNEY_OUTCOME.LOSS,
    });
    expect(outcome.tieId).toBe("r4-s0");
    const third = ties().find((candidate) => candidate.isThirdPlacePlayoff);
    expect(third.status).toBe("scheduled");
    expect(third.side1.playerIds.concat(third.side2.playerIds)).not.toContain(
      "test-user",
    );
  });

  it("keeps the seed under the playoffs ladder id", async () => {
    await seed({
      round: JOURNEY_ROUND.SEMI,
      stage: JOURNEY_STAGE.LEG1_FINISHING,
    });
    [...mockDocs.keys()]
      .filter((path) => path.startsWith("ladders/"))
      .forEach((path) =>
        expect(path.startsWith(`ladders/${MAESTRO_PO_LADDER_ID}`)).toBe(true),
      );
  });

  describe("matches what production would have", () => {
    const allMatches = () =>
      [...mockDocs]
        .filter(([path]) =>
          path.startsWith(`ladders/${MAESTRO_PO_LADDER_ID}/ladderMatches/`),
        )
        .map(([, data]) => data);

    [
      [JOURNEY_ROUND.R16, JOURNEY_STAGE.LEG1_FINISHING, JOURNEY_OUTCOME.WIN],
      [JOURNEY_ROUND.R16, JOURNEY_STAGE.LEG2_FINISHING, JOURNEY_OUTCOME.LEVEL],
      [JOURNEY_ROUND.R16, JOURNEY_STAGE.DECIDER_FINISHING, JOURNEY_OUTCOME.WIN],
      [
        JOURNEY_ROUND.QUARTER,
        JOURNEY_STAGE.LEG2_FINISHING,
        JOURNEY_OUTCOME.WIN,
      ],
      [JOURNEY_ROUND.SEMI, JOURNEY_STAGE.LEG2_FINISHING, JOURNEY_OUTCOME.LOSS],
      [JOURNEY_ROUND.FINAL, JOURNEY_STAGE.LEG2_FINISHING, JOURNEY_OUTCOME.WIN],
      [
        JOURNEY_ROUND.THIRD_PLACE,
        JOURNEY_STAGE.LEG2_FINISHING,
        JOURNEY_OUTCOME.LOSS,
      ],
    ].forEach(([round, stage, outcome]) => {
      it(`${round} ${stage} ${outcome}`, async () => {
        await seed({ round, stage, outcome });
        expect(
          realWorldProblems({ ties: ties(), matches: allMatches() }),
        ).toEqual([]);
      });
    });
  });

  describe("doubles", () => {
    const doublesMatches = () =>
      [...mockDocs]
        .filter(([path]) =>
          path.startsWith(
            `ladders/${MAESTRO_PO_DOUBLES_LADDER_ID}/ladderMatches/`,
          ),
        )
        .map(([, data]) => data);
    const doublesTies = () =>
      [...mockDocs]
        .filter(([path]) =>
          path.startsWith(
            `ladders/${MAESTRO_PO_DOUBLES_LADDER_ID}/playoffTies/`,
          ),
        )
        .map(([, data]) => data);

    it("seeds pairs: four participants, both teams, everyone checked in", async () => {
      const outcome = await seed({
        doubles: true,
        round: JOURNEY_ROUND.R16,
        stage: JOURNEY_STAGE.LEG2_FINISHING,
        outcome: JOURNEY_OUTCOME.WIN,
      });
      expect(outcome.ladderId).toBe(MAESTRO_PO_DOUBLES_LADDER_ID);
      const live = doublesMatches().find(
        (match) => match.ladderMatchId === `${outcome.tieId}-leg2`,
      );
      expect(live.ladderType).toBe("Doubles");
      expect(live.participants).toHaveLength(4);
      expect(live.teams.map((team) => team.playerIds.length)).toEqual([2, 2]);
      expect([...live.checkIn.checkedInBy].sort()).toEqual(
        [...live.participants].sort(),
      );
      expect(
        realWorldProblems({ ties: doublesTies(), matches: doublesMatches() }),
      ).toEqual([]);
    });

    it("has the opponent's player report the last game for the user to approve", async () => {
      const outcome = await seed({
        doubles: true,
        stage: JOURNEY_STAGE.LEG1_FINISHING,
      });
      const [leg1] = doublesMatches().filter(
        (match) => match.playoffTieId === outcome.tieId,
      );
      const [pending] = leg1.games.filter(
        (game) => game.approvalStatus === "pending",
      );
      expect(leg1.participants).toContain(pending.reporter);
      expect(pending.reporter).not.toBe("test-user");
      expect(
        leg1.teams.find((team) => team.playerIds.includes("test-user"))
          .playerIds,
      ).not.toContain(pending.reporter);
    });

    it("has the user's partner report a game the user cannot approve", async () => {
      const outcome = await seed({
        doubles: true,
        stage: JOURNEY_STAGE.PARTNER_REPORTED,
      });
      const [leg1] = doublesMatches().filter(
        (match) => match.playoffTieId === outcome.tieId,
      );
      const [pending] = leg1.games.filter(
        (game) => game.approvalStatus === "pending",
      );
      const userTeam = leg1.teams.find((team) =>
        team.playerIds.includes("test-user"),
      );
      expect(userTeam.playerIds).toContain(pending.reporter);
      expect(pending.reporter).not.toBe("test-user");
    });

    it.each([
      [JOURNEY_ROUND.R16, JOURNEY_STAGE.DECIDER_FINISHING, JOURNEY_OUTCOME.WIN],
      [JOURNEY_ROUND.SEMI, JOURNEY_STAGE.LEG2_FINISHING, JOURNEY_OUTCOME.LOSS],
      [JOURNEY_ROUND.FINAL, JOURNEY_STAGE.LEG2_FINISHING, JOURNEY_OUTCOME.WIN],
      [
        JOURNEY_ROUND.THIRD_PLACE,
        JOURNEY_STAGE.LEG2_FINISHING,
        JOURNEY_OUTCOME.LOSS,
      ],
    ])(
      "matches what production would have (%s %s %s)",
      async (round, stage, outcome) => {
        await seed({ doubles: true, round, stage, outcome });
        expect(
          realWorldProblems({ ties: doublesTies(), matches: doublesMatches() }),
        ).toEqual([]);
      },
    );
  });
});
