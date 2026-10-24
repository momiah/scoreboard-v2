import {
  DISPUTE_STAGE,
  DISPUTE_RESOLUTION,
  DISPUTE_SYSTEM_ACTOR,
} from "courtchamps-shared/types";

const mockFirestore = jest.fn();
jest.mock("firebase-admin", () => ({
  firestore: (...args: unknown[]) => mockFirestore(...args),
}));

const mockSendNotification = jest.fn();
jest.mock("./helpers/sendNotification", () => ({
  sendNotification: (...args: unknown[]) => mockSendNotification(...args),
}));

const mockPlanDisputeResolution = jest.fn();
jest.mock("courtchamps-shared/helpers", () => ({
  ...jest.requireActual("courtchamps-shared/helpers"),
  planDisputeResolution: (...args: unknown[]) =>
    mockPlanDisputeResolution(...args),
  getDisputePlayerIds: () => [],
  isDoublesDispute: () => false,
}));

import { runAutoVoidLadderDisputes } from "./autoVoidLadderDisputes";

const snapOf = <T>(exists: boolean, data: T) => ({ exists, data: () => data });

const queryDocOf = (data: Record<string, unknown>) => ({
  data: () => data,
  ref: { __disputeRef: data.disputeId },
  id: data.disputeId,
});

const makeMatch = () => ({
  ladderMatchId: "m1",
  games: [],
  teams: [],
  participants: ["p1", "p2"],
});

const baseDispute = (overrides: Record<string, unknown> = {}) => ({
  disputeId: "d1",
  ladderId: "L1",
  ladderName: "Test Ladder",
  ladderMatchId: "m1",
  gameId: "g1",
  originalGame: {},
  participantIds: ["p1", "p2"],
  stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
  events: [],
  ...overrides,
});

const resolvedPlan = () => ({
  participants: [],
  users: [],
  teams: [],
  matchUpdate: { games: [] },
  disputeUpdate: { stage: DISPUTE_STAGE.RESOLVED },
});

const makeTx = (getResults: Array<ReturnType<typeof snapOf>>) => {
  const get = jest.fn();
  getResults.forEach((r) => get.mockResolvedValueOnce(r));
  return { get, set: jest.fn(), update: jest.fn() };
};

const refChain = (): Record<string, unknown> => {
  const node: Record<string, unknown> = {};
  node.collection = jest.fn(() => refChain());
  node.doc = jest.fn(() => refChain());
  return node;
};

const mockRunTransaction = jest.fn();

const makeDb = (disputeQueryDocs: unknown[]) => {
  const disputesQueryGet = jest
    .fn()
    .mockResolvedValue({ docs: disputeQueryDocs });
  const disputesCollection = { where: jest.fn(() => ({ get: disputesQueryGet })) };

  return {
    collection: jest.fn((name: string) =>
      name === "disputes" ? disputesCollection : refChain(),
    ),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("runAutoVoidLadderDisputes", () => {
  it("does nothing when no dispute's evidence deadline has passed", async () => {
    const notDue = baseDispute({ evidenceDueAt: new Date(Date.now() + 60_000) });
    mockFirestore.mockReturnValue(makeDb([queryDocOf(notDue)]));

    await runAutoVoidLadderDisputes();

    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("only voids disputes whose evidence deadline has actually passed", async () => {
    const overdue = baseDispute({
      disputeId: "d-overdue",
      evidenceDueAt: new Date(Date.now() - 60_000),
    });
    const notYetDue = baseDispute({
      disputeId: "d-not-due",
      evidenceDueAt: new Date(Date.now() + 60_000),
    });
    mockFirestore.mockReturnValue(
      makeDb([queryDocOf(overdue), queryDocOf(notYetDue)]),
    );
    const tx = makeTx([snapOf(true, overdue), snapOf(true, makeMatch())]);
    mockRunTransaction.mockImplementation(async (fn) => fn(tx));
    mockPlanDisputeResolution.mockResolvedValueOnce(resolvedPlan());

    await runAutoVoidLadderDisputes();

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockPlanDisputeResolution).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: DISPUTE_RESOLUTION.VOID,
        actorId: DISPUTE_SYSTEM_ACTOR,
      }),
    );
  });

  it("writes the VOID plan and notifies every participant", async () => {
    const overdue = baseDispute({
      evidenceDueAt: new Date(Date.now() - 60_000),
      participantIds: ["p1", "p2"],
    });
    mockFirestore.mockReturnValue(makeDb([queryDocOf(overdue)]));
    const tx = makeTx([snapOf(true, overdue), snapOf(true, makeMatch())]);
    mockRunTransaction.mockImplementation(async (fn) => fn(tx));
    mockPlanDisputeResolution.mockResolvedValueOnce(resolvedPlan());

    await runAutoVoidLadderDisputes();

    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    const [notification] = mockSendNotification.mock.calls[0];
    expect(notification.recipientId).toBe("p1");
    expect(notification.senderId).toBe(DISPUTE_SYSTEM_ACTOR);
    expect(notification.message).toMatch(/voided/i);
  });

  it("continues past a dispute whose match is missing and still processes the rest", async () => {
    const bad = baseDispute({
      disputeId: "d-bad",
      evidenceDueAt: new Date(Date.now() - 60_000),
    });
    const good = baseDispute({
      disputeId: "d-good",
      participantIds: ["p1"],
      evidenceDueAt: new Date(Date.now() - 60_000),
    });
    mockFirestore.mockReturnValue(makeDb([queryDocOf(bad), queryDocOf(good)]));
    mockRunTransaction
      .mockImplementationOnce(async (fn) =>
        fn(makeTx([snapOf(true, bad), snapOf(false, undefined)])),
      )
      .mockImplementationOnce(async (fn) =>
        fn(makeTx([snapOf(true, good), snapOf(true, makeMatch())])),
      );

    mockPlanDisputeResolution.mockResolvedValueOnce(resolvedPlan());

    await runAutoVoidLadderDisputes();

    expect(mockRunTransaction).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const [notification] = mockSendNotification.mock.calls[0];
    expect(notification.data.disputeId).toBe("d-good");
  });
});
