const mockWrites = [];
const mockDocs = new Map();

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
  updateDoc: async () => {},
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
import { MAESTRO_PO_LADDER_ID } from "./seedLadderPlayoffs";
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
    expect(
      third.side1.playerIds.concat(third.side2.playerIds),
    ).not.toContain("test-user");
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
});
