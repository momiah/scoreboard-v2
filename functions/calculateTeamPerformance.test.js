import { calculateTeamPerformance } from "./calculateTeamPerformance";

describe("calculateTeamPerformance with win streaks", () => {
  const mockRetrieveTeams = jest.fn();

  const game = {
    date: "01-02-2025",
    gameId: "01-02-2025-game-1",
    gamescore: "21 - 1",
    result: {
      loser: { players: ["player1", "player2"], score: 1, team: "Team 2" },
      winner: { players: ["player3", "player4"], score: 21, team: "Team 1" },
    },
    team1: { player1: "test2", player2: "test1", score: 21 },
    team2: { player1: "test3", player2: "test4", score: 1 },
  };

  const existingTeams = [
    {
      teamKey: "player1-player2", // Correctly normalized format
      team: ["player1", "player2"],
      numberOfWins: 3,
      numberOfLosses: 4,
      numberOfGamesPlayed: 7,
      resultLog: ["L", "L", "L"],
      currentStreak: -3,
      pointDifferenceLog: [-10, -8, -5],
      averagePointDifference: -7.67,
      highestLossStreak: 4,
      highestWinStreak: 2,
      pointEfficiency: 0.42,
      winStreak3: 1,
      winStreak5: 0,
      winStreak7: 0,
      lossesTo: {},
      rival: null,
    },
    {
      teamKey: "player3-player4",
      team: ["player3", "player4"],
      numberOfWins: 6,
      numberOfLosses: 1,
      numberOfGamesPlayed: 7,
      resultLog: ["W", "W", "L"],
      currentStreak: 2,
      pointDifferenceLog: [10, 12, 7],
      averagePointDifference: 9.67,
      highestLossStreak: 1,
      highestWinStreak: 3,
      pointEfficiency: 0.85,
      winStreak3: 1,
      winStreak5: 0,
      winStreak7: 0,
      lossesTo: {},
      rival: null,
    },
  ];

  mockRetrieveTeams.mockResolvedValue(existingTeams);

  it("should update the teams' performance and win streaks correctly", async () => {
    const [winnerTeam, loserTeam] = await calculateTeamPerformance(
      game,
      mockRetrieveTeams,
      "league123"
    );

    // Verify winner team stats
    expect(winnerTeam.numberOfWins).toBe(7);
    expect(winnerTeam.numberOfGamesPlayed).toBe(8);
    expect(winnerTeam.resultLog).toEqual(["W", "W", "L", "W"]);
    expect(winnerTeam.currentStreak).toBe(1);
    expect(winnerTeam.highestWinStreak).toBe(2);
    expect(winnerTeam.winStreak3).toBe(1);
    expect(winnerTeam.pointEfficiency).toBeGreaterThan(0);
    expect(winnerTeam.pointDifferenceLog).toEqual([10, 12, 7, 20]);
    expect(winnerTeam.averagePointDifference).toBeCloseTo(12.25, 2);

    // Verify loser team stats
    expect(loserTeam.numberOfLosses).toBe(5);
    expect(loserTeam.numberOfGamesPlayed).toBe(8);
    expect(loserTeam.resultLog).toEqual(["L", "L", "L", "L"]);
    expect(loserTeam.currentStreak).toBe(-4);
    expect(loserTeam.highestLossStreak).toBe(4);
    expect(loserTeam.rival.rivalKey).toBe(winnerTeam.teamKey);
    expect(loserTeam.lossesTo[winnerTeam.teamKey]).toBe(1);
    expect(loserTeam.pointDifferenceLog).toEqual([-10, -8, -5, -20]);
    expect(loserTeam.averagePointDifference).toBeCloseTo(-10.75, 2);

    // Verify team keys are normalized and consistent
    expect(winnerTeam.teamKey).toBe("player3-player4");
    expect(loserTeam.teamKey).toBe("player1-player2");
  });
});
