import { LADDER_MATCH_STATUS, isLadderMatchCheckedIn } from "@shared";
import type { LadderMatch } from "@shared/types";

export type LadderMatchPhase =
  | "awaiting-checkin"
  | "checked-in"
  | "waiting-players"
  | "started"
  | "awaiting-approval"
  | "no-show-review"
  | "completed"
  | "cancelled"
  | "forfeit";

export interface LadderMatchStatus {
  phase: LadderMatchPhase;
  label: string;
}

interface DeriveOptions {
  /** Whether the viewing user has checked in. */
  selfCheckedIn: boolean;
  /** Games reported and awaiting approval. */
  pendingApproval?: number;
  /** Name of the side that forfeited (walkover only). */
  forfeitLabel?: string;
}

/**
 * Single source of truth for a ladder match's status pill, shared by the match
 * card (hero pill) and the lobby so they can never disagree. Terminal states
 * (forfeit, completed) win, then in-progress, then the check-in progression —
 * which for doubles pauses on "waiting for players" until all four are in.
 */
export const deriveLadderMatchStatus = (
  match: LadderMatch,
  { selfCheckedIn, pendingApproval = 0, forfeitLabel }: DeriveOptions,
): LadderMatchStatus => {
  const isDoubles = match.participants.length > 2;

  if (match.walkover) {
    const by = forfeitLabel ? ` by ${forfeitLabel}` : "";
    return {
      phase: "forfeit",
      label: `Forfeit${by} (${match.walkoverReason ?? "No show"})`,
    };
  }
  if (match.matchStatus === LADDER_MATCH_STATUS.COMPLETED) {
    return { phase: "completed", label: "Completed" };
  }
  if (match.matchStatus === LADDER_MATCH_STATUS.CANCELLED) {
    return { phase: "cancelled", label: "Cancelled" };
  }
  // A no-show has been reported and is awaiting an admin decision; check-in is
  // paused until it resolves. (Field set on the match when the report is raised.)
  if ((match as { noShowReported?: boolean }).noShowReported) {
    return { phase: "no-show-review", label: "No-show reported · under review" };
  }
  if (pendingApproval > 0) {
    return {
      phase: "awaiting-approval",
      label: `${pendingApproval} ${
        pendingApproval === 1 ? "game" : "games"
      } awaiting approval`,
    };
  }
  if (isLadderMatchCheckedIn(match)) {
    return { phase: "started", label: "Started" };
  }
  if (selfCheckedIn) {
    return isDoubles
      ? { phase: "waiting-players", label: "Waiting for players to check in" }
      : { phase: "checked-in", label: "Checked in" };
  }
  return { phase: "awaiting-checkin", label: "Press here to checkin" };
};
