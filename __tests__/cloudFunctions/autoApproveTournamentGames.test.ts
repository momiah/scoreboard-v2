import { LEAGUE_AUTO_APPROVE_HOURS } from "../../functions/node_modules/courtchamps-shared/dist/helpers";

type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();
let beforeCommit: (() => void) | null = null;

const ref = (path: string) => ({
  id: path.split("/").pop(),
  path,
});

const mockIncrement = (n: number) => ({ __increment: n });

const apply = (path: string, data: Doc) => {
  const current = { ...(store.get(path) ?? {}) };
  Object.entries(data).forEach(([key, value]) => {
    const inc = (value as { __increment?: number })?.__increment;
    current[key] =
      inc !== undefined ? ((current[key] as number) ?? 0) + inc : value;
  });
  store.set(path, current);
};

const snap = (path: string) => {
  const data = store.get(path);
  return {
    exists: !!data,
    data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
  };
};

const mockDb = {
  collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
  runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const reads = new Map<string, string>();
      const writes: [string, Doc][] = [];
      const read = (path: string) => {
        reads.set(path, JSON.stringify(store.get(path) ?? null));
        return snap(path);
      };
      const tx = {
        get: async (r: { path: string }) => read(r.path),
        getAll: async (...refs: { path: string }[]) => refs.map((r) => read(r.path)),
        update: (r: { path: string }, data: Doc) => writes.push([r.path, data]),
      };
      const result = await fn(tx);
      if (beforeCommit) {
        const hook = beforeCommit;
        beforeCommit = null;
        hook();
      }
      const stale = [...reads].some(
        ([path, seen]) => JSON.stringify(store.get(path) ?? null) !== seen,
      );
      if (stale) continue;
      writes.forEach(([path, data]) => apply(path, data));
      return result;
    }
    throw new Error("transaction kept conflicting");
  },
};

jest.mock("firebase-admin", () => ({
  firestore: Object.assign(() => mockDb, {
    FieldValue: { increment: (n: number) => mockIncrement(n) },
    Timestamp: { now: () => ({ toDate: () => new Date() }) },
  }),
}), { virtual: true });
jest.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (_: string, handler: unknown) => handler,
}), { virtual: true });

import { processTournament } from "../../functions/src/autoApproveTournamentGames";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000);

const profile = (userId: string) => ({
  userId,
  username: userId,
  numberOfWins: 0,
  numberOfLosses: 0,
  numberOfGamesPlayed: 0,
  totalPointDifference: 0,
  resultLog: [],
  pointDifferenceLog: [],
  currentStreak: { type: null, count: 0 },
  highestWinStreak: 0,
  highestLossStreak: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  demonWin: 0,
  XP: 0,
  prevGameXP: 0,
});

const player = (userId: string) => ({ userId, username: userId, firstName: userId, lastName: "" });

const userDoc = (userId: string) => ({
  userId,
  username: userId,
  profileDetail: {
    XP: 1000,
    numberOfWins: 0,
    numberOfLosses: 0,
    numberOfGamesPlayed: 0,
    totalPointDifference: 0,
    resultLog: [],
    pointDifferenceLog: [],
    currentStreak: { type: null, count: 0 },
    highestWinStreak: 0,
    highestLossStreak: 0,
    tournamentStats: { first: 0, second: 0, third: 0, fourth: 0 },
  },
});

const pendingGame = (
  gameId: string,
  gameNumber: number,
  [a, b]: [string, string],
  { createdAt, reportedAt }: { createdAt: Date; reportedAt: Date },
) => ({
  gameId,
  gameNumber,
  court: 1,
  team1: { player1: player(a), player2: null, score: 21 },
  team2: { player1: player(b), player2: null, score: 15 },
  gamescore: "21-15",
  result: {
    winner: { team: "Team 1", players: [a], score: 21 },
    loser: { team: "Team 2", players: [b], score: 15 },
  },
  approvalStatus: "Pending",
  reporter: a,
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  approvers: [],
  createdAt,
  reportedAt,
});

