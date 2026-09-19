import { notificationTypes } from "@shared";
import type { Game } from "@shared/types";

const APPROVED_GAME = notificationTypes.RESPONSE.APPROVED_GAME;

/** A ladder game counts towards a match result only once it is fully approved. */
export const isLadderGameApproved = (game: Game): boolean =>
  game.approvalStatus === APPROVED_GAME;

type TeamLabel = "Team 1" | "Team 2";

export interface LadderMatchOutcome {
  /** True once one side has clinched the best-of (or every game is in). */
  decided: boolean;
  winnerTeam: TeamLabel | null;
}

/**
 * Resolve a ladder match from its games: tally approved game wins per side and
 * decide once a side reaches the best-of majority. Falls back to the higher
 * tally when every game is approved but no majority was reached.
 */
export const resolveLadderMatchOutcome = (
  games: Game[],
  bestOf: number,
): LadderMatchOutcome => {
  const approved = games.filter(isLadderGameApproved);

  let team1Wins = 0;
  let team2Wins = 0;
  for (const game of approved) {
    if (game.result?.winner.team === "Team 1") team1Wins += 1;
    else if (game.result?.winner.team === "Team 2") team2Wins += 1;
  }

  const majority = Math.floor(bestOf / 2) + 1;
  if (team1Wins >= majority) return { decided: true, winnerTeam: "Team 1" };
  if (team2Wins >= majority) return { decided: true, winnerTeam: "Team 2" };

  if (games.length > 0 && approved.length === games.length) {
    if (team1Wins > team2Wins) return { decided: true, winnerTeam: "Team 1" };
    if (team2Wins > team1Wins) return { decided: true, winnerTeam: "Team 2" };
  }

  return { decided: false, winnerTeam: null };
};

/** userIds on one side of a game (player2 is doubles-only, hence filtered). */
export const teamUserIds = (game: Game, team: TeamLabel): string[] => {
  const side = team === "Team 1" ? game.team1 : game.team2;
  return [side.player1?.userId, side.player2?.userId].filter(
    (id): id is string => Boolean(id),
  );
};
