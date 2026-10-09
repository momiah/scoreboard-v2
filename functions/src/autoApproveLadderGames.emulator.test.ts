import * as admin from "firebase-admin";
import {
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
} from "courtchamps-shared/types";
import { planLadderGameApproval } from "courtchamps-shared/helpers";

const PROJECT_ID = "demo-courtchamps";
const HOUR_MS = 60 * 60 * 1000;

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "Run these tests with `npm run test:emulator` so the Firestore emulator is running.",
  );
}

if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });

import { runAutoApproveLadderGames } from "./autoApproveLadderGames";

const db = admin.firestore();
const realFetch = global.fetch;

const clearEmulator = async () => {
  await realFetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR_MS);

const profileDetail = (xp: number) => ({
  XP: xp,
  prevGameXP: 0,
  numberOfGamesPlayed: 0,
  numberOfWins: 0,
  numberOfLosses: 0,
  winPercentage: 0,
  highestWinStreak: 0,
  highestLossStreak: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  totalPoints: 0,
  demonWin: 0,
  totalPointDifference: 0,
  lastActive: null,
});

const userDoc = (userId: string) => ({
  userId,
  username: userId,
  firstName: userId,
  lastName: "Player",
  profileDetail: profileDetail(100),
});

const participantDoc = (userId: string) => ({
  userId,
  username: userId,
  competitionXP: 100,
  prevGameXP: 0,
  numberOfGamesPlayed: 0,
  numberOfWins: 0,
  numberOfLosses: 0,
  winPercentage: 0,
  resultLog: [],
  matchResultLog: [],
  pointDifferenceLog: [],
  totalPointDifference: 0,
  averagePointDifference: 0,
  currentStreak: { type: null, count: 0 },
  highestWinStreak: 0,
  highestLossStreak: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  demonWin: 0,
  totalPoints: 0,
});

const pendingGame = (gameId: string, reporter: string, opponent: string) => ({
  gameId,
  gameNumber: 1,
  date: "17-09-2026",
  reporter,
  approvalStatus: "pending",
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  approvers: [],
  team1: { player1: { userId: reporter }, player2: null, score: 21 },
  team2: { player1: { userId: opponent }, player2: null, score: 15 },
  result: {
    winner: { team: "Team 1", players: [reporter], score: 21 },
    loser: { team: "Team 2", players: [opponent], score: 15 },
  },
});

const shell = (gameId: string, gameNumber: number) => ({
  gameId,
  gameNumber,
  reporter: "",
  approvalStatus: "",
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  approvers: [],
  team1: { player1: null, player2: null, score: 0 },
  team2: { player1: null, player2: null, score: 0 },
  result: null,
});

const seedLadder = (
  ladderId: string,
  status: string = LADDER_STATUS.REGISTRATION_CLOSED,
) =>
  db.doc(`ladders/${ladderId}`).set({
    name: ladderId,
    ladderType: LADDER_TYPE.SINGLES,
    status,
  });

const seedMatch = async ({
  ladderId,
  matchId,
  reporter,
  opponent,
  reportedHoursAgo = 25,
  extraGames = [] as Record<string, unknown>[],
  bestOf = 3,
}: {
  ladderId: string;
  matchId: string;
  reporter: string;
  opponent: string;
  reportedHoursAgo?: number;
  extraGames?: Record<string, unknown>[];
  bestOf?: number;
}) => {
  const gameId = `${matchId}-g1`;
  await Promise.all([
    db.doc(`users/${reporter}`).set(userDoc(reporter)),
    db.doc(`users/${opponent}`).set(userDoc(opponent)),
    db
      .doc(`ladders/${ladderId}/ladderParticipants/${reporter}`)
      .set(participantDoc(reporter)),
    db
      .doc(`ladders/${ladderId}/ladderParticipants/${opponent}`)
      .set(participantDoc(opponent)),
    db.doc(`ladders/${ladderId}/ladderMatches/${matchId}`).set({
      ladderMatchId: matchId,
      bestOf,
      participants: [reporter, opponent],
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      ladderType: LADDER_TYPE.SINGLES,
      games: [
        pendingGame(gameId, reporter, opponent),
        shell(`${matchId}-g2`, 2),
        shell(`${matchId}-g3`, 3),
        ...extraGames,
      ],
      gameReportedAt: { [gameId]: hoursAgo(reportedHoursAgo) },
    }),
  ]);
  return gameId;
};

