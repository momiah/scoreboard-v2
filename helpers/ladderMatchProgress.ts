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

export interface NextLadderGame {
  gameId: string | null;
  glowColor: string;
}

// The game the player should act on next: the first one awaiting approval
// (orange), otherwise the first unplayed game (blue). Ladder shells share an
// empty gameId, so we key on the stable per-match gameNumber instead.
export const getNextLadderGame = (
  match: Pick<LadderMatch, "games">,
): NextLadderGame => {
  const games = match.games ?? [];

  const pending = games.find(isPendingApproval);
  if (pending) {
    return { gameId: String(pending.gameNumber), glowColor: "#FFA500" };
  }

  const unplayed = games.find((game) => !game.result);
  return {
    gameId: unplayed ? String(unplayed.gameNumber) : null,
    glowColor: "#00A2FF",
  };
};
