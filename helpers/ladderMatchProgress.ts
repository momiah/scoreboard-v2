import type { Game, GameTeam, LadderMatch } from "@shared/types";

const isApproved = (game: Game): boolean => game.approvalStatus === "approved";

const isPendingApproval = (game: Game): boolean =>
  game.approvalStatus === "pending" || game.approvalStatus === "Pending";

export interface LadderMatchProgress {
  total: number;
  completed: number;
  pendingApproval: number;
  allCompleted: boolean;
}

export const getLadderMatchProgress = (
  match: Pick<LadderMatch, "games">,
): LadderMatchProgress => {
  const games = match.games ?? [];
  const total = games.length;
  const completed = games.filter(isApproved).length;
  const pendingApproval = games.filter(isPendingApproval).length;
  return {
    total,
    completed,
    pendingApproval,
    allCompleted: total > 0 && completed === total,
  };
};

const teamHasUser = (team: GameTeam | undefined, userId: string): boolean =>
  team?.player1?.userId === userId || team?.player2?.userId === userId;

export type LadderMatchOutcome = "win" | "loss" | "undecided";

export interface LadderMatchScore {
  mine: number;
  theirs: number;
  outcome: LadderMatchOutcome;
}

export const getLadderMatchScore = (
  match: Pick<LadderMatch, "games" | "bestOf">,
  userId: string,
): LadderMatchScore => {
  const games = match.games ?? [];
  let mine = 0;
  let theirs = 0;

  if (userId) {
    for (const game of games) {
      if (!isApproved(game) || !game.result) continue;
      const mySide = teamHasUser(game.team1, userId)
        ? "Team 1"
        : teamHasUser(game.team2, userId)
          ? "Team 2"
          : null;
      if (!mySide) continue;
      if (game.result.winner.team === mySide) mine += 1;
      else theirs += 1;
    }
  }

  const majority = Math.floor((match.bestOf ?? games.length) / 2) + 1;
  const outcome: LadderMatchOutcome =
    mine >= majority ? "win" : theirs >= majority ? "loss" : "undecided";

  return { mine, theirs, outcome };
};
