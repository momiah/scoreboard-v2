import {
  generateTournamentKnockoutBrackets,
  knockoutEntrantError,
  knockoutSideCounts,
} from "./knockout";

const entrant = (userId: string) => ({ userId, username: userId }) as never;
const sides = (count: number, playersPerSide: 1 | 2) =>
  Array.from({ length: count }, (_, i) => ({
    player1: entrant(`p${i}a`),
    player2: playersPerSide === 2 ? entrant(`p${i}b`) : null,
  }));

describe("knockoutEntrantError", () => {
  it.each([4, 8, 16, 32, 64])("accepts %i singles players", (players) => {
    expect(knockoutEntrantError("Singles", players)).toBeNull();
  });

  it.each([8, 16, 32, 64])("accepts %i doubles players", (players) => {
    expect(knockoutEntrantError("Doubles", players)).toBeNull();
  });

  it("refuses an odd number of entrants", () => {
    expect(knockoutEntrantError("Singles", 5)).toBe(
      "Please ensure an even number of participants.",
    );
  });

  it("refuses sizes a bracket can't fill, listing the ones it can", () => {
    expect(knockoutEntrantError("Singles", 6)).toBe(
      "Knockout tournaments need 4, 8, 16, 32, 64 players. You currently have 6.",
    );
    expect(knockoutEntrantError("Doubles", 12)).toBe(
      "Knockout tournaments need 4, 8, 16, 32 teams. You currently have 6.",
    );
    expect(knockoutEntrantError("Doubles", 4)).toBe(
      "Knockout tournaments need 4, 8, 16, 32 teams. You currently have 2.",
    );
  });

  it("lists only the sizes the largest tournament allows", () => {
    expect(knockoutSideCounts("Singles")).toEqual([4, 8, 16, 32, 64]);
    expect(knockoutSideCounts("Doubles")).toEqual([4, 8, 16, 32]);
  });
});

describe("generateTournamentKnockoutBrackets", () => {
  it.each([
    [4, 1, [2, 2]],
    [64, 1, [32, 16, 8, 4, 2, 2]],
    [32, 2, [16, 8, 4, 2, 2]],
  ])("%i sides of %i make rounds of %j games", (count, perSide, gamesPerRound) => {
    const { fixtures } = generateTournamentKnockoutBrackets({
      teams: sides(count, perSide as 1 | 2),
      numberOfCourts: 2,
      competitionId: "tournament-abcde",
    });
    expect(fixtures.map((round) => round.games.length)).toEqual(gamesPerRound);
    const games = fixtures.flatMap((round) => round.games);
    expect(new Set(games.map((g) => g.gameId)).size).toBe(games.length);
    expect(fixtures.at(-1)?.games.filter((g) => g.isThirdPlacePlayoff)).toHaveLength(1);
    expect(fixtures[0].games[0].court).toBe(1);
  });
});