const playerApproves = (
  ladderId: string,
  matchId: string,
  gameId: string,
  userId: string,
) =>
  db.runTransaction(async (transaction) => {
    const ladderRef = db.doc(`ladders/${ladderId}`);
    const matchRef = db.doc(`ladders/${ladderId}/ladderMatches/${matchId}`);
    const [matchSnap, ladderSnap] = await Promise.all([
      transaction.get(matchRef),
      transaction.get(ladderRef),
    ]);
    const match = matchSnap.data() as never as {
      participants: string[];
    };
    const [participantSnaps, userSnaps] = await Promise.all([
      Promise.all(
        match.participants.map((uid) =>
          transaction.get(db.doc(`ladders/${ladderId}/ladderParticipants/${uid}`)),
        ),
      ),
      Promise.all(
        match.participants.map((uid) => transaction.get(db.doc(`users/${uid}`))),
      ),
    ]);
    const plan = await planLadderGameApproval({
      match: match as never,
      gameId,
      actor: { kind: "user", userId, username: userId },
      ladderStatus: ladderSnap.data()?.status,
      participants: participantSnaps.map((snap) => snap.data() as never),
      users: userSnaps.map((snap) => snap.data() as never),
      ladderTeams: [],
      now: new Date(),
    });
    if (!plan.ok) return false;
    plan.participants.forEach((p) => {
      transaction.set(
        db.doc(`ladders/${ladderId}/ladderParticipants/${p.userId}`),
        p as never,
      );
    });
    plan.users.forEach((u) => {
      transaction.update(db.doc(`users/${u.userId}`), {
        profileDetail: u.profileDetail,
      });
    });
    transaction.update(matchRef, plan.matchUpdate as never);
    return true;
  });

const read = async (path: string) =>
  (await db.doc(path).get()).data() as Record<string, any>;

const expectScoredOnce = async (
  ladderId: string,
  matchId: string,
  winner: string,
  loser: string,
) => {
  const match = await read(`ladders/${ladderId}/ladderMatches/${matchId}`);
  expect(match.games[0].approvalStatus).toBe("approved");
  expect(match.games[0].approvers).toHaveLength(1);
  const winnerDoc = await read(`ladders/${ladderId}/ladderParticipants/${winner}`);
  const loserDoc = await read(`ladders/${ladderId}/ladderParticipants/${loser}`);
  expect(winnerDoc.numberOfWins).toBe(1);
  expect(winnerDoc.numberOfGamesPlayed).toBe(1);
  expect(loserDoc.numberOfLosses).toBe(1);
  expect(winnerDoc.competitionXP).toBe(120);
  const winnerUser = await read(`users/${winner}`);
  expect(winnerUser.profileDetail.XP).toBe(120);
  expect(winnerUser.profileDetail.numberOfGamesPlayed).toBe(1);
};

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

