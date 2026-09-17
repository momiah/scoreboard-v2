import { scoreSinglesLadderGame } from "./scoreSinglesLadderGame";

const makeUser = (userId, XP) => ({
  userId,
  username: userId,
  profileDetail: {
    XP,
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
  },
});

const makeParticipant = (userId, competitionXP, overrides = {}) => ({
  userId,
  username: userId,
  competitionXP,
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
  ...overrides,
});

// Team 1 (winnerId) beats Team 2 (loserId).
const makeGame = (winnerScore, loserScore) => ({
  gameId: "g1",
  date: "17-09-2026",
  team1: { player1: { userId: "winnerId" } },
  team2: { player1: { userId: "loserId" } },
  result: {
    winner: { team: "Team 1", players: ["winnerId"], score: winnerScore },
    loser: { team: "Team 2", players: ["loserId"], score: loserScore },
  },
});

describe("scoreSinglesLadderGame", () => {
  it("accrues per-ladder CP and global XP, and records the match result", () => {
    const users = [makeUser("winnerId", 500), makeUser("loserId", 500)];
    const participants = [
      makeParticipant("winnerId", 100),
      makeParticipant("loserId", 100),
    ];

    const { matchCompleted } = scoreSinglesLadderGame({
      game: makeGame(21, 5), // 16-point margin → demon/assassin
      participants,
      users,
      matchDecided: true,
      matchWinnerSide: "Team 1",
    });

    const winner = participants.find((p) => p.userId === "winnerId");
    const loser = participants.find((p) => p.userId === "loserId");

    // Per-ladder CP moves with the game (winner up, loser floored at 0)
    expect(winner.prevGameXP).toBeGreaterThan(0);
    expect(winner.competitionXP).toBe(100 + winner.prevGameXP);
    expect(loser.competitionXP).toBeGreaterThanOrEqual(0);
    expect(loser.competitionXP).toBeLessThan(100);

    // Win/loss + demon (assassin) on the participant
    expect(winner.numberOfWins).toBe(1);
    expect(winner.demonWin).toBe(1);
    expect(loser.numberOfLosses).toBe(1);

    // Match result form gets one entry each, and the match completes
    expect(winner.matchResultLog).toEqual(["W"]);
    expect(loser.matchResultLog).toEqual(["L"]);
    expect(matchCompleted).toBe(true);

    // Global profile (rank medal XP) accumulates the same delta
    const winnerGlobal = users.find((u) => u.userId === "winnerId").profileDetail;
    expect(winnerGlobal.XP).toBeGreaterThan(500);
    expect(winnerGlobal.numberOfWins).toBe(1);
    expect(winnerGlobal.demonWin).toBe(1);
  });

  it("does not push a match result until the match is decided", () => {
    const users = [makeUser("winnerId", 500), makeUser("loserId", 500)];
    const participants = [
      makeParticipant("winnerId", 100),
      makeParticipant("loserId", 100),
    ];

    const { matchCompleted } = scoreSinglesLadderGame({
      game: makeGame(21, 18),
      participants,
      users,
      matchDecided: false,
      matchWinnerSide: null,
    });

    expect(matchCompleted).toBe(false);
    expect(participants[0].matchResultLog).toEqual([]);
    // The game itself still scored (CP moved), only the match form waits.
    expect(participants[0].numberOfWins).toBe(1);
  });
});
