import { calculateTeamPerformance } from "./calculateTeamPerformance";

describe("calculateTeamPerformance (Doubles, id-based keys)", () => {
  const mockRetrieveTeams = jest.fn();

  // --- Mock players (User/Player labels) ---
  const user1Player1 = {
    userId: "user1",
    firstName: "Player",
    lastName: "One",
    username: "player1",
    displayName: "Player 1",
  };
  const user2Player2 = {
    userId: "user2",
    firstName: "Player",
    lastName: "Two",
    username: "player2",
    displayName: "Player 2",
  };
  const user3Player3 = {
    userId: "user3",
    firstName: "Player",
    lastName: "Three",
    username: "player3",
    displayName: "Player 3",
  };
  const user4Player4 = {
    userId: "user4",
    firstName: "Player",
    lastName: "Four",
    username: "player4",
    displayName: "Player 4",
  };

  // --- Game: Team 1 (Player3 & Player4) beats Team 2 (Player1 & Player2) 21–1 ---
  const baseGame = {
    date: "01-02-2025",
    gameId: "01-02-2025-game-1",
    gamescore: "21 - 1",
    result: {
      winner: {
        players: [user3Player3.displayName, user4Player4.displayName],
        score: 21,
        team: "Team 1",
      },
      loser: {
        players: [user1Player1.displayName, user2Player2.displayName],
        score: 1,
        team: "Team 2",
      },
    },
    team1: { player1: user3Player3, player2: user4Player4, score: 21 },
    team2: { player1: user1Player1, player2: user2Player2, score: 1 },
  };

  // --- Existing teams (id-based keys + display names for UI) ---
  const existingTeams = [
    {
      // Loser team
      teamKey: "user1-user2",
      team: [user1Player1.displayName, user2Player2.displayName].sort(),
      numberOfWins: 3,
      numberOfLosses: 4,
      numberOfGamesPlayed: 7,
      resultLog: ["L", "L", "L"],
      currentStreak: -3,
      pointDifferenceLog: [-10, -8, -5],
      averagePointDifference: -7.67,
      highestLossStreak: 4,
      highestWinStreak: 2,
      winStreak3: 1,
      winStreak5: 0,
      winStreak7: 0,
      totalPointDifference: -23,
      demonWin: 0,
      lossesTo: {},
      rival: null,
    },
    {
      // Winner team
      teamKey: "user3-user4",
      team: [user3Player3.displayName, user4Player4.displayName].sort(),
      numberOfWins: 6,
      numberOfLosses: 1,
      numberOfGamesPlayed: 7,
      resultLog: ["W", "W", "L"],
      currentStreak: 2,
      pointDifferenceLog: [10, 12, 7],
      averagePointDifference: 9.67,
      highestLossStreak: 1,
      highestWinStreak: 2,
      winStreak3: 1,
      winStreak5: 0,
      winStreak7: 0,
      totalPointDifference: 29,
      demonWin: 0,
      lossesTo: {},
      rival: null,
    },
  ];

  // fresh deep copy so each test starts clean
  const getInitialTeams = () => JSON.parse(JSON.stringify(existingTeams));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates core stats (wins/losses, games played)", async () => {
    mockRetrieveTeams.mockResolvedValueOnce(getInitialTeams());

    const [winner, loser] = await calculateTeamPerformance(
      baseGame,
      mockRetrieveTeams,
      "league123"
    );

    // Winner stats
    expect(winner.teamKey).toBe("user3-user4");
    expect(winner.numberOfWins).toBe(7);
    expect(winner.numberOfGamesPlayed).toBe(8);

    // Loser stats
    expect(loser.teamKey).toBe("user1-user2");
    expect(loser.numberOfLosses).toBe(5);
    expect(loser.numberOfGamesPlayed).toBe(8);
  });

  it("updates result logs", async () => {
    mockRetrieveTeams.mockResolvedValueOnce(getInitialTeams());

    const [winner, loser] = await calculateTeamPerformance(
      baseGame,
      mockRetrieveTeams,
      "league123"
    );

    expect(winner.resultLog).toEqual(["W", "W", "L", "W"]);
    expect(loser.resultLog).toEqual(["L", "L", "L", "L"]);
  });

  it("updates win/loss streaks", async () => {
    mockRetrieveTeams.mockResolvedValueOnce(getInitialTeams());

    const [winner, loser] = await calculateTeamPerformance(
      baseGame,
      mockRetrieveTeams,
      "league123"
    );

    expect(winner.currentStreak).toBe(1);
    expect(winner.highestWinStreak).toBe(2);

    expect(loser.currentStreak).toBe(-4);
    expect(loser.highestLossStreak).toBe(4);
  });

  it("updates point-difference logs and averages", async () => {
    mockRetrieveTeams.mockResolvedValueOnce(getInitialTeams());

    const [winner, loser] = await calculateTeamPerformance(
      baseGame,
      mockRetrieveTeams,
      "league123"
    );

    expect(winner.pointDifferenceLog).toEqual([10, 12, 7, 20]);
    expect(winner.averagePointDifference).toBeCloseTo(12.25, 2);

    expect(loser.pointDifferenceLog).toEqual([-10, -8, -5, -20]);
    expect(loser.averagePointDifference).toBeCloseTo(-10.75, 2);
  });

  it("sets rival only after multiple losses to the same opponent", async () => {
    // First match
    mockRetrieveTeams.mockResolvedValueOnce(getInitialTeams());
    const [winnerAfter1, loserAfter1] = await calculateTeamPerformance(
      baseGame,
      mockRetrieveTeams,
      "league123"
    );

    // After 1 loss: head-to-head incremented; rival still null
    expect(loserAfter1.lossesTo[winnerAfter1.teamKey]).toBe(1);
    expect(loserAfter1.rival).toBeNull();

    // Second match: same teams again (use updated state from first match)
    mockRetrieveTeams.mockResolvedValueOnce([winnerAfter1, loserAfter1]);
    const game2 = {
      ...baseGame,
      date: "02-02-2025",
      gameId: "02-02-2025-game-2",
    };

    const [winnerAfter2, loserAfter2] = await calculateTeamPerformance(
      game2,
      mockRetrieveTeams,
      "league123"
    );

    expect(loserAfter2.lossesTo[winnerAfter2.teamKey]).toBe(2);
    expect(loserAfter2.rival).toEqual({
      rivalKey: winnerAfter2.teamKey,
      rivalPlayers: winnerAfter2.team,
    });
  });
});
