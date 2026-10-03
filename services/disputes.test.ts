import {
  DISPUTE_STAGE,
  DISPUTE_EVENT_TYPE,
  DISPUTE_RESOLUTION,
} from "@shared/types";
import type { Player } from "@shared/types";

jest.mock("./firebase.config", () => ({ db: {} }));

const mockGetDocs = jest.fn();
const mockRunTransaction = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((_db, ...path) => ({ __col: path.join("/") })),
  doc: jest.fn((...args) => ({
    __ref: args,
    id: args.length <= 1 ? "generated-id" : String(args[args.length - 1]),
  })),
  getDoc: jest.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: jest.fn(),
  query: jest.fn((...args) => ({ __query: args })),
  where: jest.fn((...args) => ({ __where: args })),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
}));

const mockPlanDisputeResolution = jest.fn();
jest.mock("@shared/helpers", () => ({
  ...jest.requireActual("@shared/helpers"),
  planDisputeResolution: (...args: unknown[]) =>
    mockPlanDisputeResolution(...args),
  getDisputePlayerIds: () => [],
  isDoublesDispute: () => false,
}));

import {
  createDispute,
  addDisputeEvidence,
  cancelDispute,
  approveDisputedScore,
  type CreateDisputeInput,
} from "./disputes";

const snapOf = <T>(exists: boolean, data: T) => ({
  exists: () => exists,
  data: () => data,
});
const docsSnap = (docs: unknown[]) => ({ docs });

const baseGame = {
  gameId: "g1",
  reporter: "reporter",
  approvalStatus: "pending",
  team1: { player1: { userId: "opener" }, player2: null },
  team2: { player1: { userId: "reporter" }, player2: null },
};

const makeMatch = (games = [baseGame, { gameId: "g2" }]) => ({
  ladderMatchId: "m1",
  games,
  teams: [],
  participants: ["opener", "reporter"],
});

const validCreateInput = (
  overrides: Partial<CreateDisputeInput> = {},
): CreateDisputeInput => ({
  ladderId: "L1",
  ladderType: "Singles" as CreateDisputeInput["ladderType"],
  ladderMatchId: "m1",
  gameId: "g1",
  originalGame: baseGame as unknown as CreateDisputeInput["originalGame"],
  disputedGame: {
    ...baseGame,
    team1: { player1: { userId: "opener", score: 21 }, player2: null },
  } as unknown as CreateDisputeInput["disputedGame"],
  openedBy: "opener",
  participantIds: ["opener", "reporter"],
  evidence: { note: "The score was wrong, I won 21-19." },
  ...overrides,
});

