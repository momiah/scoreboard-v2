import { generateKnockoutBrackets } from "./knockout";

const teams = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    player1: {
      userId: `p${index + 1}`,
      firstName: `P${index + 1}`,
      lastName: "",
      username: `p${index + 1}`,
    },
    player2: null,
  }));

describe("tournament generateKnockoutBrackets", () => {
  it("keeps the tournament team counts", () => {
    expect(() =>
      generateKnockoutBrackets({
        teams: teams(2),
        numberOfCourts: 2,
        competitionId: "tournament-12345",
      }),
    ).toThrow(
      "Knockout brackets require 8, 16, 32, 64 players (4, 8, 16, 32 teams). Received 2 teams.",
    );
    expect(() =>
      generateKnockoutBrackets({
        teams: teams(64),
        numberOfCourts: 2,
        competitionId: "tournament-12345",
      }),
    ).toThrow("Received 64 teams.");
  });

  it("pairs in order, assigns courts and adds a 3rd-place playoff", () => {
    const { fixtures, metadata } = generateKnockoutBrackets({
      teams: teams(8),
      numberOfCourts: 2,
      competitionId: "tournament-12345",
    });

    expect(
      fixtures[0].games.map((game) => [
        game.team1.player1?.userId,
        game.team2.player1?.userId,
        game.court,
      ]),
    ).toEqual([
      ["p1", "p2", 1],
      ["p3", "p4", 2],
      ["p5", "p6", 1],
      ["p7", "p8", 2],
    ]);
    expect(fixtures[2].games.map((game) => game.isThirdPlacePlayoff)).toEqual([
      false,
      true,
    ]);
    expect(metadata).toMatchObject({
      totalRounds: 3,
      totalTeams: 8,
      totalGames: 8,
      firstRoundGames: 4,
    });
  });

  it("gives every game a unique id for the tournament", () => {
    const { fixtures } = generateKnockoutBrackets({
      teams: teams(16),
      numberOfCourts: 4,
      competitionId: "tournament-12345",
    });
    const ids = fixtures.flatMap((round) => round.games.map((game) => game.gameId));
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id.startsWith("12345-")).toBe(true));
  });
});
