import type { Game, LadderMatch } from "@shared/types";

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