beforeEach(async () => {
  await clearEmulator();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("runAutoApproveLadderGames against the Firestore emulator", () => {
  it("auto-approves and scores an overdue game once, ageing it from the server report time", async () => {
    await seedLadder("L1");
    await seedMatch({ ladderId: "L1", matchId: "m1", reporter: "a", opponent: "b" });

    await runAutoApproveLadderGames();

    await expectScoredOnce("L1", "m1", "a", "b");
    const match = await read("ladders/L1/ladderMatches/m1");
    expect(match.games[0].autoApproved).toBe(true);
    expect(match.games[0].approvers).toEqual([
      { userId: "system", username: "AutoApproval" },
    ]);
  });

  it("leaves a game reported under 24h ago alone, whatever its client createdAt says", async () => {
    await seedLadder("L1");
    await seedMatch({
      ladderId: "L1",
      matchId: "m1",
      reporter: "a",
      opponent: "b",
      reportedHoursAgo: 2,
    });
    const seeded = await read("ladders/L1/ladderMatches/m1");
    await db.doc("ladders/L1/ladderMatches/m1").update({
      games: seeded.games.map((game: Record<string, any>, index: number) =>
        index === 0 ? { ...game, createdAt: hoursAgo(100) } : game,
      ),
    });

    await runAutoApproveLadderGames();

    const match = await read("ladders/L1/ladderMatches/m1");
    expect(match.games[0].approvalStatus).toBe("pending");
    expect((await read("ladders/L1/ladderParticipants/a")).numberOfWins).toBe(0);
  });

  it("leaves every game alone once the ladder is in playoffs", async () => {
    await seedLadder("L1", LADDER_STATUS.PLAYOFFS);
    await seedMatch({ ladderId: "L1", matchId: "m1", reporter: "a", opponent: "b" });

    await runAutoApproveLadderGames();

    const match = await read("ladders/L1/ladderMatches/m1");
    expect(match.games[0].approvalStatus).toBe("pending");
    expect((await read("users/a")).profileDetail.XP).toBe(100);
  });

  it("scores once when two job runs overlap", async () => {
    await seedLadder("L1");
    await seedMatch({ ladderId: "L1", matchId: "m1", reporter: "a", opponent: "b" });

    await Promise.all([
      runAutoApproveLadderGames(),
      runAutoApproveLadderGames(),
      runAutoApproveLadderGames(),
    ]);

    await expectScoredOnce("L1", "m1", "a", "b");
  });

  it("scores once when a player approves at the same moment the job runs", async () => {
    const pairs = Array.from({ length: 25 }, (_, i) => ({
      matchId: `m${i}`,
      reporter: `r${i}`,
      opponent: `o${i}`,
    }));
    await seedLadder("L1");
    const gameIds = await Promise.all(
      pairs.map((pair) => seedMatch({ ladderId: "L1", ...pair })),
    );

    await Promise.all([
      runAutoApproveLadderGames(),
      ...pairs.map((pair, i) =>
        playerApproves("L1", pair.matchId, gameIds[i], pair.opponent),
      ),
    ]);

    for (const pair of pairs) {
      await expectScoredOnce("L1", pair.matchId, pair.reporter, pair.opponent);
    }
  });

  it("completes the match once when the auto-approved game is the decider", async () => {
    await seedLadder("L1");
    const approved = (n: number) => ({
      ...pendingGame(`m1-g${n}`, "a", "b"),
      gameNumber: n,
      approvalStatus: "approved",
      numberOfApprovals: 1,
      approvers: [{ userId: "b", username: "b" }],
    });
    await db.doc("users/a").set(userDoc("a"));
    await db.doc("users/b").set(userDoc("b"));
    await Promise.all(
      ["a", "b"].map((id) =>
        db.doc(`ladders/L1/ladderParticipants/${id}`).set(participantDoc(id)),
      ),
    );
    await db.doc("ladders/L1/ladderMatches/m1").set({
      ladderMatchId: "m1",
      bestOf: 3,
      participants: ["a", "b"],
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      ladderType: LADDER_TYPE.SINGLES,
      games: [approved(1), pendingGame("m1-g2", "a", "b"), shell("m1-g3", 3)].map(
        (game, index) => ({ ...game, gameNumber: index + 1 }),
      ),
      gameReportedAt: { "m1-g2": hoursAgo(30) },
    });

    await Promise.all([runAutoApproveLadderGames(), runAutoApproveLadderGames()]);

    const match = await read("ladders/L1/ladderMatches/m1");
    expect(match.matchStatus).toBe(LADDER_MATCH_STATUS.COMPLETED);
    const winner = await read("ladders/L1/ladderParticipants/a");
    expect(winner.matchResultLog).toEqual(["W"]);
    expect((await read("ladders/L1/ladderParticipants/b")).matchResultLog).toEqual([
      "L",
    ]);
  });

  it("holds completion while another game in the match is disputed", async () => {
    await seedLadder("L1");
    await seedMatch({
      ladderId: "L1",
      matchId: "m1",
      reporter: "a",
      opponent: "b",
      bestOf: 3,
    });
    const snap = await read("ladders/L1/ladderMatches/m1");
    const games = snap.games.map((game: Record<string, any>, index: number) =>
      index === 1
        ? { ...pendingGame("m1-g2", "a", "b"), gameNumber: 2, approvalStatus: "disputed" }
        : game,
    );
    games[0] = {
      ...games[0],
      approvalStatus: "approved",
      approvers: [{ userId: "b", username: "b" }],
    };
    games[2] = {
      ...pendingGame("m1-g3", "a", "b"),
      gameNumber: 3,
    };
    await db.doc("ladders/L1/ladderMatches/m1").update({
      games,
      gameReportedAt: { "m1-g3": hoursAgo(30) },
    });

    await runAutoApproveLadderGames();

    const match = await read("ladders/L1/ladderMatches/m1");
    expect(match.games[2].approvalStatus).toBe("approved");
    expect(match.matchStatus).toBe(LADDER_MATCH_STATUS.ACCEPTED);
  });

  it("keeps processing the other matches when one cannot be read", async () => {
    await seedLadder("L1");
    await seedMatch({ ladderId: "L1", matchId: "bad", reporter: "x", opponent: "y" });
    await db.doc("ladders/L1/ladderMatches/bad").update({ games: "corrupt" });
    await seedMatch({ ladderId: "L1", matchId: "good", reporter: "a", opponent: "b" });
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    await runAutoApproveLadderGames();

    await expectScoredOnce("L1", "good", "a", "b");
  });
});
