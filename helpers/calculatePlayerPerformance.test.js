import { calculatePlayerPerformance } from "./calculatePlayerPerformance";
import moment from "moment";

describe("calculatePlayerPerformance function", () => {
  const USER_1 = "hC0nMjw1ELflZzRW50lelZ6eLu43"; // PlayerOne
  const USER_2 = "Yt82kjhF4nMbBc29qQwA3E7PlzXa"; // PlayerTwo
  const USER_3 = "Pp93LmzKq8WjNa10rH4dVb72fRtC"; // PlayerThree
  const USER_4 = "Mx71ZaLp2KrNf48bQe6TsUj9yVoW"; // PlayerFour

  const PLAYER_USERNAME_1 = "PlayerOne";
  const PLAYER_USERNAME_2 = "PlayerTwo";
  const PLAYER_USERNAME_3 = "PlayerThree";
  const PLAYER_USERNAME_4 = "PlayerFour";

  const mockGame = {
    date: "01-02-2025",
    gameId: "01-02-2025-game-1",
    gamescore: "21 - 1",
    result: {
      winner: {
        players: ["Player O", "Player T"],
        score: 21,
        team: "Team 1",
      },
      loser: {
        players: ["Player T", "Player F"],
        score: 1,
        team: "Team 2",
      },
    },
    team1: {
      player1: { userId: USER_1, username: PLAYER_USERNAME_1 },
      player2: { userId: USER_2, username: PLAYER_USERNAME_2 },
      score: 21,
    },
    team2: {
      player1: { userId: USER_3, username: PLAYER_USERNAME_3 },
      player2: { userId: USER_4, username: PLAYER_USERNAME_4 },
      score: 1,
    },
  };

  const mockUsers = [
    {
      userId: USER_1,
      username: PLAYER_USERNAME_1,
      firstName: "Player",
      lastName: "One",
      profileDetail: {
        numberOfWins: 2,
        numberOfLosses: 1,
        numberOfGamesPlayed: 3,
        winPercentage: 66.67,
        totalPoints: 42,
        totalPointDifference: 20,
        highestWinStreak: 1,
        highestLossStreak: 1,
        winStreak3: 0,
        winStreak5: 0,
        winStreak7: 0,
        demonWin: 2,
        averagePointDifference: 6,
        lastActive: "",
        XP: 100,
      },
    },
    {
      userId: USER_2,
      username: PLAYER_USERNAME_2,
      firstName: "Player",
      lastName: "Two",
      profileDetail: {
        numberOfWins: 2,
        numberOfLosses: 1,
        numberOfGamesPlayed: 3,
        winPercentage: 66.67,
        totalPoints: 42,
        totalPointDifference: 25,
        highestWinStreak: 2, // fixed
        highestLossStreak: 1,
        winStreak3: 0, // fixed
        winStreak5: 0,
        winStreak7: 0,
        demonWin: 2,
        averagePointDifference: 8,
        lastActive: "",
        XP: 120,
      },
    },
    {
      userId: USER_3,
      username: PLAYER_USERNAME_3,
      firstName: "Player",
      lastName: "Three",
      profileDetail: {
        numberOfWins: 0,
        numberOfLosses: 3,
        numberOfGamesPlayed: 3,
        winPercentage: 0,
        totalPoints: 0,
        totalPointDifference: -30,
        highestWinStreak: 0,
        highestLossStreak: 3,
        winStreak3: 0,
        winStreak5: 0,
        winStreak7: 0,
        demonWin: 0,
        averagePointDifference: -10,
        lastActive: "",
        XP: 90,
      },
    },
    {
      userId: USER_4,
      username: PLAYER_USERNAME_4,
      firstName: "Player",
      lastName: "Four",
      profileDetail: {
        numberOfWins: 1,
        numberOfLosses: 2,
        numberOfGamesPlayed: 3,
        winPercentage: 33.33,
        totalPoints: 0,
        totalPointDifference: -10,
        highestWinStreak: 1,
        highestLossStreak: 2,
        winStreak3: 0,
        winStreak5: 0,
        winStreak7: 0,
        demonWin: 0,
        averagePointDifference: -3,
        lastActive: "",
        XP: 110,
      },
    },
  ];

  const mockPlayers = [
    {
      userId: USER_1,
      username: PLAYER_USERNAME_1,
      firstName: "Player",
      lastName: "One",
      numberOfWins: 2,
      numberOfLosses: 1,
      numberOfGamesPlayed: 3,
      winPercentage: 66.67,
      resultLog: ["W", "L", "W"],
      currentStreak: { type: "W", count: 1 },
      highestWinStreak: 1,
      highestLossStreak: 1,
      pointDifferenceLog: [10, -5, 15],
      averagePointDifference: 7,
      totalPointDifference: 20,
      totalPoints: 42,
      demonWin: 2,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      prevGameXP: 0,
      lastActive: "",
    },
    {
      userId: USER_2,
      username: PLAYER_USERNAME_2,
      firstName: "Player",
      lastName: "Two",
      numberOfWins: 2,
      numberOfLosses: 1,
      numberOfGamesPlayed: 3,
      winPercentage: 66.67,
      resultLog: ["L", "W", "W"],
      currentStreak: { type: "W", count: 2 },
      highestWinStreak: 2,
      highestLossStreak: 1,
      pointDifferenceLog: [-5, 10, 20],
      averagePointDifference: 8,
      totalPointDifference: 25,
      totalPoints: 42,
      demonWin: 2,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      prevGameXP: 0,
      lastActive: "",
    },
    {
      userId: USER_3,
      username: PLAYER_USERNAME_3,
      firstName: "Player",
      lastName: "Three",
      numberOfWins: 0,
      numberOfLosses: 3,
      numberOfGamesPlayed: 3,
      winPercentage: 0,
      resultLog: ["L", "L", "L"],
      currentStreak: { type: "L", count: -3 },
      highestWinStreak: 0,
      highestLossStreak: 3,
      pointDifferenceLog: [-10, -10, -10],
      averagePointDifference: -10,
      totalPointDifference: -30,
      totalPoints: 0,
      demonWin: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      prevGameXP: 0,
      lastActive: "",
    },
    {
      userId: USER_4,
      username: PLAYER_USERNAME_4,
      firstName: "Player",
      lastName: "Four",
      numberOfWins: 1,
      numberOfLosses: 2,
      numberOfGamesPlayed: 3,
      winPercentage: 33.33,
      resultLog: ["L", "W", "L"],
      currentStreak: { type: "L", count: -1 },
      highestWinStreak: 1,
      highestLossStreak: 2,
      pointDifferenceLog: [-10, 5, -5],
      averagePointDifference: -3,
      totalPointDifference: -10,
      totalPoints: 0,
      demonWin: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      prevGameXP: 0,
      lastActive: "",
    },
  ];

  it("should update player stats correctly for winners", () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    const result = calculatePlayerPerformance(mockGame, playersCopy, usersCopy);

    const updatedWinner1 = result.playersToUpdate.find(
      (p) => p.username === PLAYER_USERNAME_1
    );
    const updatedWinner1User = result.usersToUpdate.find(
      (u) => u.userId === USER_1
    );

    // Player object checks
    expect(updatedWinner1.numberOfWins).toBe(3);
    expect(updatedWinner1.numberOfGamesPlayed).toBe(4);
    expect(updatedWinner1.resultLog).toEqual(["W", "L", "W", "W"]);
    expect(updatedWinner1.currentStreak.count).toBe(2);
    expect(updatedWinner1.totalPoints).toBe(63);
    expect(updatedWinner1.pointDifferenceLog).toEqual([10, -5, 15, 20]);
    expect(updatedWinner1.averagePointDifference).toBe(10);

    // User profileDetail checks
    expect(updatedWinner1User.profileDetail.numberOfWins).toBe(3);
    expect(updatedWinner1User.profileDetail.numberOfGamesPlayed).toBe(4);
    expect(updatedWinner1User.profileDetail.totalPoints).toBe(63);
    expect(updatedWinner1User.profileDetail.XP).toBeGreaterThan(100); // Should increase from winning
  });

  it("should update player stats correctly for losers", () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    const result = calculatePlayerPerformance(mockGame, playersCopy, usersCopy);

    const updatedLoser1 = result.playersToUpdate.find(
      (p) => p.username === PLAYER_USERNAME_3
    );

    const updatedLoser1User = result.usersToUpdate.find(
      (u) => u.userId === USER_3
    );

    // Player object checks
    expect(updatedLoser1.numberOfLosses).toBe(4);
    expect(updatedLoser1.numberOfGamesPlayed).toBe(4);
    expect(updatedLoser1.resultLog).toEqual(["L", "L", "L", "L"]);
    expect(updatedLoser1.currentStreak.count).toBe(-4);
    expect(updatedLoser1.totalPoints).toBe(1);
    expect(updatedLoser1.pointDifferenceLog).toEqual([-10, -10, -10, -20]);
    expect(updatedLoser1.averagePointDifference).toBe(-12);

    // User profileDetail checks
    expect(updatedLoser1User.profileDetail.numberOfLosses).toBe(4);
    expect(updatedLoser1User.profileDetail.numberOfGamesPlayed).toBe(4);
    expect(updatedLoser1User.profileDetail.totalPoints).toBe(1);
    // With demon-loss (≥10 PD), your XP math cancels the negative -> can be unchanged
    expect(updatedLoser1User.profileDetail.XP).toBeLessThanOrEqual(90);
    expect(updatedLoser1User.profileDetail.XP).toBeGreaterThanOrEqual(20);
  });

  it("should update streaks correctly for win and loss milestones", () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    const result = calculatePlayerPerformance(mockGame, playersCopy, usersCopy);

    const updatedWinner1 = result.playersToUpdate.find(
      (p) => p.username === PLAYER_USERNAME_1
    );
    const updatedWinner2 = result.playersToUpdate.find(
      (p) => p.username === PLAYER_USERNAME_2
    );
    const updatedLoser1 = result.playersToUpdate.find(
      (p) => p.username === PLAYER_USERNAME_3
    );

    // Winner 1: went from 1 win streak to 2
    expect(updatedWinner1.winStreak3).toBe(0); // Not at 3 yet
    expect(updatedWinner1.highestWinStreak).toBe(2);

    // Winner 2: went from 2 win streak to 3
    expect(updatedWinner2.currentStreak.count).toBe(3);
    expect(updatedWinner2.winStreak3).toBe(1);
    expect(updatedWinner2.highestWinStreak).toBe(3);

    // Loser 1: went from -3 to -4 loss streak
    expect(updatedLoser1.highestLossStreak).toBe(4);
  });

  it("should handle demon win correctly", () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    const result = calculatePlayerPerformance(mockGame, playersCopy, usersCopy);

    // 21-1 = 20 point difference, which is >= 10, so demon win
    const updatedWinner1 = result.playersToUpdate.find(
      (p) => p.username === PLAYER_USERNAME_1
    );
    const updatedWinner1User = result.usersToUpdate.find(
      (u) => u.userId === USER_1
    );

    expect(updatedWinner1.demonWin).toBe(3); // Was 2, now 3
    expect(updatedWinner1User.profileDetail.demonWin).toBe(3);
  });

  it("should return both playersToUpdate and usersToUpdate", () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    const result = calculatePlayerPerformance(mockGame, playersCopy, usersCopy);

    expect(result).toHaveProperty("playersToUpdate");
    expect(result).toHaveProperty("usersToUpdate");
    expect(result.playersToUpdate).toHaveLength(4);
    expect(result.usersToUpdate).toHaveLength(4);
  });

  // Update XP

  it("awards correct XP for a W3 (streak=3) with no rank or demon bonus", () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    // Make winners enter at W2 so this win becomes W3 (multiplier=3)
    const playerOne = playersCopy.find((p) => p.username === PLAYER_USERNAME_1);
    const playerTwo = playersCopy.find((p) => p.username === PLAYER_USERNAME_2);
    playerOne.resultLog = ["W", "W"];
    playerOne.currentStreak = { type: "W", count: 2 };
    playerTwo.resultLog = ["W", "W"];
    playerTwo.currentStreak = { type: "W", count: 2 };

    // Ensure rankMultiplier = 0 (losers/winners ratio < 2)
    const userOne = usersCopy.find((u) => u.username === PLAYER_USERNAME_1);
    const userTwo = usersCopy.find((u) => u.username === PLAYER_USERNAME_2);
    const userThree = usersCopy.find((u) => u.username === PLAYER_USERNAME_3);
    const userFour = usersCopy.find((u) => u.username === PLAYER_USERNAME_4);
    userOne.profileDetail.XP = 150;
    userTwo.profileDetail.XP = 150;
    userThree.profileDetail.XP = 100;
    userFour.profileDetail.XP = 100;

    // Use your game but avoid demon: PD=1 -> 21-20
    const game = {
      ...mockGame,
      gamescore: "21 - 20",
      result: {
        ...mockGame.result,
        winner: { ...mockGame.result.winner, score: 21, team: "Team 1" },
        loser: { ...mockGame.result.loser, score: 20, team: "Team 2" },
      },
      team1: {
        player1: { userId: mockPlayers[0].userId },
        player2: { userId: mockPlayers[1].userId },
        score: 21,
      },
      team2: {
        player1: { userId: mockPlayers[2].userId },
        player2: { userId: mockPlayers[3].userId },
        score: 20,
      },
    };

    const beforeXPPlayerOne = userOne.profileDetail.XP;
    const beforeXPPlayerTwo = userTwo.profileDetail.XP;

    const { usersToUpdate, playersToUpdate } = calculatePlayerPerformance(
      game,
      playersCopy,
      usersCopy
    );

    // For W3: base=20, winMultiplier=3 => streakXp=60; rank=0; demon=0 => +60
    [PLAYER_USERNAME_1, PLAYER_USERNAME_2].forEach((name) => {
      const user = usersToUpdate.find((u) => u.username === name);
      const player = playersToUpdate.find((p) => p.username === name);
      const beforeXP =
        name === PLAYER_USERNAME_1 ? beforeXPPlayerOne : beforeXPPlayerTwo;
      expect(user.profileDetail.XP).toBeCloseTo(beforeXP + 60, 5);
      expect(player.prevGameXP).toBeCloseTo(60, 5);
    });
  });

  it("adds rank bonus when beating higher-ranked opponents (ratio between 2 and 3)", () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    // Enter at W1 so this becomes W2 (multiplier=2)
    [playerOne, playerTwo] = playersCopy.filter((p) =>
      [PLAYER_USERNAME_1, PLAYER_USERNAME_2].includes(p.username)
    );
    [playerOne, playerTwo].forEach((player) => {
      player.resultLog = ["W"];
      player.currentStreak = { type: "W", count: 1 };
    });

    // losers much higher XP → ratio = losers/winners = 500/200 = 2.5 → rankMultiplier = 2.5
    const [userOne, userTwo, userThree, userFour] = [
      PLAYER_USERNAME_1,
      PLAYER_USERNAME_2,
      PLAYER_USERNAME_3,
      PLAYER_USERNAME_4,
    ].map((name) => usersCopy.find((u) => u.username === name));
    [userOne, userTwo].forEach((u) => (u.profileDetail.XP = 100)); // winners total = 200
    [userThree, userFour].forEach((u) => (u.profileDetail.XP = 250)); // losers total = 500

    // no demon
    const game = {
      ...mockGame,
      gamescore: "21 - 20",
      result: {
        ...mockGame.result,
        winner: { ...mockGame.result.winner, score: 21, team: "Team 1" },
        loser: { ...mockGame.result.loser, score: 20, team: "Team 2" },
      },
      team1: {
        player1: { userId: mockPlayers[0].userId },
        player2: { userId: mockPlayers[1].userId },
        score: 21,
      },
      team2: {
        player1: { userId: mockPlayers[2].userId },
        player2: { userId: mockPlayers[3].userId },
        score: 20,
      },
    };

    const beforeXPPlayerOne = userOne.profileDetail.XP;

    const { usersToUpdate, playersToUpdate } = calculatePlayerPerformance(
      game,
      playersCopy,
      usersCopy
    );

    // W2: streakXp=40; rankXp=40*2.5=100; demon=0 → total=140
    expect(
      usersToUpdate.find((u) => u.username === PLAYER_USERNAME_1).profileDetail
        .XP
    ).toBeCloseTo(beforeXPPlayerOne + 140, 5);
    expect(
      playersToUpdate.find((p) => p.username === PLAYER_USERNAME_1).prevGameXP
    ).toBeCloseTo(140, 5);
  });

  it("demon loss neutralizes negative streak XP (loss with PD >= 10)", () => {
    const playersCopy = JSON.parse(JSON.stringify(mockPlayers));
    const usersCopy = JSON.parse(JSON.stringify(mockUsers));

    // Make PlayerThree enter at L3 so this loss becomes L4 (loss multiplier=2)
    const playerThree = playersCopy.find(
      (p) => p.username === PLAYER_USERNAME_3
    );
    playerThree.resultLog = ["L", "L", "L"];
    playerThree.currentStreak = { type: "L", count: -3 };

    // rankMultiplier = 0 (winners have more XP)
    const userOne = usersCopy.find((u) => u.username === PLAYER_USERNAME_1);
    const userTwo = usersCopy.find((u) => u.username === PLAYER_USERNAME_2);
    const userThree = usersCopy.find((u) => u.username === PLAYER_USERNAME_3);
    const userFour = usersCopy.find((u) => u.username === PLAYER_USERNAME_4);
    userOne.profileDetail.XP = 150;
    userTwo.profileDetail.XP = 150;
    userThree.profileDetail.XP = 100;
    userFour.profileDetail.XP = 100;

    // demon PD: 21-10 = 11
    const game = {
      ...mockGame,
      gamescore: "21 - 10",
      result: {
        ...mockGame.result,
        winner: { ...mockGame.result.winner, score: 21, team: "Team 1" },
        loser: { ...mockGame.result.loser, score: 10, team: "Team 2" },
      },
      team1: {
        player1: { userId: mockPlayers[0].userId },
        player2: { userId: mockPlayers[1].userId },
        score: 21,
      },
      team2: {
        player1: { userId: mockPlayers[2].userId },
        player2: { userId: mockPlayers[3].userId },
        score: 10,
      },
    };

    const beforeXPPlayerThree = userThree.profileDetail.XP;

    const { usersToUpdate, playersToUpdate } = calculatePlayerPerformance(
      game,
      playersCopy,
      usersCopy
    );

    // L4: base=-15, lossMultiplier=2 → -30; demon adds +30 → net 0
    expect(
      usersToUpdate.find((u) => u.username === PLAYER_USERNAME_3).profileDetail
        .XP
    ).toBeCloseTo(beforeXPPlayerThree, 5);
    expect(
      playersToUpdate.find((p) => p.username === PLAYER_USERNAME_3).prevGameXP
    ).toBeCloseTo(0, 5);
  });
});
