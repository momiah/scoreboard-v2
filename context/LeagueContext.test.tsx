import { useContext, type ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { notificationTypes } from "@shared";
import type { Game } from "@shared/types";

jest.mock("../services/firebase.config", () => ({ db: {} }));
jest.mock("react-native-fbsdk-next", () => ({
  AppEventsLogger: { logEvent: jest.fn() },
}));

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockRunTransaction = jest.fn();
jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, ...path: string[]) => ({ path: path.join("/") })),
  setDoc: jest.fn(),
  collection: jest.fn((_db, ...path: string[]) => ({ __col: path.join("/") })),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: jest.fn((...args: unknown[]) => ({ __query: args })),
  orderBy: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn(),
  where: jest.fn(),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  writeBatch: jest.fn(),
}));

jest.mock("./UserContext", () => {
  const { createContext } = jest.requireActual("react");
  return { UserContext: createContext({}) };
});

import { LeagueProvider, LeagueContext } from "./LeagueContext";
import { UserContext } from "./UserContext";

const player = (userId: string) => ({ userId });

const singlesGame = (reporter: string): Game =>
  ({
    gameId: "g1",
    reporter,
    team1: { player1: player("a"), player2: null, score: 21 },
    team2: { player1: player("b"), player2: null, score: 15 },
    result: {
      winner: { team: "Team 1", players: ["a"], score: 21 },
      loser: { team: "Team 2", players: ["b"], score: 15 },
    },
    approvalStatus: "Pending",
    numberOfApprovals: 0,
    numberOfDeclines: 0,
    approvers: [],
  }) as unknown as Game;

const doublesGame = (reporter: string): Game =>
  ({
    ...singlesGame(reporter),
    team1: { player1: player("a"), player2: player("a2"), score: 21 },
    team2: { player1: player("b"), player2: player("b2"), score: 15 },
    result: {
      winner: { team: "Team 1", players: ["a", "a2"], score: 21 },
      loser: { team: "Team 2", players: ["b", "b2"], score: 15 },
    },
  }) as unknown as Game;

const leagueDoc = (game: Game, approvalLimit = 2) => ({
  leagueName: "Test League",
  approvalLimit,
  games: [game],
});

const tournamentDoc = (game: Game, approvalLimit = 2) => ({
  tournamentName: "Test Tournament",
  approvalLimit,
  fixtures: [{ round: 1, games: [game] }],
});

const mockTransactionUpdate = jest.fn();
const sendNotification = jest.fn();
const readNotification = jest.fn();

const wrapper = ({ children }: { children: ReactNode }) => (
  <UserContext.Provider
    value={
      {
        sendNotification,
        sendPushNotification: jest.fn(),
        readNotification,
        getUserById: async (userId: string) => ({ userId, username: userId }),
        currentUser: { userId: "viewer" },
      } as never
    }
  >
    <LeagueProvider>{children}</LeagueProvider>
  </UserContext.Provider>
);

const renderLeague = async () => {
  const hook = renderHook(() => useContext(LeagueContext), { wrapper });
  await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
  await act(async () => {});
  return hook.result;
};

const respondWith = (data: object) => {
  const snap = { exists: () => true, data: () => data };
  mockGetDoc.mockResolvedValue(snap);
  mockRunTransaction.mockImplementation(async (_db, fn) =>
    fn({
      get: jest.fn().mockResolvedValue(snap),
      update: mockTransactionUpdate,
      set: jest.fn(),
    }),
  );
};

const wroteApproval = (kind: "league" | "tournament") =>
  kind === "league"
    ? mockUpdateDoc.mock.calls.length > 0
    : mockRunTransaction.mock.calls.length > 0;

const declineAs = (
  result: Awaited<ReturnType<typeof renderLeague>>,
  userId: string,
  kind: "league" | "tournament",
) =>
  result.current.declineGame({
    gameId: "g1",
    competitionId: "c1",
    userId,
    senderId: "reporter",
    notificationId: "n1",
    notificationType:
      kind === "league"
        ? notificationTypes.ACTION.ADD_GAME.LEAGUE
        : notificationTypes.ACTION.ADD_GAME.TOURNAMENT,
  });

