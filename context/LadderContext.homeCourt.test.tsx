import { useContext } from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { LADDER_TYPE } from "@shared";
import type { Court } from "@shared/types";

jest.mock("../services/firebase.config", () => ({ db: {} }));

const mockRunTransaction = jest.fn();
const mockGetDocs = jest.fn();
const mockOnSnapshot = jest.fn();
jest.mock("firebase/firestore", () => ({
  arrayUnion: jest.fn(),
  collection: jest.fn((_db, ...path: string[]) => ({ __col: path.join("/") })),
  deleteDoc: jest.fn(),
  doc: jest.fn((_db, ...path: string[]) => ({ path: path.join("/") })),
  getDoc: jest.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  increment: jest.fn(),
  limit: jest.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  orderBy: jest.fn(),
  query: jest.fn((...args: unknown[]) => ({ __query: args })),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
  writeBatch: jest.fn(),
}));

import LadderProvider, { LadderContext } from "./LadderContext";

const LADDER = "L1";
const USER = "me";
const LADDER_PATH = `ladders/${LADDER}`;
const PARTICIPANT_PATH = `ladders/${LADDER}/ladderParticipants/${USER}`;
const TEAM_PATH = `ladders/${LADDER}/ladderTeams/me_pt`;
const courtPath = (id: string) => `courts/${id}`;

const location = {
  city: "London",
  country: "United Kingdom",
  countryCode: "GB",
  postCode: "E1 1AA",
  address: "1 High St",
  latitude: 51.5,
  longitude: -0.12,
};

const courtDocument = (
  name: string,
  overrides: Record<string, unknown> = {},
) => ({
  courtName: ` ${name} `,
  location,
  verified: true,
  submittedBy: "admin",
  ...overrides,
});

const courtArg = (courtId: string) => ({ courtId }) as unknown as Court;

const makeStore = (initial: Record<string, unknown>) => {
  const store: Record<string, unknown> = { ...initial };
  const tx = {
    get: jest.fn(async (ref: { path: string }) => ({
      id: ref.path.split("/").pop(),
      exists: () => store[ref.path] !== undefined,
      data: () => store[ref.path],
    })),
    update: jest.fn((ref: { path: string }, data: object) => {
      store[ref.path] = { ...(store[ref.path] as object), ...data };
    }),
    set: jest.fn(),
  };
  mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
  return { store, tx };
};

const baseStore = (entrant: Record<string, unknown> = {}) => ({
  [LADDER_PATH]: { courtIds: ["courtB", "courtD"] },
  [PARTICIPANT_PATH]: { userId: USER, ...entrant },
  [courtPath("courtB")]: courtDocument("Court B"),
  [courtPath("courtD")]: courtDocument("Court D"),
  [courtPath("courtG")]: courtDocument("Court G", { verified: false }),
  [courtPath("courtH")]: courtDocument("Court H"),
});

const renderLadder = async () => {
  const hook = renderHook(() => useContext(LadderContext), {
    wrapper: LadderProvider,
  });
  await waitFor(() =>
    expect(hook.result.current.upcomingLaddersLoading).toBe(false),
  );
  return hook.result;
};

type Rendered = Awaited<ReturnType<typeof renderLadder>>;

