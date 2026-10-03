import { useContext } from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import {
  LADDER_MATCH_STATUS,
  buildLadderParticipant,
  createTeam,
  normalizeTeamKey,
  notificationTypes,
} from "@shared";
import type { Game } from "@shared/types";

jest.mock("../services/firebase.config", () => ({ db: {} }));

const mockRunTransaction = jest.fn();
const mockGetDocs = jest.fn();
jest.mock("firebase/firestore", () => ({
  arrayUnion: jest.fn(),
  collection: jest.fn((_db, ...path: string[]) => ({ __col: path.join("/") })),
  deleteDoc: jest.fn(),
  doc: jest.fn((_db, ...path: string[]) => ({ path: path.join("/") })),
  getDoc: jest.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  increment: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
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
const MATCH = "m1";
const MATCH_PATH = `ladders/${LADDER}/ladderMatches/${MATCH}`;
const participantPath = (id: string) =>
  `ladders/${LADDER}/ladderParticipants/${id}`;
const teamPath = (key: string) => `ladders/${LADDER}/ladderTeams/${key}`;
const userPath = (id: string) => `users/${id}`;
const APPROVED = notificationTypes.RESPONSE.APPROVED_GAME;

const baseProfile = (xp: number) => ({
  memberSince: "Jan 2026",
  XP: xp,
  totalPointDifference: 0,
  numberOfWins: 0,
  numberOfLosses: 0,
  numberOfGamesPlayed: 0,
  winPercentage: 0,
  prevGameXP: 0,
  highestWinStreak: 0,
  highestLossStreak: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  demonWin: 0,
  averagePointDifference: 0,
  pointDifferenceLog: [] as number[],
  resultLog: [] as string[],
  currentStreak: { type: null, count: 0 },
});

const user = (userId: string) => ({
  userId,
  firstName: "Maestro",
  lastName: userId,
  username: userId,
  profileImage: "",
  profileDetail: baseProfile(100),
});

const player = (userId: string) => ({ userId });

const shell = (number: number) =>
  ({
    gameId: `${MATCH}-g${number}`,
    gameNumber: number,
    gamescore: "",
    team1: { player1: null, player2: null, score: 0 },
    team2: { player1: null, player2: null, score: 0 },
    result: null,
    approvalStatus: "",
    numberOfApprovals: 0,
    numberOfDeclines: 0,
    reporter: "",
    approvers: [],
  }) as unknown as Game;

const singlesGame = (
  number: number,
  overrides: Record<string, unknown> = {},
): Game =>
  ({
    ...shell(number),
    team1: { player1: player("opp"), player2: null, score: 21 },
    team2: { player1: player("me"), player2: null, score: 15 },
    gamescore: "21-15",
    result: {
      winner: { team: "Team 1", players: ["opp"], score: 21 },
      loser: { team: "Team 2", players: ["me"], score: 15 },
    },
    approvalStatus: "Pending",
    reporter: "opp",
    ...overrides,
  }) as unknown as Game;

const doublesGame = (number: number): Game =>
  ({
    ...singlesGame(number),
    team1: { player1: player("o1"), player2: player("o2"), score: 21 },
    team2: { player1: player("me"), player2: player("pt"), score: 15 },
    result: {
      winner: { team: "Team 1", players: ["o1", "o2"], score: 21 },
      loser: { team: "Team 2", players: ["me", "pt"], score: 15 },
    },
    reporter: "o1",
  }) as unknown as Game;

const approvedGame = (number: number) =>
  singlesGame(number, { approvalStatus: APPROVED, numberOfApprovals: 1 });

const reportPayload = (number: number, overrides = {}) =>
  singlesGame(number, { reporter: "me", ...overrides });

const makeMatch = (games: Game[], overrides: Record<string, unknown> = {}) => ({
  ladderMatchId: MATCH,
  bestOf: 5,
  games,
  participants: ["me", "opp"],
  matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
  ...overrides,
});

const makeStore = (initial: Record<string, unknown>) => {
  const store: Record<string, unknown> = { ...initial };
  const tx = {
    get: jest.fn(async (ref: { path: string }) => ({
      exists: () => store[ref.path] !== undefined,
      data: () => store[ref.path],
    })),
    set: jest.fn((ref: { path: string }, data: unknown) => {
      store[ref.path] = data;
    }),
    update: jest.fn((ref: { path: string }, data: object) => {
      store[ref.path] = { ...(store[ref.path] as object), ...data };
    }),
  };
  mockRunTransaction.mockImplementation(async (_db, fn) => fn(tx));
  return { store, tx };
};

const singlesStore = (games: Game[]) =>
  makeStore({
    [MATCH_PATH]: makeMatch(games),
    [participantPath("opp")]: buildLadderParticipant(user("opp")),
    [participantPath("me")]: buildLadderParticipant(user("me")),
    [userPath("opp")]: user("opp"),
    [userPath("me")]: user("me"),
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

const approve = (
  result: Awaited<ReturnType<typeof renderLadder>>,
  gameId: string,
  userId = "me",
) =>
  result.current.approveLadderGame({
    ladderId: LADDER,
    matchId: MATCH,
    gameId,
    userId,
    approver: { userId, username: userId },
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDocs.mockResolvedValue({ docs: [] });
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("updateLadderGame (reporting a score)", () => {
  it("rejects calls missing identifiers without opening a transaction", async () => {
    const result = await renderLadder();
    const outcome = await result.current.updateLadderGame({
      ladderId: "",
      matchId: MATCH,
      updatedGame: reportPayload(1),
    });
    expect(outcome).toEqual({ success: false, reason: "error" });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it("writes the report into the current shell, stamping createdAt and dropping undefined fields", async () => {
    const { store, tx } = singlesStore([
      shell(1),
      shell(2),
      shell(3),
      shell(4),
      shell(5),
    ]);
    const result = await renderLadder();

    const outcome = await result.current.updateLadderGame({
      ladderId: LADDER,
      matchId: MATCH,
      updatedGame: reportPayload(1, { court: undefined }),
    });

    expect(outcome).toEqual({ success: true });
    expect(tx.update).toHaveBeenCalledTimes(1);
    const games = (store[MATCH_PATH] as { games: Record<string, unknown>[] })
      .games;
    expect(games[0]).toMatchObject({
      gameId: `${MATCH}-g1`,
      approvalStatus: "Pending",
      reporter: "me",
    });
    expect(games[0].createdAt).toBeInstanceOf(Date);
    expect("court" in games[0]).toBe(false);
    expect(games[1].approvalStatus).toBe("");
  });

  it("blocks an out-of-turn report while an earlier game is still unreported", async () => {
    const { tx } = singlesStore([
      shell(1),
      shell(2),
      shell(3),
      shell(4),
      shell(5),
    ]);
    const result = await renderLadder();

    const outcome = await result.current.updateLadderGame({
      ladderId: LADDER,
      matchId: MATCH,
      updatedGame: reportPayload(2),
    });

    expect(outcome).toEqual({ success: false, reason: "match_decided" });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("blocks reporting once reported wins have reached the decider", async () => {
    const { tx } = singlesStore([
      singlesGame(1),
      singlesGame(2),
      singlesGame(3),
      shell(4),
      shell(5),
    ]);
    const result = await renderLadder();

    const outcome = await result.current.updateLadderGame({
      ladderId: LADDER,
      matchId: MATCH,
      updatedGame: reportPayload(4),
    });

    expect(outcome).toEqual({ success: false, reason: "match_decided" });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("refuses to re-report a game that is already pending", async () => {
    const { tx } = singlesStore([singlesGame(1), shell(2)]);
    const result = await renderLadder();

    const outcome = await result.current.updateLadderGame({
      ladderId: LADDER,
      matchId: MATCH,
      updatedGame: reportPayload(1),
    });

    expect(outcome).toEqual({ success: false, reason: "unavailable" });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("refuses to report over an already approved game", async () => {
    singlesStore([approvedGame(1), shell(2)]);
    const result = await renderLadder();

    const outcome = await result.current.updateLadderGame({
      ladderId: LADDER,
      matchId: MATCH,
      updatedGame: reportPayload(1),
    });

    expect(outcome).toEqual({ success: false, reason: "unavailable" });
  });

  it("reports an error when the match or the game does not exist", async () => {
    makeStore({});
    const result = await renderLadder();
    expect(
      await result.current.updateLadderGame({
        ladderId: LADDER,
        matchId: MATCH,
        updatedGame: reportPayload(1),
      }),
    ).toEqual({ success: false, reason: "error" });

    singlesStore([shell(1)]);
    expect(
      await result.current.updateLadderGame({
        ladderId: LADDER,
        matchId: MATCH,
        updatedGame: reportPayload(9),
      }),
    ).toEqual({ success: false, reason: "error" });
  });
});

describe("approveLadderGame (singles)", () => {
  it("fully approves and scores on a single opponent approval", async () => {
    const { store, tx } = singlesStore([
      singlesGame(1),
      shell(2),
      shell(3),
      shell(4),
      shell(5),
    ]);
    const result = await renderLadder();

    const outcome = await approve(result, `${MATCH}-g1`);

    expect(outcome).toEqual({
      success: true,
      fullyApproved: true,
      matchCompleted: false,
    });
    const match = store[MATCH_PATH] as {
      games: Record<string, unknown>[];
      matchStatus: string;
    };
    expect(match.games[0]).toMatchObject({
      approvalStatus: APPROVED,
      numberOfApprovals: 1,
      approvers: [{ userId: "me", username: "me" }],
    });
    expect(match.matchStatus).toBe(LADDER_MATCH_STATUS.ACCEPTED);
    expect(store[participantPath("opp")]).toMatchObject({
      numberOfWins: 1,
      totalPointDifference: 6,
      competitionXP: 20,
    });
    expect(store[participantPath("me")]).toMatchObject({
      numberOfLosses: 1,
      totalPointDifference: -6,
      competitionXP: 0,
    });
    expect(
      (store[userPath("opp")] as { profileDetail: { XP: number } })
        .profileDetail.XP,
    ).toBe(120);
    expect(
      (store[userPath("me")] as { profileDetail: { XP: number } }).profileDetail
        .XP,
    ).toBe(85);
    expect(tx.update).toHaveBeenCalledTimes(3);
  });

  it("does not score twice when the same game is approved again", async () => {
    const { store } = singlesStore([singlesGame(1), shell(2)]);
    const result = await renderLadder();

    expect((await approve(result, `${MATCH}-g1`)).success).toBe(true);
    const afterFirst = JSON.stringify(store[participantPath("opp")]);

    const second = await approve(result, `${MATCH}-g1`, "other");
    expect(second).toEqual({ success: false, reason: "unavailable" });
    expect(JSON.stringify(store[participantPath("opp")])).toBe(afterFirst);
  });

  it("refuses an approval from a user already recorded as an approver", async () => {
    const { tx } = singlesStore([
      singlesGame(1, { approvers: [{ userId: "me", username: "me" }] }),
      shell(2),
    ]);
    const result = await renderLadder();

    const outcome = await approve(result, `${MATCH}-g1`);

    expect(outcome).toEqual({ success: false, reason: "unavailable" });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("completes the match when the approved game is the decider", async () => {
    const { store } = singlesStore([
      approvedGame(1),
      approvedGame(2),
      singlesGame(3),
      shell(4),
      shell(5),
    ]);
    const result = await renderLadder();

    const outcome = await approve(result, `${MATCH}-g3`);

    expect(outcome).toEqual({
      success: true,
      fullyApproved: true,
      matchCompleted: true,
    });
    expect((store[MATCH_PATH] as { matchStatus: string }).matchStatus).toBe(
      LADDER_MATCH_STATUS.COMPLETED,
    );
    expect(
      (store[participantPath("opp")] as { matchResultLog: string[] })
        .matchResultLog,
    ).toEqual(["W"]);
    expect(
      (store[participantPath("me")] as { matchResultLog: string[] })
        .matchResultLog,
    ).toEqual(["L"]);
  });

  it("keeps the match open when the approved game is not the decider", async () => {
    const { store } = singlesStore([
      approvedGame(1),
      singlesGame(2),
      shell(3),
      shell(4),
      shell(5),
    ]);
    const result = await renderLadder();

    const outcome = await approve(result, `${MATCH}-g2`);

    expect(outcome.matchCompleted).toBe(false);
    expect((store[MATCH_PATH] as { matchStatus: string }).matchStatus).toBe(
      LADDER_MATCH_STATUS.ACCEPTED,
    );
  });

  it("holds completion while another game in the match is disputed", async () => {
    const { store } = singlesStore([
      approvedGame(1),
      approvedGame(2),
      singlesGame(3),
      singlesGame(4, { approvalStatus: "disputed" }),
      shell(5),
    ]);
    const result = await renderLadder();

    const outcome = await approve(result, `${MATCH}-g3`);

    expect(outcome).toEqual({
      success: true,
      fullyApproved: true,
      matchCompleted: false,
    });
    expect((store[MATCH_PATH] as { matchStatus: string }).matchStatus).toBe(
      LADDER_MATCH_STATUS.ACCEPTED,
    );
  });

  it("reports an error for a missing match, a missing game or missing identifiers", async () => {
    makeStore({});
    const result = await renderLadder();
    expect(await approve(result, `${MATCH}-g1`)).toEqual({
      success: false,
      reason: "error",
    });

    singlesStore([singlesGame(1)]);
    expect(await approve(result, "does-not-exist")).toEqual({
      success: false,
      reason: "error",
    });

    expect(
      await result.current.approveLadderGame({
        ladderId: "",
        matchId: MATCH,
        gameId: `${MATCH}-g1`,
        userId: "me",
        approver: { userId: "me", username: "me" },
      }),
    ).toEqual({ success: false, reason: "error" });
  });
});

describe("approveLadderGame (doubles)", () => {
  const teamAKey = normalizeTeamKey(["me", "pt"]);
  const teamBKey = normalizeTeamKey(["o1", "o2"]);
  const team = (ids: string[], key: string) => ({
    ...createTeam(ids, key),
    XP: 0,
    teamId: key,
    playerIds: ids,
    status: "active",
  });

  const doublesStore = (participantIds: string[]) =>
    makeStore({
      [MATCH_PATH]: makeMatch(
        [doublesGame(1), shell(2), shell(3), shell(4), shell(5)],
        {
          participants: ["me", "pt", "o1", "o2"],
          teams: [
            { teamId: teamBKey, teamKey: teamBKey, playerIds: ["o1", "o2"] },
            { teamId: teamAKey, teamKey: teamAKey, playerIds: ["me", "pt"] },
          ],
        },
      ),
      ...Object.fromEntries(
        participantIds.map((id) => [
          participantPath(id),
          buildLadderParticipant(user(id)),
        ]),
      ),
      ...Object.fromEntries(
        ["me", "pt", "o1", "o2"].map((id) => [userPath(id), user(id)]),
      ),
      [teamPath(teamAKey)]: team(["me", "pt"], teamAKey),
      [teamPath(teamBKey)]: team(["o1", "o2"], teamBKey),
    });

  it("scores team CP on the team docs and global XP on each player", async () => {
    const { store } = doublesStore(["me", "pt", "o1", "o2"]);
    const result = await renderLadder();

    const outcome = await approve(result, `${MATCH}-g1`);

    expect(outcome).toEqual({
      success: true,
      fullyApproved: true,
      matchCompleted: false,
    });
    expect(store[teamPath(teamBKey)]).toMatchObject({
      numberOfWins: 1,
      totalPointDifference: 6,
      XP: 20,
    });
    expect(store[teamPath(teamAKey)]).toMatchObject({
      numberOfLosses: 1,
      totalPointDifference: -6,
      XP: 0,
    });
    const xp = (id: string) =>
      (store[userPath(id)] as { profileDetail: { XP: number } }).profileDetail
        .XP;
    expect([xp("me"), xp("pt"), xp("o1"), xp("o2")]).toEqual([
      85, 85, 120, 120,
    ]);
  });

  it("creates missing participant docs for every player without cross-contaminating them", async () => {
    const { store } = doublesStore(["me", "o1"]);
    const result = await renderLadder();

    await approve(result, `${MATCH}-g1`);

    ["me", "pt", "o1", "o2"].forEach((id) => {
      expect(store[participantPath(id)]).toBeDefined();
    });
    const log = (id: string) =>
      (store[participantPath(id)] as { resultLog: string[] }).resultLog;
    expect(log("o1")).toEqual(["W"]);
    expect(log("o2")).toEqual(["W"]);
    expect(log("me")).toEqual(["L"]);
    expect(log("pt")).toEqual(["L"]);
    expect(
      (store[userPath("pt")] as { profileDetail: { XP: number } }).profileDetail
        .XP,
    ).toBe(85);
  });
});

describe("approval eligibility", () => {
  it("refuses the reporter approving their own singles game", async () => {
    const { store, tx } = singlesStore([singlesGame(1), shell(2)]);
    const result = await renderLadder();

    expect(await approve(result, `${MATCH}-g1`, "opp")).toEqual({
      success: false,
      reason: "not_opponent",
    });
    expect(tx.update).not.toHaveBeenCalled();
    expect(
      (store[MATCH_PATH] as { games: { approvalStatus: string }[] }).games[0]
        .approvalStatus,
    ).toBe("Pending");
  });

  it("refuses someone who is not a player in the game", async () => {
    const { tx } = singlesStore([singlesGame(1), shell(2)]);
    const result = await renderLadder();

    expect(await approve(result, `${MATCH}-g1`, "stranger")).toEqual({
      success: false,
      reason: "not_opponent",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it.each(["o1", "o2"])(
    "refuses the reporting team's own player %s approving a doubles game",
    async (userId) => {
      const teamAKey = normalizeTeamKey(["me", "pt"]);
      const teamBKey = normalizeTeamKey(["o1", "o2"]);
      const { store, tx } = makeStore({
        [MATCH_PATH]: makeMatch(
          [doublesGame(1), shell(2), shell(3), shell(4), shell(5)],
          {
            participants: ["me", "pt", "o1", "o2"],
            teams: [
              { teamId: teamBKey, teamKey: teamBKey, playerIds: ["o1", "o2"] },
              { teamId: teamAKey, teamKey: teamAKey, playerIds: ["me", "pt"] },
            ],
          },
        ),
        ...Object.fromEntries(
          ["me", "pt", "o1", "o2"].map((id) => [userPath(id), user(id)]),
        ),
      });
      const result = await renderLadder();

      expect(await approve(result, `${MATCH}-g1`, userId)).toEqual({
        success: false,
        reason: "not_opponent",
      });
      expect(tx.update).not.toHaveBeenCalled();
      expect(
        (store[MATCH_PATH] as { games: { approvalStatus: string }[] }).games[0]
          .approvalStatus,
      ).toBe("Pending");
    },
  );

  it("lets either player on the opposing team approve a doubles game", async () => {
    const teamAKey = normalizeTeamKey(["me", "pt"]);
    const teamBKey = normalizeTeamKey(["o1", "o2"]);
    const { store } = makeStore({
      [MATCH_PATH]: makeMatch(
        [doublesGame(1), shell(2), shell(3), shell(4), shell(5)],
        {
          participants: ["me", "pt", "o1", "o2"],
          teams: [
            { teamId: teamBKey, teamKey: teamBKey, playerIds: ["o1", "o2"] },
            { teamId: teamAKey, teamKey: teamAKey, playerIds: ["me", "pt"] },
          ],
        },
      ),
      ...Object.fromEntries(
        ["me", "pt", "o1", "o2"].map((id) => [userPath(id), user(id)]),
      ),
      [teamPath(teamAKey)]: {
        ...createTeam(["me", "pt"], teamAKey),
        XP: 0,
        teamId: teamAKey,
        playerIds: ["me", "pt"],
        status: "active",
      },
      [teamPath(teamBKey)]: {
        ...createTeam(["o1", "o2"], teamBKey),
        XP: 0,
        teamId: teamBKey,
        playerIds: ["o1", "o2"],
        status: "active",
      },
    });
    const result = await renderLadder();

    expect(await approve(result, `${MATCH}-g1`, "pt")).toMatchObject({
      success: true,
      fullyApproved: true,
    });
    expect(
      (store[MATCH_PATH] as { games: { approvalStatus: string }[] }).games[0]
        .approvalStatus,
    ).toBe(APPROVED);
  });
});
