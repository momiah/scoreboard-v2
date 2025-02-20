import { calculatePlayerPerformance } from "./calculatePlayerPerformance";

describe("calculatePlayerPerformance function", () => {
  //   const mockRetrievePlayers = jest.fn();

  const mockGame = {
    date: "01-02-2025",
    gameId: "01-02-2025-game-1",
    gamescore: "21 - 1",
    result: {
      winner: { players: ["player1", "player2"], score: 21, team: "Team 1" },
      loser: { players: ["player3", "player4"], score: 1, team: "Team 2" },
    },
  };

  const mockPlayers = [
    {
      id: "player1",
      XP: 100,
      numberOfWins: 2,
      numberOfLosses: 1,
      numberOfGamesPlayed: 3,
      resultLog: ["W", "L", "W"],
      currentStreak: { type: "W", count: 1 },
      highestWinStreak: 1,
      highestLossStreak: 1,
      pointDifferenceLog: [10, -5, 15],
      averagePointDifference: 6.66,
      totalPoints: 42,
      demonWin: 2,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
    },
    {
      id: "player2",
      XP: 120,
      numberOfWins: 2,
      numberOfLosses: 1,
      numberOfGamesPlayed: 3,
      resultLog: ["L", "W", "W"],
      currentStreak: { type: "W", count: 2 },
      highestWinStreak: 3,
      highestLossStreak: 1,
      pointDifferenceLog: [-5, 10, 20],
      averagePointDifference: 6.66,
      totalPoints: 42,
      demonWin: 2,
      winStreak3: 1,
      winStreak5: 0,
      winStreak7: 0,
    },
    {
      id: "player3",
      XP: 90,
      numberOfWins: 0,
      numberOfLosses: 3,
      numberOfGamesPlayed: 3,
      resultLog: ["L", "L", "L"],
      currentStreak: { type: "L", count: -3 },
      highestWinStreak: 0,
      highestLossStreak: 3,
      pointDifferenceLog: [-10, -10, -10],
      averagePointDifference: -10,
      totalPoints: 0,
      demonWin: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
    },
    {
      id: "player4",
      XP: 110,
      numberOfWins: 1,
      numberOfLosses: 2,
      numberOfGamesPlayed: 3,
      resultLog: ["L", "W", "L"],
      currentStreak: { type: "L", count: -1 },
      highestWinStreak: 1,
      highestLossStreak: 2,
      pointDifferenceLog: [-10, 5, -5],
      averagePointDifference: -3.33,
      totalPoints: 0,
      demonWin: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
    },
  ];

  it("should update player stats correctly for winners", async () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const updatedPlayers = calculatePlayerPerformance(
      mockGame,
      playersCopy,
      "league123"
    );

    const updatedWinner1 = updatedPlayers.find((p) => p.id === "player1");

    await expect(updatedWinner1.numberOfWins).toBe(3);
    await expect(updatedWinner1.numberOfGamesPlayed).toBe(4);
    await expect(updatedWinner1.resultLog).toEqual(["W", "L", "W", "W"]);
    await expect(updatedWinner1.currentStreak.count).toBe(2);
    await expect(updatedWinner1.totalPoints).toBe(63);
    await expect(updatedWinner1.pointDifferenceLog).toEqual([10, -5, 15, 20]);
    await expect(updatedWinner1.averagePointDifference).toBe(10);
  });

  it("should update player stats correctly for losers", async () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const updatedPlayers = calculatePlayerPerformance(
      mockGame,
      playersCopy,
      "league123"
    );

    const updatedLoser1 = updatedPlayers.find((p) => p.id === "player3");

    await expect(updatedLoser1.numberOfLosses).toBe(4);
    await expect(updatedLoser1.numberOfGamesPlayed).toBe(4);
    await expect(updatedLoser1.resultLog).toEqual(["L", "L", "L", "L"]);
    await expect(updatedLoser1.currentStreak.count).toBe(-4);
    await expect(updatedLoser1.totalPoints).toBe(1);
    await expect(updatedLoser1.pointDifferenceLog).toEqual([
      -10, -10, -10, -20,
    ]);
    await expect(updatedLoser1.averagePointDifference).toBe(-12);
  });

  it("should update streaks correctly for win and loss milestones", async () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const updatedPlayers = calculatePlayerPerformance(
      mockGame,
      playersCopy,
      "league123"
    );

    const updatedWinner1 = updatedPlayers.find((p) => p.id === "player1");

    await await expect(updatedWinner1.winStreak3).toBe(0);
    await expect(updatedWinner1.highestWinStreak).toBe(2);

    const updatedLoser1 = updatedPlayers.find((p) => p.id === "player3");

    await expect(updatedLoser1.highestLossStreak).toBe(4);
  });

  const mockGame2 = {
    date: "01-02-2025",
    gameId: "01-02-2025-game-1",
    gamescore: "21 - 1",
    result: {
      winner: { players: ["player3", "player4"], score: 21, team: "Team 2" },
      loser: { players: ["player1", "player2"], score: 1, team: "Team 1" },
    },
  };

  const mockPlayers2 = [
    {
      id: "player1",
      XP: 1000,
      prevGameXp: 200,
      numberOfWins: 10,
      numberOfLosses: 0,
      numberOfGamesPlayed: 10,
      resultLog: ["W", "W", "W", "W", "W", "W", "W", "W", "W", "W"],
      currentStreak: { type: "W", count: 10 },
      highestWinStreak: 10,
      highestLossStreak: 0,
      pointDifferenceLog: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
      averagePointDifference: 20,
      totalPoints: 200,
      demonWin: 10,
      winStreak3: 1,
      winStreak5: 1,
      winStreak7: 1,
    },
    {
      id: "player2",
      XP: 1000,
      prevGameXp: 200,
      numberOfWins: 10,
      numberOfLosses: 0,
      numberOfGamesPlayed: 10,
      resultLog: ["W", "W", "W", "W", "W", "W", "W", "W", "W", "W"],
      currentStreak: { type: "W", count: 10 },
      highestWinStreak: 10,
      highestLossStreak: 0,
      pointDifferenceLog: [20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
      averagePointDifference: 20,
      totalPoints: 200,
      demonWin: 10,
      winStreak3: 1,
      winStreak5: 1,
      winStreak7: 1,
    },
    {
      id: "player3",
      XP: 100,
      prevGameXp: -200,
      numberOfWins: 0,
      numberOfLosses: 10,
      numberOfGamesPlayed: 3,
      resultLog: ["L", "L", "L", "L", "L", "L", "L", "L", "L", "L"],
      currentStreak: { type: "L", count: -10 },
      highestWinStreak: 0,
      highestLossStreak: 10,
      pointDifferenceLog: [-20, -20, -20, -20, -20, -20, -20, -20, -20, -20],
      averagePointDifference: -20,
      totalPoints: 10,
      demonWin: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
    },
    {
      id: "player4",
      XP: 100,
      prevGameXp: -200,
      numberOfWins: 0,
      numberOfLosses: 10,
      numberOfGamesPlayed: 3,
      resultLog: ["L", "L", "L", "L", "L", "L", "L", "L", "L", "L"],
      currentStreak: { type: "L", count: -10 },
      highestWinStreak: 0,
      highestLossStreak: 10,
      pointDifferenceLog: [-20, -20, -20, -20, -20, -20, -20, -20, -20, -20],
      averagePointDifference: -20,
      totalPoints: 10,
      demonWin: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
    },
  ];

  it("should update XP for streaks and demonWin", async () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers2));
    const updatedPlayers = calculatePlayerPerformance(
      mockGame2,
      playersCopy,
      "league123"
    );

    const updatedWinner1 = updatedPlayers.find((p) => p.id === "player3");

    await expect(updatedWinner1.XP).toBe(240);
  });

  //   it("should handle point difference log trimming to the last 10 entries", async () => {
  //     // Simulate a player with a full point difference log
  //     const playerWithFullLog = {
  //       ...mockPlayers[0],
  //       pointDifferenceLog: [10, 12, 15, 8, 7, 6, 9, 10, 5, 11], // Full log
  //     };

  //     mockPlayers.mockResolvedValueOnce([
  //       playerWithFullLog,
  //       ...mockPlayers.slice(1),
  //     ]);

  //     const updatedPlayers = calculatePlayerPerformance(
  //       mockGame,
  //       mockPlayers,
  //       "league123"
  //     );

  //     const updatedPlayer = updatedPlayers.find((p) => p.id === "player1");

  //     // The log should contain the last 10 entries including the new point difference
  //     await expect(updatedPlayer.pointDifferenceLog).toEqual([
  //       12, 15, 8, 7, 6, 9, 10, 5, 11, 20,
  //     ]);
  //     await expect(updatedPlayer.averagePointDifference).toBeCloseTo(10.3, 1); // Recalculated average
  //   });

  //   it("should not update players not involved in the game", async () => {
  //     const updatedPlayers = calculatePlayerPerformance(
  //       mockGame,
  //       mockPlayers,
  //       "league123"
  //     );

  //     const unaffectedPlayer = updatedPlayers.find(
  //       (p) => p.id === "unrelatedPlayer"
  //     );

  //     await expect(unaffectedPlayer).toBeUndefined(); // Player not updated
  //   });
});