const makeTx = (getResults: Array<ReturnType<typeof snapOf>>) => {
  const get = jest.fn();
  getResults.forEach((r) => get.mockResolvedValueOnce(r));
  return { get, set: jest.fn(), update: jest.fn() };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createDispute", () => {
  it("rejects evidence that is neither a note nor a video", async () => {
    const result = await createDispute(validCreateInput({ evidence: {} }));
    expect(result).toEqual({ success: false, reason: "invalid" });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it.each(["reporter", "mate"])(
    "refuses a dispute opened by %s on the reporting side",
    async (openedBy) => {
      const doublesGame = {
        ...baseGame,
        team2: {
          player1: { userId: "reporter" },
          player2: { userId: "mate" },
        },
      };
      const result = await createDispute(
        validCreateInput({
          openedBy,
          originalGame:
            doublesGame as unknown as CreateDisputeInput["originalGame"],
        }),
      );
      expect(result).toEqual({ success: false, reason: "not_opponent" });
      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(mockRunTransaction).not.toHaveBeenCalled();
    },
  );

  it("refuses a dispute opened by someone outside the game", async () => {
    const result = await createDispute(
      validCreateInput({ openedBy: "stranger" }),
    );
    expect(result).toEqual({ success: false, reason: "not_opponent" });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("refuses when an active dispute already exists for the game", async () => {
    mockGetDocs.mockResolvedValueOnce(
      docsSnap([snapOf(true, { stage: DISPUTE_STAGE.UNDER_REVIEW })]),
    );
    const result = await createDispute(validCreateInput());
    expect(result).toEqual({ success: false, reason: "exists" });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("allows a new dispute when only a RESOLVED one exists for the game", async () => {
    mockGetDocs.mockResolvedValueOnce(
      docsSnap([snapOf(true, { stage: DISPUTE_STAGE.RESOLVED })]),
    );
    const tx = makeTx([snapOf(true, makeMatch())]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));

    const result = await createDispute(validCreateInput());
    expect(result.success).toBe(true);
  });

  it("opens the dispute UNDER_REVIEW and flags the game as disputed", async () => {
    mockGetDocs.mockResolvedValueOnce(docsSnap([]));
    const tx = makeTx([snapOf(true, makeMatch())]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));

    const result = await createDispute(validCreateInput());

    expect(result.success).toBe(true);
    const [, dispute] = tx.set.mock.calls[0];
    expect(dispute.stage).toBe(DISPUTE_STAGE.UNDER_REVIEW);
    expect(dispute.openedBy).toBe("opener");
    expect(dispute.events[0].type).toBe(DISPUTE_EVENT_TYPE.OPENED);
    const [, matchUpdate] = tx.update.mock.calls[0];
    expect(matchUpdate.games[0].approvalStatus).toBe("disputed");
    expect(matchUpdate.games[1].approvalStatus).toBeUndefined();
  });

  it("returns invalid without touching the match when the game shell is missing", async () => {
    mockGetDocs.mockResolvedValueOnce(docsSnap([]));
    const tx = makeTx([snapOf(true, makeMatch([{ gameId: "other" }]))]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));

    const result = await createDispute(validCreateInput());
    expect(result.success).toBe(true);
    expect(tx.update).not.toHaveBeenCalled();
  });
});

describe("addDisputeEvidence", () => {
  const activeDispute = {
    stage: DISPUTE_STAGE.UNDER_REVIEW,
    participantIds: ["opener", "reporter"],
    events: [{ type: DISPUTE_EVENT_TYPE.OPENED, createdBy: "opener" }],
  };

  it("rejects empty evidence before opening a transaction", async () => {
    const result = await addDisputeEvidence("d1", "reporter", {});
    expect(result).toEqual({ success: false, reason: "invalid" });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("refuses evidence once the dispute is resolved", async () => {
    const tx = makeTx([
      snapOf(true, { ...activeDispute, stage: DISPUTE_STAGE.RESOLVED }),
    ]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    const result = await addDisputeEvidence("d1", "reporter", {
      note: "more info",
    });
    expect(result).toEqual({ success: false, reason: "resolved" });
  });

  it("refuses evidence from a non-participant", async () => {
    const tx = makeTx([snapOf(true, activeDispute)]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    const result = await addDisputeEvidence("d1", "stranger", {
      note: "let me in",
    });
    expect(result).toEqual({ success: false, reason: "invalid" });
  });

  it("enforces one video per round per player", async () => {
    const tx = makeTx([
      snapOf(true, {
        ...activeDispute,
        events: [
          { type: DISPUTE_EVENT_TYPE.OPENED, createdBy: "opener" },
          {
            type: DISPUTE_EVENT_TYPE.EVIDENCE_SUBMITTED,
            createdBy: "reporter",
            videoId: "v1",
          },
        ],
      }),
    ]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    const result = await addDisputeEvidence("d1", "reporter", {
      videoId: "v2",
      courtPositions: {
        team1: [{ userId: "reporter" } as Player],
        team2: [null],
      },
    });
    expect(result).toEqual({ success: false, reason: "video_limit" });
  });

  it("appends a note submission and keeps the dispute under review", async () => {
    const tx = makeTx([snapOf(true, activeDispute)]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    const result = await addDisputeEvidence("d1", "reporter", {
      note: "Here is what happened",
    });
    expect(result).toEqual({ success: true });
    const [, update] = tx.update.mock.calls[0];
    expect(update.stage).toBe(DISPUTE_STAGE.UNDER_REVIEW);
    expect(update.evidenceDueAt).toBeNull();
    expect(update.events).toHaveLength(2);
    expect(update.events[1].type).toBe(DISPUTE_EVENT_TYPE.NOTES_SUBMITTED);
    expect(update.events[1].createdBy).toBe("reporter");
  });
});

describe("cancelDispute", () => {
  const dispute = {
    disputeId: "d1",
    ladderId: "L1",
    ladderMatchId: "m1",
    openedBy: "opener",
    stage: DISPUTE_STAGE.UNDER_REVIEW,
    originalGame: baseGame,
  };

  it("refuses when the caller is not the opener", async () => {
    const tx = makeTx([snapOf(true, dispute)]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    const result = await cancelDispute("d1", "reporter");
    expect(result).toEqual({ success: false, reason: "not_opener" });
  });

  it("refuses when the dispute is already resolved", async () => {
    const tx = makeTx([
      snapOf(true, { ...dispute, stage: DISPUTE_STAGE.RESOLVED }),
    ]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    const result = await cancelDispute("d1", "opener");
    expect(result).toEqual({ success: false, reason: "resolved" });
  });

  it("withdraws via the CANCELLED resolution plan and writes it", async () => {
    const tx = makeTx([snapOf(true, dispute), snapOf(true, makeMatch())]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    mockPlanDisputeResolution.mockResolvedValueOnce({
      participants: [],
      users: [],
      teams: [],
      matchUpdate: { games: [] },
      disputeUpdate: { stage: DISPUTE_STAGE.RESOLVED },
    });

    const result = await cancelDispute("d1", "opener");

    expect(result).toEqual({ success: true });
    expect(mockPlanDisputeResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: DISPUTE_RESOLUTION.CANCELLED,
        actorId: "opener",
      }),
    );
    expect(tx.update).toHaveBeenCalledTimes(2);
  });
});

describe("approveDisputedScore", () => {
  const reporterGame = {
    ...baseGame,
    reporter: "reporter",
    team2: { player1: { userId: "reporter" }, player2: { userId: "mate" } },
  };
  const dispute = {
    disputeId: "d1",
    ladderId: "L1",
    ladderMatchId: "m1",
    openedBy: "opener",
    stage: DISPUTE_STAGE.UNDER_REVIEW,
    originalGame: reporterGame,
  };
  const plan = {
    participants: [],
    users: [],
    teams: [],
    matchUpdate: { games: [] },
    disputeUpdate: { stage: DISPUTE_STAGE.RESOLVED },
  };

  it("refuses the disputing side", async () => {
    const tx = makeTx([snapOf(true, dispute)]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    expect(await approveDisputedScore("d1", "opener")).toEqual({
      success: false,
      reason: "not_reporter_side",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("refuses someone who is not in the game", async () => {
    const tx = makeTx([snapOf(true, dispute)]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    expect(await approveDisputedScore("d1", "stranger")).toEqual({
      success: false,
      reason: "not_reporter_side",
    });
  });

  it("refuses once the dispute is resolved", async () => {
    const tx = makeTx([
      snapOf(true, { ...dispute, stage: DISPUTE_STAGE.RESOLVED }),
    ]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    expect(await approveDisputedScore("d1", "reporter")).toEqual({
      success: false,
      reason: "resolved",
    });
  });

  it("returns an error for a missing dispute or missing identifiers", async () => {
    const tx = makeTx([snapOf(false, undefined)]);
    mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
    expect(await approveDisputedScore("d1", "reporter")).toEqual({
      success: false,
      reason: "error",
    });
    expect(await approveDisputedScore("", "reporter")).toEqual({
      success: false,
      reason: "error",
    });
  });

  it.each(["reporter", "mate"])(
    "upholds the corrected score for reporter-side player %s without an admin",
    async (userId) => {
      const tx = makeTx([snapOf(true, dispute), snapOf(true, makeMatch())]);
      mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
      mockPlanDisputeResolution.mockResolvedValueOnce(plan);

      expect(await approveDisputedScore("d1", userId)).toEqual({
        success: true,
      });
      expect(mockPlanDisputeResolution).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: DISPUTE_RESOLUTION.UPHELD,
          actorId: userId,
        }),
      );
      expect(tx.update).toHaveBeenCalledTimes(2);
    },
  );
});
