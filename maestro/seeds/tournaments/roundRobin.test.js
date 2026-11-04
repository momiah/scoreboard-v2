import {
  generateRoundRobinFixtures,
  generateSinglesRoundRobinFixtures,
} from "../../../helpers/Tournament/roundRobin";
import { courtSpread } from "./roundRobin";

const player = (id) => ({
  userId: id,
  firstName: id,
  lastName: "x",
  username: id,
  displayName: id,
  XP: 0,
});
const singles = (count, numberOfCourts) =>
  generateSinglesRoundRobinFixtures({
    players: Array.from({ length: count }, (_, i) => player(`p${i}`)),
    numberOfCourts,
    competitionId: "c",
  }).fixtures;
const doubles = (teams, numberOfCourts) =>
  generateRoundRobinFixtures({
    teams: Array.from({ length: teams }, (_, i) => ({
      player1: player(`a${i}`),
      player2: player(`b${i}`),
    })),
    numberOfCourts,
    competitionId: "c",
  }).fixtures;

describe("courtSpread", () => {
  it("knows four entrants on two courts can't split evenly", () => {
    const { best } = courtSpread(singles(4, 2));
    expect(best).toBeGreaterThan(0);
  });

  it.each([
    ["singles, 4 on 2 courts", () => singles(4, 2)],
    ["singles, 6 on 2 courts", () => singles(6, 2)],
    ["singles, 6 on 3 courts", () => singles(6, 3)],
    ["doubles, 4 teams on 2 courts", () => doubles(4, 2)],
    ["doubles, 3 teams on 1 court", () => doubles(3, 1)],
  ])("the generator spreads courts as evenly as possible: %s", (_label, fixtures) => {
    const { generated, best } = courtSpread(fixtures());
    expect(best).not.toBeNull();
    expect(generated).toBe(best);
  });
});