const setHomeCourt = (
  result: Rendered,
  courtId: string,
  ladderType: string = LADDER_TYPE.SINGLES,
) =>
  result.current.setLadderHomeCourt({
    ladder: { ladderId: LADDER, ladderType } as never,
    userId: USER,
    court: courtArg(courtId),
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDocs.mockResolvedValue({ docs: [] });
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("setLadderHomeCourt", () => {
  it("saves a verified ladder court and records the first set without using the change", async () => {
    const { store } = makeStore(baseStore());
    const result = await renderLadder();

    expect(await setHomeCourt(result, "courtB")).toEqual({ success: true });

    expect(store[PARTICIPANT_PATH]).toMatchObject({
      homeCourt: {
        courtId: "courtB",
        courtName: "Court B",
        location: { city: "London", countryCode: "GB", latitude: 51.5 },
      },
      homeCourtChanges: 0,
      homeCourtUpdatedBy: USER,
    });
  });

  it("allows exactly one change and then refuses with change_limit", async () => {
    const { store } = makeStore(baseStore());
    const result = await renderLadder();

    await setHomeCourt(result, "courtB");
    expect(await setHomeCourt(result, "courtD")).toEqual({ success: true });
    expect(store[PARTICIPANT_PATH]).toMatchObject({
      homeCourt: { courtId: "courtD" },
      homeCourtChanges: 1,
    });

    const refused = await setHomeCourt(result, "courtB");
    expect(refused).toEqual({ success: false, reason: "change_limit" });
    expect(store[PARTICIPANT_PATH]).toMatchObject({
      homeCourt: { courtId: "courtD" },
      homeCourtChanges: 1,
    });
  });

  it("refuses a change when the change was already used", async () => {
    const { tx } = makeStore(
      baseStore({
        homeCourt: { courtId: "courtD", courtName: "Court D", location },
        homeCourtChanges: 1,
      }),
    );
    const result = await renderLadder();

    expect(await setHomeCourt(result, "courtB")).toEqual({
      success: false,
      reason: "change_limit",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("writes a doubles home court to the team document", async () => {
    const { store } = makeStore({
      ...baseStore(),
      [TEAM_PATH]: { teamKey: "me_pt", playerIds: [USER, "pt"] },
    });
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ ref: { path: TEAM_PATH } }],
    });
    const result = await renderLadder();

    expect(await setHomeCourt(result, "courtB", LADDER_TYPE.DOUBLES)).toEqual({
      success: true,
    });

    expect(store[TEAM_PATH]).toMatchObject({
      homeCourt: { courtId: "courtB" },
      homeCourtChanges: 0,
    });
    expect(store[PARTICIPANT_PATH]).not.toHaveProperty("homeCourt");
  });

  it("shares the single change across the team", async () => {
    const { store } = makeStore({
      ...baseStore(),
      [TEAM_PATH]: {
        teamKey: "me_pt",
        playerIds: [USER, "pt"],
        homeCourt: { courtId: "courtB", courtName: "Court B", location },
        homeCourtChanges: 1,
        homeCourtUpdatedBy: "pt",
      },
    });
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ ref: { path: TEAM_PATH } }],
    });
    const result = await renderLadder();

    expect(await setHomeCourt(result, "courtD", LADDER_TYPE.DOUBLES)).toEqual({
      success: false,
      reason: "change_limit",
    });
    expect(store[TEAM_PATH]).toMatchObject({
      homeCourt: { courtId: "courtB" },
      homeCourtChanges: 1,
    });
  });

  it.each([
    ["an unverified court", "courtG"],
    ["a verified court outside the ladder", "courtH"],
    ["a court that does not exist", "courtMissing"],
  ])("refuses %s with invalid_court and writes nothing", async (_label, id) => {
    const { tx } = makeStore(baseStore());
    const result = await renderLadder();

    expect(await setHomeCourt(result, id)).toEqual({
      success: false,
      reason: "invalid_court",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("refuses every court when the ladder document is missing", async () => {
    const initial = baseStore() as Record<string, unknown>;
    delete initial[LADDER_PATH];
    const { tx } = makeStore(initial);
    const result = await renderLadder();

    expect(await setHomeCourt(result, "courtB")).toEqual({
      success: false,
      reason: "invalid_court",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("returns error for missing identifiers without opening a transaction", async () => {
    makeStore(baseStore());
    const result = await renderLadder();
    mockRunTransaction.mockClear();

    expect(await setHomeCourt(result, "")).toEqual({
      success: false,
      reason: "error",
    });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("returns error when the transaction fails unexpectedly", async () => {
    makeStore(baseStore());
    mockRunTransaction.mockRejectedValue(new Error("network"));
    const result = await renderLadder();

    expect(await setHomeCourt(result, "courtB")).toEqual({
      success: false,
      reason: "error",
    });
  });
});

describe("subscribeToLadderHomeCourt", () => {
  const subscribe = (
    result: Rendered,
    ladderType: string,
    onUpdate: jest.Mock,
  ) =>
    result.current.subscribeToLadderHomeCourt(
      { ladderId: LADDER, ladderType } as never,
      USER,
      onUpdate,
    );

  it("reports the singles entrant's home court and change count", async () => {
    mockOnSnapshot.mockImplementation((_ref, next) => {
      next({
        exists: () => true,
        data: () => ({
          homeCourt: { courtId: "courtB" },
          homeCourtChanges: 1,
        }),
      });
      return jest.fn();
    });
    const result = await renderLadder();
    const onUpdate = jest.fn();

    subscribe(result, LADDER_TYPE.SINGLES, onUpdate);

    expect(onUpdate).toHaveBeenCalledWith({
      homeCourt: { courtId: "courtB" },
      homeCourtChanges: 1,
    });
  });

  it("reports null when the singles entrant document does not exist", async () => {
    mockOnSnapshot.mockImplementation((_ref, next) => {
      next({ exists: () => false });
      return jest.fn();
    });
    const result = await renderLadder();
    const onUpdate = jest.fn();

    subscribe(result, LADDER_TYPE.SINGLES, onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(null);
  });

  it("reads the team document for doubles and defaults a missing home court", async () => {
    mockOnSnapshot.mockImplementation((_query, next) => {
      next({ empty: false, docs: [{ data: () => ({}) }] });
      return jest.fn();
    });
    const result = await renderLadder();
    const onUpdate = jest.fn();

    subscribe(result, LADDER_TYPE.DOUBLES, onUpdate);

    expect(onUpdate).toHaveBeenCalledWith({
      homeCourt: null,
      homeCourtChanges: 0,
    });
  });

  it("reports null for a doubles player with no team", async () => {
    mockOnSnapshot.mockImplementation((_query, next) => {
      next({ empty: true, docs: [] });
      return jest.fn();
    });
    const result = await renderLadder();
    const onUpdate = jest.fn();

    subscribe(result, LADDER_TYPE.DOUBLES, onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(null);
  });
});

describe("fetchLadderTeamMemberIds", () => {
  const fetchMembers = (result: Rendered) =>
    result.current.fetchLadderTeamMemberIds(LADDER, USER);

  it("returns both players of the user's team", async () => {
    makeStore(baseStore());
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ playerIds: [USER, "pt"] }) }],
    });
    const result = await renderLadder();

    expect(await fetchMembers(result)).toEqual([USER, "pt"]);
  });

  it("returns just the user when they are on no team", async () => {
    makeStore(baseStore());
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    const result = await renderLadder();

    expect(await fetchMembers(result)).toEqual([USER]);
  });

  it("returns just the user when the lookup fails", async () => {
    makeStore(baseStore());
    const result = await renderLadder();
    mockGetDocs.mockRejectedValue(new Error("offline"));

    expect(await fetchMembers(result)).toEqual([USER]);
  });

  it("returns nothing without identifiers", async () => {
    makeStore(baseStore());
    const result = await renderLadder();

    expect(await result.current.fetchLadderTeamMemberIds("", USER)).toEqual([]);
  });
});
