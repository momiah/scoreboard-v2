import { LADDER_MATCH_STATUS, LADDER_TYPE } from "courtchamps-shared/types";
import {
  buildLadderParticipant,
  createTeam,
  normalizeTeamKey,
  notificationTypes,
} from "courtchamps-shared";

const mockFirestore = jest.fn();
jest.mock("firebase-admin", () => {
  const firestore = Object.assign(
    (...args: unknown[]) => mockFirestore(...args),
    { Timestamp: { now: () => ({ toDate: () => new Date() }) } },
  );
  return { firestore };
});

import { runAutoApproveLadderGames } from "./autoApproveLadderGames";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000);

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

const singlesGame = (
  number: number,
  overrides: Record<string, unknown> = {},
) => ({
  gameId: `m1-g${number}`,
  gameNumber: number,
  team1: { player1: player("opp"), player2: null, score: 21 },
  team2: { player1: player("me"), player2: null, score: 15 },
  gamescore: "21-15",
  result: {
    winner: { team: "Team 1", players: ["opp"], score: 21 },
    loser: { team: "Team 2", players: ["me"], score: 15 },
  },
  approvalStatus: "Pending",
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  approvers: [] as unknown[],
  createdAt: hoursAgo(25),
  ...overrides,
});

const doublesGame = (
  number: number,
  overrides: Record<string, unknown> = {},
) => ({
  ...singlesGame(number),
  team1: { player1: player("o1"), player2: player("o2"), score: 21 },
  team2: { player1: player("me"), player2: player("pt"), score: 15 },
  result: {
    winner: { team: "Team 1", players: ["o1", "o2"], score: 21 },
    loser: { team: "Team 2", players: ["me", "pt"], score: 15 },
  },
  ...overrides,
});

const shell = (number: number) => ({
  gameId: `m1-g${number}`,
  gameNumber: number,
  team1: { player1: null, player2: null, score: 0 },
  team2: { player1: null, player2: null, score: 0 },
  result: null,
  approvalStatus: "",
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  approvers: [] as unknown[],
});

const approvedGame = (number: number) =>
  singlesGame(number, {
    approvalStatus: notificationTypes.RESPONSE.APPROVED_GAME,
    numberOfApprovals: 1,
  });

interface Fixture {
  match: Record<string, unknown>;
  users: Record<string, unknown>;
  participants?: Record<string, unknown>;
  teams?: Record<string, unknown>;
  ladderStatus?: string;
}

type Store = Record<string, unknown>;

interface Ref {
  path: string;
  store: Store;
  id: string;
  get: () => Promise<{ exists: boolean; data: () => unknown }>;
}

const makeDb = ({
  match,
  users,
  participants = {},
  teams = {},
  ladderStatus = "registrationClosed",
}: Fixture) => {
  const matches: Store = { m1: match };
  const batch = {
    update: jest.fn(),
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  };
  const matchWhere = jest.fn();
  const docRef = (path: string, store: Store, id: string): Ref => ({
    path,
    store,
    id,
    get: async () => ({
      exists: store[id] !== undefined,
      data: () =>
        store[id] === undefined ? undefined : structuredClone(store[id]),
    }),
  });
  const matchRef = docRef("ladderMatches/m1", matches, "m1");
  const ladderCollections = (name: string) => {
    if (name === "ladderMatches") {
      return {
        where: (...args: unknown[]) => {
          matchWhere(...args);
          return {
            get: async () => ({
              docs: [
                {
                  id: "m1",
                  ref: matchRef,
                  data: () => structuredClone(matches.m1),
                },
              ],
            }),
          };
        },
      };
    }
    const store = name === "ladderParticipants" ? participants : teams;
    return {
      doc: (id: string) => docRef(`${name}/${id}`, store, id),
    };
  };
  const ladderRef = {
    collection: ladderCollections,
    get: async () => ({
      exists: true,
      data: () => ({ status: ladderStatus }),
    }),
  };
  const transaction = {
    get: (ref: Ref) => ref.get(),
    set: (ref: Ref, data: unknown) => {
      ref.store[ref.id] = structuredClone(data);
      batch.set(ref, data);
    },
    update: (ref: Ref, data: Record<string, unknown>) => {
      ref.store[ref.id] = {
        ...(ref.store[ref.id] as Record<string, unknown>),
        ...structuredClone(data),
      };
      batch.update(ref, data);
    },
  };
  const db = {
    runTransaction: async <T,>(fn: (tx: typeof transaction) => Promise<T>) => {
      const result = await fn(transaction);
      await batch.commit();
      return result;
    },
    collection: (name: string) => {
      if (name === "ladders") {
        return {
          get: async () => ({
            docs: [
              {
                id: "L1",
                ref: ladderRef,
                data: () => ({ status: ladderStatus }),
              },
            ],
          }),
          doc: () => ladderRef,
        };
      }
      return { doc: (id: string) => docRef(`users/${id}`, users, id) };
    },
  };
  return { db, batch, matchWhere };
};

