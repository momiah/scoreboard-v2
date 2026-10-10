import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";

type CancellableMatch = Pick<
  LadderMatch,
  | "matchStatus"
  | "participants"
  | "createdBy"
  | "teams"
  | "games"
  | "cancellationRequest"
>;

export const LADDER_MATCH_CANCEL_ACTION = {
  /** Posted and not yet accepted: cancel straight away. */
  CANCEL: "cancel",
  /** Accepted: ask the opponent to agree to cancel. */
  REQUEST: "request",
  /** This side asked; waiting for the opponent. */
  AWAITING_RESPONSE: "awaitingResponse",
  /** The opponent asked; this side can accept or decline. */
  RESPOND: "respond",
  NONE: "none",
} as const;

export type LadderMatchCancelAction =
  (typeof LADDER_MATCH_CANCEL_ACTION)[keyof typeof LADDER_MATCH_CANCEL_ACTION];

export const getLadderMatchSideIds = (
  match: CancellableMatch,
): { poster: string[]; accepter: string[] } => {
  const poster = match.teams?.[0]?.playerIds ?? [match.createdBy];
  const accepter =
    match.teams?.[1]?.playerIds ??
    (match.participants ?? []).filter((id) => !poster.includes(id));
  return { poster, accepter };
};

export const getSameSideIds = (
  match: CancellableMatch,
  userId: string,
): string[] => {
  const { poster, accepter } = getLadderMatchSideIds(match);
  if (poster.includes(userId)) return poster;
  if (accepter.includes(userId)) return accepter;
  return [];
};

export const getOpponentSideIds = (
  match: CancellableMatch,
  userId: string,
): string[] => {
  const { poster, accepter } = getLadderMatchSideIds(match);
  if (poster.includes(userId)) return accepter;
  if (accepter.includes(userId)) return poster;
  return [];
};

export const hasReportedLadderGame = (
  match: Pick<LadderMatch, "games">,
): boolean =>
  (match.games ?? []).some(
    (game) => !!game.result || (game.approvalStatus ?? "") !== "",
  );

export const getLadderMatchCancelAction = (
  match: CancellableMatch | null | undefined,
  userId: string | undefined,
): LadderMatchCancelAction => {
  if (!match || !userId || !(match.participants ?? []).includes(userId)) {
    return LADDER_MATCH_CANCEL_ACTION.NONE;
  }
  if (match.matchStatus === LADDER_MATCH_STATUS.POSTED) {
    return LADDER_MATCH_CANCEL_ACTION.CANCEL;
  }
  if (
    match.matchStatus !== LADDER_MATCH_STATUS.ACCEPTED ||
    hasReportedLadderGame(match)
  ) {
    return LADDER_MATCH_CANCEL_ACTION.NONE;
  }
  const requestedBy = match.cancellationRequest?.requestedBy;
  if (!requestedBy) return LADDER_MATCH_CANCEL_ACTION.REQUEST;
  return getSameSideIds(match, requestedBy).includes(userId)
    ? LADDER_MATCH_CANCEL_ACTION.AWAITING_RESPONSE
    : LADDER_MATCH_CANCEL_ACTION.RESPOND;
};
