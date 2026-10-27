import type { ApprovalStatus } from "@shared/types";

/**
 * Statuses that represent a game shell that has not yet had a score reported.
 * Tournaments seed shells with "Scheduled"; ladder match shells seed with "".
 */
const FRESH_STATUSES: string[] = ["", "Scheduled"];
const PENDING_STATUSES: string[] = ["Pending", "pending"];

/**
 * Guards a game's approvalStatus transition inside a Firestore transaction so a
 * second reporter cannot overwrite a game that has already moved on. Shared by
 * the tournament (`updateTournamentGame`) and ladder (`updateLadderGame`) score
 * publish paths, which write into a pre-existing shell game.
 *
 * Throws with a user-facing message when the transition is not allowed.
 */
export const assertGameTransition = (
  currentStatus: ApprovalStatus | string | undefined,
  newStatus: ApprovalStatus | string | undefined,
): void => {
  const current = currentStatus ?? "";

  if (PENDING_STATUSES.includes(newStatus ?? "") && !FRESH_STATUSES.includes(current)) {
    throw new Error(
      "This game has already been reported. Please refresh to see the latest status.",
    );
  }

  if (
    (newStatus === "approved" || newStatus === "declined") &&
    !FRESH_STATUSES.includes(current) &&
    !PENDING_STATUSES.includes(current)
  ) {
    throw new Error("This game has already been processed.");
  }
};
