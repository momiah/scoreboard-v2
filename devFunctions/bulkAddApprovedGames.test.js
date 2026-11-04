jest.mock("../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => require("../helpers/testing/fakeFirestore").firestoreMock);

import { fakeDb } from "../helpers/testing/fakeFirestore";
import { league, leagueGame, user } from "../helpers/testing/leagueFixtures";
import { bulkAddApprovedGames } from "./bulkAddApprovedGames";

const seedLeague = (data) => {
  fakeDb.seed(`leagues/${data.leagueId}`, data);
  data.leagueParticipants.forEach((p) => fakeDb.seed(`users/${p.userId}`, { ...user(p.userId), bio: "kept" }));
};

beforeEach(() => {
  fakeDb.reset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("bulkAddApprovedGames", () => {
  it("singles: publishes every game, updates standings and profiles, writes no teams", async () => {
    seedLeague(league({ ids: ["a", "b", "c", "d"] }));

    const result = await bulkAddApprovedGames(
      [
        leagueGame({ gameId: "g1", team1: ["a"], team2: ["b"], score: [21, 15] }),
        leagueGame({ gameId: "g2", team1: ["a"], team2: ["c"], score: [21, 19] }),
      ],
      "L1",
    );

    expect(result).toMatchObject({ success: true, totalSuccessful: 2, totalFailed: 0 });
    const saved = fakeDb.read("leagues/L1");
    expect(saved.games.map((g) => g.approvalStatus)).toEqual(["approved", "approved"]);
    expect(saved.leagueParticipants.find((p) => p.userId === "a").numberOfWins).toBe(2);
    expect(saved.leagueTeams).toEqual([]);
    expect(fakeDb.read("users/a").profileDetail.numberOfWins).toBe(2);
    expect(fakeDb.read("users/a").bio).toBe("kept");
  });

  it("doubles: creates the teams", async () => {
    seedLeague(league({ ids: ["a", "b", "c", "d"], leagueType: "Doubles" }));

    await bulkAddApprovedGames(
      [leagueGame({ gameId: "g1", team1: ["a", "b"], team2: ["c", "d"], score: [21, 15] })],
      "L1",
    );

    expect(fakeDb.read("leagues/L1").leagueTeams.map((t) => t.teamKey).sort()).toEqual(["a-b", "c-d"]);
  });

  it("writes nothing when one game is invalid", async () => {
    seedLeague(league({ ids: ["a", "b"] }));

    const result = await bulkAddApprovedGames(
      [
        leagueGame({ gameId: "g1", team1: ["a"], team2: ["b"], score: [21, 15] }),
        leagueGame({ gameId: "g2", team1: ["a"], team2: ["z"], score: [21, 15] }),
      ],
      "L1",
    );

    expect(result.success).toBe(false);
    expect(fakeDb.writes).toEqual([]);
    expect(fakeDb.read("leagues/L1").games).toEqual([]);
  });
});
