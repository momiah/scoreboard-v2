import { onDocumentUpdated } from "firebase-functions/v2/firestore";

import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";
import type { LadderMatch } from "courtchamps-shared/types";

import {
  reconcileLadderCourtFee,
  type LadderMatchOutcomeKind,
} from "./helpers/courtFee";

const TERMINAL_STATUSES: string[] = [
  LADDER_MATCH_STATUS.COMPLETED,
  LADDER_MATCH_STATUS.CANCELLED,
  LADDER_MATCH_STATUS.EXPIRED,
];

/** Map a terminal match to its settlement outcome, or null if not terminal. */
const outcomeKindFor = (match: LadderMatch): LadderMatchOutcomeKind | null => {
  switch (match.matchStatus) {
    case LADDER_MATCH_STATUS.COMPLETED:
      // A no-show walkover completes the match too; settle it differently.
      return match.walkover ? "walkover" : "completed";
    case LADDER_MATCH_STATUS.CANCELLED:
      return "cancelled";
    case LADDER_MATCH_STATUS.EXPIRED:
      return "expired";
    default:
      return null;
  }
};

/**
 * The single settlement point for a ladder match's court fee. Fires on every
 * matchStatus transition into a terminal state, however it was reached —
 * manual approval, auto-approve, dispute resolution (upheld / rejected / void),
 * a no-show walkover, a user cancel or an inactivity expiry — so no flow can be
 * missed. Each outcome routes to reconcileLadderCourtFee, which is a no-op stub
 * until the payment provider settlement is built.
 */
export const onLadderMatchStatusChange = onDocumentUpdated(
  "ladders/{ladderId}/ladderMatches/{matchId}",
  async (event) => {
    const before = event.data?.before.data() as LadderMatch | undefined;
    const after = event.data?.after.data() as LadderMatch | undefined;
    if (!before || !after) return;

    // Only act when the status actually transitions into a terminal state.
    if (before.matchStatus === after.matchStatus) return;
    if (!TERMINAL_STATUSES.includes(after.matchStatus)) return;

    const outcome = outcomeKindFor(after);
    if (!outcome) return;

    try {
      // STUB: settle the court fee for `outcome`.
      //   - completed → release the held fee to the poster.
      //   - walkover  → charge the no-show, reimburse the player who showed.
      //   - cancelled → refund the accepter's share (a player called it off).
      //   - expired   → refund the accepter's share (no one played it out).
      await reconcileLadderCourtFee(after, outcome);
    } catch (err) {
      console.error(
        `[courtFee] settlement failed for match ${after.ladderMatchId} (${outcome}):`,
        err,
      );
    }
  },
);