const shell = (gameId: string, gameNumber: number, isThirdPlacePlayoff = false) => ({
  gameId,
  gameNumber,
  court: null,
  team1: { player1: null, player2: null },
  team2: { player1: null, player2: null },
  gamescore: "",
  result: null,
  approvalStatus: "Scheduled",
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  approvers: [],
  isThirdPlacePlayoff,
});

const seedKnockout = (games: unknown[]) => {
  store.clear();
  ["a", "b", "c", "d"].forEach((id) => store.set(`users/${id}`, userDoc(id)));
  store.set("tournaments/t1", {
    tournamentName: "Cup",
    tournamentMode: "Knockout",
    tournamentType: "Singles",
    numberOfCourts: 2,
    prizesDistributed: false,
    gamesCompleted: 0,
    numberOfGames: 4,
    tournamentParticipants: ["a", "b", "c", "d"].map(profile),
    fixtures: [
      { round: 1, games },
      { round: 2, games: [shell("g3", 3), shell("g4", 4, true)] },
    ],
  });
};

const due = LEAGUE_AUTO_APPROVE_HOURS + 1;
const run = () => processTournament(mockDb as never, ref("tournaments/t1") as never);
const tournament = () => store.get("tournaments/t1") as {
  fixtures: { games: { gameId: string; approvalStatus: string; team1: { player1: { userId: string } | null } }[] }[];
  gamesCompleted: number;
  tournamentParticipants: { userId: string; numberOfWins: number }[];
};
const game = (gameId: string) =>
  tournament().fixtures.flatMap((r) => r.games).find((g) => g.gameId === gameId)!;

describe("autoApproveTournamentGames processTournament", () => {
  it("approves games reported long enough ago and advances the bracket", async () => {
    seedKnockout([
      pendingGame("g1", 1, ["a", "b"], { createdAt: hoursAgo(due), reportedAt: hoursAgo(due) }),
      pendingGame("g2", 2, ["c", "d"], { createdAt: hoursAgo(due), reportedAt: hoursAgo(due) }),
    ]);
    await run();
    expect(game("g1").approvalStatus).toBe("approved");
    expect(game("g2").approvalStatus).toBe("approved");
    expect(tournament().gamesCompleted).toBe(2);
    expect(game("g3").team1.player1?.userId).toBe("a");
    expect(tournament().tournamentParticipants.find((p) => p.userId === "a")?.numberOfWins).toBe(1);
  });

  it("counts from the report, not from when the fixtures were generated", async () => {
    seedKnockout([
      pendingGame("g1", 1, ["a", "b"], { createdAt: hoursAgo(due * 10), reportedAt: hoursAgo(1) }),
      pendingGame("g2", 2, ["c", "d"], { createdAt: hoursAgo(due * 10), reportedAt: hoursAgo(1) }),
    ]);
    await run();
    expect(game("g1").approvalStatus).toBe("Pending");
    expect(tournament().gamesCompleted).toBe(0);
  });

  it("doesn't re-apply a game a player approved meanwhile, or overwrite their approval", async () => {
    seedKnockout([
      pendingGame("g1", 1, ["a", "b"], { createdAt: hoursAgo(due), reportedAt: hoursAgo(due) }),
      pendingGame("g2", 2, ["c", "d"], { createdAt: hoursAgo(1), reportedAt: hoursAgo(1) }),
    ]);
    beforeCommit = () => {
      const t = JSON.parse(JSON.stringify(store.get("tournaments/t1")));
      t.fixtures[0].games[0].approvalStatus = "approved";
      t.fixtures[0].games[1].approvalStatus = "approved";
      t.gamesCompleted = 2;
      store.set("tournaments/t1", t);
    };
    await run();
    expect(game("g2").approvalStatus).toBe("approved");
    expect(tournament().gamesCompleted).toBe(2);
  });
});
