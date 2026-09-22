import { applyLadderTeamGameXp } from "./ladderTeamScoring";

const makeTeam = (overrides = {}) => ({
  teamKey: "a-b",
  XP: 100,
  prevGameXP: 0,
  currentStreak: 0,
  ...overrides,
});

const makeGame = (winnerScore, loserScore) => ({
  gameId: "g1",
  result: {
    winner: { team: "Team 1", players: [], score: winnerScore },
    loser: { team: "Team 2", players: [], score: loserScore },
  },
});

describe("applyLadderTeamGameXp", () => {
  it("adds CP to the winner and subtracts from the loser", () => {
    const winner = makeTeam({ XP: 100, currentStreak: 1 });
    const loser = makeTeam({ XP: 100, currentStreak: -1 });
    applyLadderTeamGameXp(winner, loser, makeGame(21, 15));

    expect(winner.prevGameXP).toBeGreaterThan(0);
    expect(winner.XP).toBe(100 + winner.prevGameXP);
    expect(loser.prevGameXP).toBeLessThan(0);
    expect(loser.XP).toBe(100 + loser.prevGameXP);
  });

  it("floors a team's CP at 0 rather than going negative", () => {
    const winner = makeTeam({ XP: 100, currentStreak: 1 });
    const loser = makeTeam({ XP: 5, currentStreak: -1 });
    applyLadderTeamGameXp(winner, loser, makeGame(21, 0));

    expect(loser.XP).toBe(0);
    expect(loser.prevGameXP).toBeLessThan(0);
  });

  it("treats a 10+ point margin as a demon win (bigger swing)", () => {
    const closeWinner = makeTeam({ XP: 100, currentStreak: 1 });
    const closeLoser = makeTeam({ XP: 100, currentStreak: -1 });
    applyLadderTeamGameXp(closeWinner, closeLoser, makeGame(21, 15));

    const demonWinner = makeTeam({ XP: 100, currentStreak: 1 });
    const demonLoser = makeTeam({ XP: 100, currentStreak: -1 });
    applyLadderTeamGameXp(demonWinner, demonLoser, makeGame(21, 5));

    expect(demonWinner.prevGameXP).toBeGreaterThan(closeWinner.prevGameXP);
  });
});
