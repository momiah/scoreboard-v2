import { normalizeTeamKey } from "@shared/helpers";
import { scoreDoublesLadderGame } from "./scoreDoublesLadderGame";

const makeUser = (userId, XP) => ({
  userId,
  username: userId,
  firstName: userId,
  lastName: "P",
  profileImage: "",
  profileDetail: {
    memberSince: "2025",
    XP,
    prevGameXP: 0,
    numberOfGamesPlayed: 0,
    numberOfWins: 0,
    numberOfLosses: 0,
    winPercentage: 0,
    highestWinStreak: 0,
    highestLossStreak: 0,
    winStreak3: 0,
    winStreak5: 0,
    winStreak7: 0,
    totalPoints: 0,
    demonWin: 0,
    totalPointDifference: 0,
    lastActive: null,
  },
});

const makeTeam = (playerIds, XP) => ({
  team: playerIds.slice(),
  teamKey: normalizeTeamKey(playerIds),
  teamId: `id-${playerIds.join("")}`,
  playerIds,
  numberOfWins: 0,
  numberOfLosses: 0,
  numberOfGamesPlayed: 0,
  resultLog: [],
  matchResultLog: [],
  pointDifferenceLog: [],
  averagePointDifference: 0,
  totalPointDifference: 0,
  currentStreak: 0,
  highestWinStreak: 0,
  highestLossStreak: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  demonWin: 0,
  lossesTo: {},
  rival: null,
  XP,
  prevGameXP: 0,
});

// Team 1 (abu/sarwar) beat Team 2 (mohsin/test).
const makeGame = (winnerScore, loserScore) => ({
  gameId: "g1",
  date: "17-09-2026",
  team1: { player1: { userId: "abu" }, player2: { userId: "sarwar" } },
  team2: { player1: { userId: "mohsin" }, player2: { userId: "test" } },
  result: {
    winner: { team: "Team 1", players: ["abu", "sarwar"], score: winnerScore },
    loser: { team: "Team 2", players: ["mohsin", "test"], score: loserScore },
  },
});

const winnerKey = normalizeTeamKey(["abu", "sarwar"]);
const loserKey = normalizeTeamKey(["mohsin", "test"]);

describe("scoreDoublesLadderGame", () => {
  it("scores a decided game: team CP, player global XP/medals, match logs", async () => {
    const users = [
      makeUser("abu", 500),
      makeUser("sarwar", 500),
      makeUser("mohsin", 500),
      makeUser("test", 500),
    ];
    const ladderTeams = [makeTeam(["abu", "sarwar"], 100), makeTeam(["mohsin", "test"], 100)];

    const { scoringParticipants, teams, matchCompleted } =
      await scoreDoublesLadderGame({
        game: makeGame(21, 5), // 16-point margin → demon/assassin
        participants: [],
        users,
        ladderTeams,
        matchDecided: true,
        matchWinnerSide: "Team 1",
      });

    const winnerTeam = teams.find((t) => t.teamKey === winnerKey);
    const loserTeam = teams.find((t) => t.teamKey === loserKey);

    // Team CP (per-ladder standings currency)
    expect(winnerTeam.prevGameXP).toBeGreaterThan(0);
    expect(winnerTeam.XP).toBe(100 + winnerTeam.prevGameXP);
    expect(loserTeam.XP).toBeLessThan(100);
    expect(loserTeam.XP).toBeGreaterThanOrEqual(0);

    // Team wins/losses + demon (assassin) on the 16-point margin
    expect(winnerTeam.numberOfWins).toBe(1);
    expect(winnerTeam.demonWin).toBe(1);
    expect(loserTeam.numberOfLosses).toBe(1);

    // Match result log pushed once, and the match completed
    expect(winnerTeam.matchResultLog).toEqual(["W"]);
    expect(loserTeam.matchResultLog).toEqual(["L"]);
    expect(matchCompleted).toBe(true);

    // Player global stats (rank XP + achievement medals) via profileDetail
    const abu = users.find((u) => u.userId === "abu").profileDetail;
    const mohsin = users.find((u) => u.userId === "mohsin").profileDetail;
    expect(abu.XP).toBeGreaterThan(500);
    expect(abu.numberOfWins).toBe(1);
    expect(abu.demonWin).toBe(1); // Assassin medal
    expect(abu.highestWinStreak).toBe(1);
    expect(abu.winStreak3).toBe(0); // one win never crosses a 3-streak
    expect(mohsin.numberOfLosses).toBe(1);
    expect(mohsin.demonWin).toBe(0);

    // A participant doc was seeded per player (streak carrier) — four in all
    expect(scoringParticipants).toHaveLength(4);
  });

  it("reuses an existing participant doc as the streak carrier", async () => {
    const users = [
      makeUser("abu", 500),
      makeUser("sarwar", 500),
      makeUser("mohsin", 500),
      makeUser("test", 500),
    ];
    const existingAbu = {
      userId: "abu",
      username: "abu",
      competitionXP: 0,
      numberOfGamesPlayed: 4,
      numberOfWins: 4,
      numberOfLosses: 0,
      winPercentage: 100,
      resultLog: ["W", "W"],
      pointDifferenceLog: [],
      totalPointDifference: 0,
      averagePointDifference: 0,
      currentStreak: { type: "W", count: 2 },
      highestWinStreak: 2,
      highestLossStreak: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      demonWin: 0,
      totalPoints: 0,
      prevGameXP: 0,
    };
    const ladderTeams = [makeTeam(["abu", "sarwar"], 100), makeTeam(["mohsin", "test"], 100)];

    const { scoringParticipants } = await scoreDoublesLadderGame({
      game: makeGame(21, 15),
      participants: [existingAbu],
      users,
      ladderTeams,
      matchDecided: true,
      matchWinnerSide: "Team 1",
    });

    const carried = scoringParticipants.find((p) => p.userId === "abu");
    expect(carried).toBe(existingAbu); // same object, not reseeded
    // Third win in a row → crosses the 3-streak, so the medal fires globally.
    expect(carried.currentStreak.count).toBe(3);
    const abuGlobal = users.find((u) => u.userId === "abu").profileDetail;
    expect(abuGlobal.winStreak3).toBe(1);
  });
});
