import { DISPUTE_ACTIVE_STAGES, type Dispute, type Game } from "@shared/types";

export const getReporterSideIds = (game: Game | null | undefined): string[] => {
  const reporter = game?.reporter;
  if (!game || !reporter) return [];
  const sides = [game.team1, game.team2];
  const side = sides.find(
    (team) =>
      team?.player1?.userId === reporter || team?.player2?.userId === reporter,
  );
  return [side?.player1?.userId, side?.player2?.userId].filter(
    (id): id is string => Boolean(id),
  );
};

export const canApproveDisputedScore = (
  dispute: Pick<Dispute, "originalGame" | "openedBy" | "stage">,
  userId: string | undefined,
): boolean =>
  !!userId &&
  dispute.openedBy !== userId &&
  DISPUTE_ACTIVE_STAGES.includes(dispute.stage) &&
  getReporterSideIds(dispute.originalGame).includes(userId);
