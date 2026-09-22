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
  selfCheckedIn: boolean;
  pendingApproval?: number;
  forfeitLabel?: string;
}

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
