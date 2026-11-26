jest.mock("../services/firebase.config", () => ({ db: {} }));

import { buildClubFormLogs, buildClubPlayerMap } from "./clubPlayerStats";

const player = (userId: string) => ({ userId, firstName: userId });

const game = (
  team1: string[],
  team2: string[],
  winner: "Team 1" | "Team 2",
  reportedAt: string,
  approvalStatus = "Approved",
) => ({
  approvalStatus,
  reportedAt: reportedAt ? new Date(reportedAt) : undefined,
  team1: { player1: player(team1[0]), player2: team1[1] ? player(team1[1]) : null },
  team2: { player1: player(team2[0]), player2: team2[1] ? player(team2[1]) : null },
  result: { winner: { team: winner } },
});

const participant = (
  userId: string,
  wins: number,
  losses: number,
  pointDifference: number,
  resultLog: string[],
) => ({
  userId,
  firstName: userId,
  numberOfWins: wins,
  numberOfLosses: losses,
  numberOfGamesPlayed: wins + losses,
  totalPointDifference: pointDifference,
  resultLog,
});

const league = {
  leagueParticipants: [
    participant("user", 2, 0, 9, ["W", "W"]),
    participant("opponent", 0, 2, -9, ["L", "L"]),
  ],
  games: [
    game(["user"], ["opponent"], "Team 1", "2026-11-01T10:00:00Z"),
    game(["user"], ["opponent"], "Team 1", "2026-11-03T10:00:00Z"),
  ],
};

const tournament = {
  tournamentParticipants: [
    participant("user", 0, 1, -4, ["L"]),
    participant("opponent", 1, 0, 4, ["W"]),
    participant("visitor", 0, 0, 0, []),
  ],
  fixtures: [
    {
      games: [
        game(["opponent"], ["user"], "Team 1", "2026-11-02T10:00:00Z"),
        game(["visitor"], ["user"], "Team 1", "2026-11-04T10:00:00Z", "Pending"),
      ],
    },
  ],
};

const members = [player("user"), player("opponent"), player("newMember")];

const byId = <T extends { userId: string }>(rows: T[], userId: string) =>
  rows.find((row) => row.userId === userId);

describe("buildClubPlayerMap", () => {
  const players = buildClubPlayerMap({
    members,
    leagues: [league],
    tournaments: [tournament],
  });

  it("adds a player's league and tournament stats together", () => {
    expect(byId(players, "user")).toMatchObject({
      numberOfWins: 2,
      numberOfLosses: 1,
      numberOfGamesPlayed: 3,
      totalPointDifference: 5,
    });
    expect(byId(players, "opponent")).toMatchObject({
      numberOfWins: 1,
      numberOfLosses: 2,
      numberOfGamesPlayed: 3,
      totalPointDifference: -5,
    });
  });

  it("lists members with no games at zero and keeps non-members who played", () => {
    expect(byId(players, "newMember")).toMatchObject({
      numberOfWins: 0,
      numberOfGamesPlayed: 0,
      resultLog: [],
    });
    expect(byId(players, "visitor")).toMatchObject({ numberOfWins: 0 });
  });

  it("orders the form by when games were played across competitions", () => {
    expect(byId(players, "user")?.resultLog).toEqual(["W", "L", "W"]);
    expect(byId(players, "opponent")?.resultLog).toEqual(["L", "W", "L"]);
  });
});

describe("buildClubFormLogs", () => {
  it("keeps the 10 most recent results", () => {
    const games = Array.from({ length: 12 }, (_, i) =>
      game(
        ["user"],
        ["opponent"],
        i < 2 ? "Team 2" : "Team 1",
        `2026-10-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
      ),
    );
    const { players } = buildClubFormLogs([{ games }]);
    expect(players.get("user")).toEqual(Array(10).fill("W"));
  });

  it("builds doubles team form under the shared team key", () => {
    const leagueGame = game(["b", "a"], ["c", "d"], "Team 2", "2026-11-05T10:00:00Z");
    const tournamentGame = game(["a", "b"], ["d", "c"], "Team 1", "2026-11-01T10:00:00Z");
    const { teams } = buildClubFormLogs([
      { games: [leagueGame] },
      { fixtures: [{ games: [tournamentGame] }] },
    ]);
    expect(teams.get("a-b")).toEqual(["W", "L"]);
    expect(teams.get("c-d")).toEqual(["L", "W"]);
  });

  it("reads the played date when a game has no report time", () => {
    const early = { ...game(["user"], ["opponent"], "Team 2", ""), date: "02-11-2026", createdTime: "09:00" };
    const late = { ...game(["user"], ["opponent"], "Team 1", ""), date: "02-11-2026", createdTime: "18:30" };
    const { players } = buildClubFormLogs([{ games: [late, early] }]);
    expect(players.get("user")).toEqual(["L", "W"]);
  });
});