const approveAs = (
  result: Awaited<ReturnType<typeof renderLeague>>,
  userId: string,
  kind: "league" | "tournament",
) =>
  result.current.approveGame({
    gameId: "g1",
    competitionId: "c1",
    userId,
    senderId: "reporter",
    notificationType:
      kind === "league"
        ? notificationTypes.ACTION.ADD_GAME.LEAGUE
        : notificationTypes.ACTION.ADD_GAME.TOURNAMENT,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDocs.mockResolvedValue({ docs: [] });
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

describe.each([
  ["league", leagueDoc],
  ["tournament", tournamentDoc],
] as const)("approveGame (%s)", (kind, makeDoc) => {
  it("lets a player on the opposing side approve a singles game", async () => {
    respondWith(makeDoc(singlesGame("a")));
    const result = await renderLeague();

    await approveAs(result, "b", kind);

    expect(wroteApproval(kind)).toBe(true);
  });

  it("does not let the reporter approve their own singles game", async () => {
    respondWith(makeDoc(singlesGame("a")));
    const result = await renderLeague();

    await approveAs(result, "a", kind);

    expect(sendNotification).not.toHaveBeenCalled();
    expect(wroteApproval(kind)).toBe(false);
  });

  it("does not let someone outside the game approve", async () => {
    respondWith(makeDoc(singlesGame("a")));
    const result = await renderLeague();

    await approveAs(result, "stranger", kind);

    expect(sendNotification).not.toHaveBeenCalled();
    expect(wroteApproval(kind)).toBe(false);
  });

  it.each(["a", "a2"])(
    "does not let the reporting team's player %s approve a doubles game",
    async (userId) => {
      respondWith(makeDoc(doublesGame("a")));
      const result = await renderLeague();

      await approveAs(result, userId, kind);

      expect(sendNotification).not.toHaveBeenCalled();
      expect(wroteApproval(kind)).toBe(false);
    },
  );

  it.each(["b", "b2"])(
    "lets the opposing team's player %s approve a doubles game",
    async (userId) => {
      respondWith(makeDoc(doublesGame("a")));
      const result = await renderLeague();

      await approveAs(result, userId, kind);

      expect(wroteApproval(kind)).toBe(true);
    },
  );
});

describe("approveGame (league) write", () => {
  it("records the opposing player's approval on the game", async () => {
    respondWith(leagueDoc(doublesGame("a")));
    const result = await renderLeague();

    await approveAs(result, "b2", "league");

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.games[0]).toMatchObject({
      numberOfApprovals: 1,
      approvers: [{ userId: "b2", username: "b2" }],
    });
  });
});

describe("approval limit of two", () => {
  const withApprover = (game: Game, userId: string) =>
    ({
      ...game,
      numberOfApprovals: 1,
      approvers: [{ userId, username: userId }],
    }) as Game;

  it("keeps a league game pending after the first approval", async () => {
    respondWith(leagueDoc(doublesGame("a")));
    const result = await renderLeague();

    await approveAs(result, "b", "league");

    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.games[0]).toMatchObject({
      approvalStatus: "Pending",
      numberOfApprovals: 1,
    });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("keeps a tournament game pending after the first approval without error", async () => {
    respondWith(tournamentDoc(doublesGame("a")));
    const result = await renderLeague();

    await approveAs(result, "b", "tournament");

    expect(console.error).not.toHaveBeenCalled();
    expect(mockTransactionUpdate).toHaveBeenCalledTimes(1);
    const [, update] = mockTransactionUpdate.mock.calls[0];
    expect(update.fixtures[0].games[0]).toMatchObject({
      approvalStatus: "Pending",
      numberOfApprovals: 1,
      approvers: [{ userId: "b" }],
    });
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("approves a singles league game on one approval despite a limit of two", async () => {
    respondWith(leagueDoc(singlesGame("a")));
    const result = await renderLeague();

    await approveAs(result, "b", "league");

    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.games[0]).toMatchObject({
      approvalStatus: "approved",
      numberOfApprovals: 1,
    });
  });

  it("approves a league game once the second opponent approves", async () => {
    respondWith(leagueDoc(withApprover(doublesGame("a"), "b")));
    const result = await renderLeague();

    await approveAs(result, "b2", "league");

    expect(mockRunTransaction).toHaveBeenCalled();
    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.games[0]).toMatchObject({
      approvalStatus: "approved",
      numberOfApprovals: 2,
    });
  });

  it.each(["league", "tournament"] as const)(
    "does not count the same %s approver twice",
    async (kind) => {
      const make = kind === "league" ? leagueDoc : tournamentDoc;
      respondWith(make(withApprover(doublesGame("a"), "b")));
      const result = await renderLeague();

      await approveAs(result, "b", kind);

      expect(sendNotification).not.toHaveBeenCalled();
      expect(wroteApproval(kind)).toBe(false);
    },
  );
});

describe.each([
  ["league", leagueDoc],
  ["tournament", tournamentDoc],
] as const)("declineGame (%s)", (kind, makeDoc) => {
  it.each(["a", "a2", "stranger"])(
    "does not let %s decline a doubles game reported by a",
    async (userId) => {
      respondWith(makeDoc(doublesGame("a")));
      const result = await renderLeague();

      await declineAs(result, userId, kind);

      expect(sendNotification).not.toHaveBeenCalled();
      expect(wroteApproval(kind)).toBe(false);
    },
  );

  it.each(["b", "b2"])(
    "lets the opposing player %s decline",
    async (userId) => {
      respondWith(makeDoc(doublesGame("a")));
      const result = await renderLeague();

      await declineAs(result, userId, kind);

      expect(wroteApproval(kind)).toBe(true);
    },
  );
});