const lastCallByPath = (mock: jest.Mock, path: string) =>
  [...mock.mock.calls].reverse().find(([ref]) => ref.path === path)?.[1];

const setByPath = (batch: { set: jest.Mock }, path: string) =>
  lastCallByPath(batch.set, path);

const updateByPath = (batch: { update: jest.Mock }, path: string) =>
  lastCallByPath(batch.update, path);

const singlesFixture = (games: unknown[]): Fixture => ({
  match: {
    ladderMatchId: "m1",
    bestOf: 5,
    games,
    participants: ["opp", "me"],
    matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
    ladderType: LADDER_TYPE.SINGLES,
  },
  users: { opp: user("opp"), me: user("me") },
  participants: {
    opp: buildLadderParticipant(user("opp")),
    me: buildLadderParticipant(user("me")),
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("runAutoApproveLadderGames", () => {
  it("only queries matches that are still ACCEPTED", async () => {
    const { db, matchWhere } = makeDb(singlesFixture([singlesGame(1)]));
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(matchWhere).toHaveBeenCalledWith(
      "matchStatus",
      "==",
      LADDER_MATCH_STATUS.ACCEPTED,
    );
  });

  it("approves a pending game older than 24h, marks it system-approved and scores it", async () => {
    const { db, batch } = makeDb(
      singlesFixture([singlesGame(1), shell(2), shell(3), shell(4), shell(5)]),
    );
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).toHaveBeenCalledTimes(1);
    const matchUpdate = updateByPath(batch, "ladderMatches/m1");
    const [first] = matchUpdate.games;
    expect(first.approvalStatus).toBe(notificationTypes.RESPONSE.APPROVED_GAME);
    expect(first.autoApproved).toBe(true);
    expect(first.approvers).toEqual([
      { userId: "system", username: "AutoApproval" },
    ]);
    expect(matchUpdate.matchStatus).toBeUndefined();

    const winner = setByPath(batch, "ladderParticipants/opp");
    expect(winner).toMatchObject({
      numberOfWins: 1,
      totalPointDifference: 6,
      competitionXP: 20,
    });
    const loser = setByPath(batch, "ladderParticipants/me");
    expect(loser).toMatchObject({
      numberOfLosses: 1,
      totalPointDifference: -6,
      competitionXP: 0,
    });
    expect(updateByPath(batch, "users/opp").profileDetail.XP).toBe(120);
    expect(updateByPath(batch, "users/me").profileDetail.XP).toBe(85);
  });

  it("accumulates streaks when two pending games are both overdue", async () => {
    const { db, batch } = makeDb(
      singlesFixture([
        singlesGame(1),
        singlesGame(2),
        shell(3),
        shell(4),
        shell(5),
      ]),
    );
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(setByPath(batch, "ladderParticipants/opp")).toMatchObject({
      numberOfWins: 2,
      totalPointDifference: 12,
      competitionXP: 60,
    });
    expect(setByPath(batch, "ladderParticipants/me")).toMatchObject({
      numberOfLosses: 2,
      totalPointDifference: -12,
      competitionXP: 0,
    });
    expect(updateByPath(batch, "users/me").profileDetail.XP).toBe(62.5);
  });

  it("leaves a pending game alone before the 24h window", async () => {
    const { db, batch } = makeDb(
      singlesFixture([
        singlesGame(1, { createdAt: hoursAgo(23) }),
        shell(2),
        shell(3),
      ]),
    );
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).not.toHaveBeenCalled();
    expect(batch.update).not.toHaveBeenCalled();
  });

  it("skips a game that has been declined, even past 24h", async () => {
    const { db, batch } = makeDb(
      singlesFixture([singlesGame(1, { numberOfDeclines: 1 }), shell(2)]),
    );
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).not.toHaveBeenCalled();
  });

  it("skips a disputed game", async () => {
    const { db, batch } = makeDb(
      singlesFixture([
        singlesGame(1, { approvalStatus: "disputed" }),
        shell(2),
      ]),
    );
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).not.toHaveBeenCalled();
  });

  it("skips an unreported shell", async () => {
    const { db, batch } = makeDb(singlesFixture([shell(1), shell(2)]));
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).not.toHaveBeenCalled();
  });

  it("completes the match when the auto-approved game is the decider", async () => {
    const { db, batch } = makeDb(
      singlesFixture([
        approvedGame(1),
        approvedGame(2),
        singlesGame(3),
        shell(4),
        shell(5),
      ]),
    );
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    const matchUpdate = updateByPath(batch, "ladderMatches/m1");
    expect(matchUpdate.matchStatus).toBe(LADDER_MATCH_STATUS.COMPLETED);
    expect(matchUpdate.completedAt).toBeInstanceOf(Date);
    expect(setByPath(batch, "ladderParticipants/opp").matchResultLog).toEqual([
      "W",
    ]);
    expect(setByPath(batch, "ladderParticipants/me").matchResultLog).toEqual([
      "L",
    ]);
  });

  it("holds match completion while another game is disputed", async () => {
    const { db, batch } = makeDb(
      singlesFixture([
        approvedGame(1),
        approvedGame(2),
        singlesGame(3),
        singlesGame(4, { approvalStatus: "disputed" }),
        shell(5),
      ]),
    );
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    const matchUpdate = updateByPath(batch, "ladderMatches/m1");
    expect(matchUpdate.games[2].autoApproved).toBe(true);
    expect(matchUpdate.matchStatus).toBeUndefined();
    expect(setByPath(batch, "ladderParticipants/opp").matchResultLog).toEqual(
      [],
    );
  });

  it("scores doubles through the team docs and lazily creates missing participants", async () => {
    const teamAKey = normalizeTeamKey(["me", "pt"]);
    const teamBKey = normalizeTeamKey(["o1", "o2"]);
    const team = (ids: string[], key: string) => ({
      ...createTeam(ids, key),
      XP: 0,
      teamId: key,
      playerIds: ids,
      status: "active",
    });
    const { db, batch } = makeDb({
      match: {
        ladderMatchId: "m1",
        bestOf: 5,
        games: [doublesGame(1), shell(2), shell(3), shell(4), shell(5)],
        participants: ["me", "pt", "o1", "o2"],
        teams: [
          { teamId: teamBKey, teamKey: teamBKey, playerIds: ["o1", "o2"] },
          { teamId: teamAKey, teamKey: teamAKey, playerIds: ["me", "pt"] },
        ],
        matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
        ladderType: LADDER_TYPE.DOUBLES,
      },
      users: {
        me: user("me"),
        pt: user("pt"),
        o1: user("o1"),
        o2: user("o2"),
      },
      participants: {
        me: buildLadderParticipant(user("me")),
        o1: buildLadderParticipant(user("o1")),
      },
      teams: {
        [teamAKey]: team(["me", "pt"], teamAKey),
        [teamBKey]: team(["o1", "o2"], teamBKey),
      },
    });
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(setByPath(batch, `ladderTeams/${teamBKey}`)).toMatchObject({
      numberOfWins: 1,
      totalPointDifference: 6,
      XP: 20,
    });
    expect(setByPath(batch, `ladderTeams/${teamAKey}`)).toMatchObject({
      numberOfLosses: 1,
      totalPointDifference: -6,
      XP: 0,
    });
    ["me", "pt", "o1", "o2"].forEach((id) => {
      expect(setByPath(batch, `ladderParticipants/${id}`)).toBeDefined();
    });
    expect(updateByPath(batch, "users/me").profileDetail.XP).toBe(85);
    expect(updateByPath(batch, "users/pt").profileDetail.XP).toBe(85);
    expect(updateByPath(batch, "users/o1").profileDetail.XP).toBe(120);
    expect(updateByPath(batch, "users/o2").profileDetail.XP).toBe(120);
  });

  it("leaves every game alone once the ladder is in playoffs", async () => {
    const { db, batch } = makeDb({
      ...singlesFixture([singlesGame(1), shell(2)]),
      ladderStatus: "playoffs",
    });
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).not.toHaveBeenCalled();
    expect(batch.update).not.toHaveBeenCalled();
  });

  it("keeps approving while registration is closed but playoffs have not started", async () => {
    const { db, batch } = makeDb({
      ...singlesFixture([singlesGame(1), shell(2)]),
      ladderStatus: "registrationClosed",
    });
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it("ages a game from the server report time, not the client createdAt", async () => {
    const fixture = singlesFixture([
      singlesGame(1, { createdAt: hoursAgo(100) }),
      shell(2),
    ]);
    fixture.match.gameReportedAt = { "m1-g1": hoursAgo(2) };
    const { db, batch } = makeDb(fixture);
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).not.toHaveBeenCalled();
  });

  it("approves once the server report time is past 24h even if the client clock says new", async () => {
    const fixture = singlesFixture([
      singlesGame(1, { createdAt: hoursAgo(1) }),
      shell(2),
    ]);
    fixture.match.gameReportedAt = { "m1-g1": hoursAgo(30) };
    const { db, batch } = makeDb(fixture);
    mockFirestore.mockReturnValue(db);

    await runAutoApproveLadderGames();

    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it("survives a failed transaction without throwing", async () => {
    const { db, batch } = makeDb(
      singlesFixture([singlesGame(1), shell(2), shell(3), shell(4), shell(5)]),
    );
    const failing = jest
      .spyOn(db, "runTransaction")
      .mockRejectedValueOnce(new Error("contention"));
    mockFirestore.mockReturnValue(db);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runAutoApproveLadderGames()).resolves.toBeUndefined();

    expect(failing).toHaveBeenCalledTimes(1);
    expect(batch.commit).not.toHaveBeenCalled();
  });

  it("does not throw when reading ladders fails", async () => {
    mockFirestore.mockReturnValue({
      collection: () => ({
        get: async () => {
          throw new Error("boom");
        },
      }),
    });

    await expect(runAutoApproveLadderGames()).resolves.toBeUndefined();
  });
});
