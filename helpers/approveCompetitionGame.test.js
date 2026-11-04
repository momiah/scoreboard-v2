jest.mock("../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => require("./testing/fakeFirestore").firestoreMock);

import { fakeDb } from "./testing/fakeFirestore";
import { league, leagueGame, user } from "./testing/leagueFixtures";
import { approveCompetitionGame } from "./approveCompetitionGame";

const seedLeague = (data) => {
  fakeDb.seed(`leagues/${data.leagueId}`, data);
  data.leagueParticipants.forEach((p) => fakeDb.seed(`users/${p.userId}`, user(p.userId)));
};

const approve = (gameId, approverId) =>
  approveCompetitionGame({ isLeague: true, competitionId: "L1", gameId, approverId });

beforeEach(() => fakeDb.reset());

describe("approveCompetitionGame (leagues)", () => {
  it("singles: approves, applies stats to participants and profiles", async () => {
    seedLeague(
      league({
        ids: ["a", "b", "c", "d"],
        games: [leagueGame({ gameId: "g1", team1: ["a"], team2: ["b"], score: [21, 15] })],
      }),
    );

    const outcome = await approve("g1", "b");

    expect(outcome).toEqual({
      status: "approved",
      fullyApproved: true,
      competitionName: "Test League",
      approverUsername: "b",
    });
    const saved = fakeDb.read("leagues/L1");
    expect(saved.games[0].approvalStatus).toBe("approved");
    expect(saved.games[0].approvers).toEqual([{ userId: "b", username: "b" }]);
    const a = saved.leagueParticipants.find((p) => p.userId === "a");
    expect(a.numberOfWins).toBe(1);
    expect(a.totalPointDifference).toBe(6);
    expect(fakeDb.read("users/a").profileDetail.numberOfWins).toBe(1);
    expect(fakeDb.read("users/b").profileDetail.numberOfLosses).toBe(1);
    expect(saved.leagueTeams).toEqual([]);
  });

  it("refuses a second approval: stats are applied once", async () => {
    seedLeague(
      league({
        ids: ["a", "b", "c", "d"],
        leagueType: "Doubles",
        games: [leagueGame({ gameId: "g1", team1: ["a", "b"], team2: ["c", "d"], score: [21, 15] })],
      }),
    );

    await approve("g1", "c");
    const second = await approve("g1", "d");

    expect(second).toEqual({ status: "not-pending" });
    const saved = fakeDb.read("leagues/L1");
    expect(saved.leagueParticipants.find((p) => p.userId === "a").numberOfWins).toBe(1);
    expect(fakeDb.read("users/a").profileDetail.numberOfWins).toBe(1);
  });

  it("doubles: creates both teams on their first approved game", async () => {
    seedLeague(
      league({
        ids: ["a", "b", "c", "d"],
        leagueType: "Doubles",
        games: [leagueGame({ gameId: "g1", team1: ["a", "b"], team2: ["c", "d"], score: [21, 15] })],
      }),
    );

    await approve("g1", "c");

    const teams = fakeDb.read("leagues/L1").leagueTeams;
    expect(teams.map((t) => t.teamKey).sort()).toEqual(["a-b", "c-d"]);
    expect(teams.find((t) => t.teamKey === "a-b").numberOfWins).toBe(1);
  });

  it("refuses a game that was auto-approved meanwhile", async () => {
    seedLeague(
      league({
        ids: ["a", "b"],
        games: [
          leagueGame({ gameId: "g1", team1: ["a"], team2: ["b"], score: [21, 15], approvalStatus: "approved" }),
        ],
      }),
    );
    expect(await approve("g1", "b")).toEqual({ status: "not-pending" });
    expect(fakeDb.writes).toEqual([]);
  });

  it("keeps a game reported while the approval was running", async () => {
    seedLeague(
      league({
        ids: ["a", "b", "c", "d"],
        games: [leagueGame({ gameId: "g1", team1: ["a"], team2: ["b"], score: [21, 15] })],
      }),
    );
    const current = fakeDb.read("leagues/L1");
    fakeDb.seed("leagues/L1", {
      ...current,
      games: [...current.games, leagueGame({ gameId: "g2", team1: ["c"], team2: ["d"], score: [21, 10] })],
    });

    await approve("g1", "b");

    const games = fakeDb.read("leagues/L1").games;
    expect(games.map((g) => [g.gameId, g.approvalStatus])).toEqual([
      ["g1", "approved"],
      ["g2", "Pending"],
    ]);
  });
});

describe("approveCompetitionGame guards", () => {
  it("refuses the reporter's partner", async () => {
    seedLeague(
      league({
        ids: ["a", "b", "c", "d"],
        leagueType: "Doubles",
        games: [leagueGame({ gameId: "g1", team1: ["a", "b"], team2: ["c", "d"], score: [21, 15], reporter: "a" })],
      }),
    );
    expect(await approve("g1", "b")).toEqual({ status: "not-opponent" });
    expect(fakeDb.writes).toEqual([]);
  });
});
