import { computeGameXp } from "@shared/helpers";
import type { Game, TeamStats } from "@shared/types";

/**
 * Apply a doubles ladder game's CP swing to the two team records, mirroring the
 * singles per-player CP path: the XP basis is each team's current per-ladder CP
 * (`XP`), the streak comes from the team's `currentStreak` (which
 * `calculateTeamPerformance` has already updated for this game), and the result
 * is floored at 0 so a team never drops below zero CP.
 *
 * Mutates `winnerTeam`/`loserTeam` in place: sets `prevGameXP` to the CP this
 * game earned and folds it into `XP`. Call after `calculateTeamPerformance`.
 */
export const applyLadderTeamGameXp = (
  winnerTeam: TeamStats,
  loserTeam: TeamStats,
  game: Game,
): void => {
  const winnerScore = game.result?.winner.score ?? 0;
  const loserScore = game.result?.loser.score ?? 0;
  const combinedWinnerXp = winnerTeam.XP ?? 0;
  const combinedLoserXp = loserTeam.XP ?? 0;

  const { finalXp: winnerXp } = computeGameXp({
    streakType: "W",
    streakCount: winnerTeam.currentStreak,
    combinedWinnerXp,
    combinedLoserXp,
    winnerScore,
    loserScore,
  });
  const { finalXp: loserXp } = computeGameXp({
    streakType: "L",
    streakCount: loserTeam.currentStreak,
    combinedWinnerXp,
    combinedLoserXp,
    winnerScore,
    loserScore,
  });

  winnerTeam.prevGameXP = winnerXp;
  winnerTeam.XP = Math.max(0, combinedWinnerXp + winnerXp);
  loserTeam.prevGameXP = loserXp;
  loserTeam.XP = Math.max(0, combinedLoserXp + loserXp);
};
