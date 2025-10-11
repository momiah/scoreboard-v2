// helpers/backfillLeagueTeams.fullGameObjects.test.js
import { computeLeagueTeamsFromGames } from "./backfillLeagueTeams";

describe("computeLeagueTeamsFromGames — uses full game team objects (Doubles)", () => {
  // Fully normalized player objects (exact shape used in your app)
  const playerAhmadAli = {
    userId: "u1",
    firstName: "Ahmad",
    lastName: "Ali",
    username: "ahmadali",
    displayName: "Ahmad A",
  };
  const playerSaraKhan = {
    userId: "u2",
    firstName: "Sara",
    lastName: "Khan",
    username: "sarak",
    displayName: "Sara K",
  };
  const playerTomLee = {
    userId: "u3",
    firstName: "Tom",
    lastName: "Lee",
    username: "tomlee",
    displayName: "Tom L",
  };
  const playerRitishMahi = {
    userId: "u4",
    firstName: "Ritish",
    lastName: "Mahi",
    username: "ritishmahi",
    displayName: "Ritish M",
  };

  test("replays two Doubles games with proper team objects and rebuilds leagueTeams from scratch", async () => {
    // Game 1: Team 1 wins 21–18
    const gameOne = {
      gameId: "G1",
      team1: {
        player1: { ...playerAhmadAli },
        player2: { ...playerSaraKhan },
        score: 21,
      },
      team2: {
        player1: { ...playerTomLee },
        player2: { ...playerRitishMahi },
        score: 18,
      },
      result: {
        winner: {
          team: "Team 1",
          players: ["Ahmad A", "Sara K"],
          score: 21,
        },
        loser: {
          team: "Team 2",
          players: ["Tom L", "Ritish M"],
          score: 18,
        },
      },
    };

    // Game 2: Team 2 wins 21–19 (same teams, opposite outcome)
    const gameTwo = {
      gameId: "G2",
      team1: {
        player1: { ...playerAhmadAli },
        player2: { ...playerSaraKhan },
        score: 19,
      },
      team2: {
        player1: { ...playerTomLee },
        player2: { ...playerRitishMahi },
        score: 21,
      },
      result: {
        winner: {
          team: "Team 2",
          players: ["Tom L", "Ritish M"],
          score: 21,
        },
        loser: {
          team: "Team 1",
          players: ["Ahmad A", "Sara K"],
          score: 19,
        },
      },
    };

    const leagueId = "Example-League-Doubles";
    const rebuiltTeams = await computeLeagueTeamsFromGames(
      [gameOne, gameTwo],
      leagueId
    );

    // Exactly the two teams formed by those games
    expect(rebuiltTeams).toHaveLength(2);

    // Team keys are based on sorted userIds
    const sortedTeamKeys = rebuiltTeams.map((team) => team.teamKey).sort();
    expect(sortedTeamKeys).toEqual(["u1-u2", "u3-u4"]);

    const teamAhmadSara = rebuiltTeams.find((team) => team.teamKey === "u1-u2");
    const teamRitishTom = rebuiltTeams.find((team) => team.teamKey === "u3-u4");

    // Team label is the sorted display names
    expect(teamAhmadSara.team).toEqual(["Ahmad A", "Sara K"]);
    expect(teamRitishTom.team.sort()).toEqual(["Ritish M", "Tom L"].sort());

    // Both teams played 2 games, with alternating results
    expect(teamAhmadSara.numberOfGamesPlayed).toBe(2);
    expect(teamAhmadSara.resultLog).toEqual(["W", "L"]);
    expect(teamRitishTom.numberOfGamesPlayed).toBe(2);
    expect(teamRitishTom.resultLog).toEqual(["L", "W"]);

    // Point differences: +3 then -2 for Ahmad/Sara; inverse for Ritish/Tom
    expect(teamAhmadSara.pointDifferenceLog).toEqual([3, -2]);
    expect(teamRitishTom.pointDifferenceLog).toEqual([-3, 2]);
    expect(teamAhmadSara.totalPointDifference).toBe(1);
    expect(teamRitishTom.totalPointDifference).toBe(-1);
    expect(teamAhmadSara.averagePointDifference).toBeCloseTo(0.5, 5);
    expect(teamRitishTom.averagePointDifference).toBeCloseTo(-0.5, 5);

    // Streaks end at -1 for Ahmad/Sara and +1 for Ritish/Tom
    expect(teamAhmadSara.currentStreak).toBe(-1);
    expect(teamRitishTom.currentStreak).toBe(1);

    // Losses map references opposing teamKey
    expect(Object.keys(teamAhmadSara.lossesTo)).toContain("u3-u4");
    expect(Object.keys(teamRitishTom.lossesTo)).toContain("u1-u2");
  });
});
