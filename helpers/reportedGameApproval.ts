import type { Game } from "@shared/types";
import { getReporterSideIds } from "./disputeReporterSide";

const gamePlayerIds = (game: Game): string[] =>
  [
    game.team1?.player1?.userId,
    game.team1?.player2?.userId,
    game.team2?.player1?.userId,
    game.team2?.player2?.userId,
  ].filter((id): id is string => Boolean(id));

export const canApproveReportedGame = (
  game: Game | null | undefined,
  userId: string | undefined,
): boolean =>
  !!game &&
  !!userId &&
  gamePlayerIds(game).includes(userId) &&
  !getReporterSideIds(game).includes(userId);
