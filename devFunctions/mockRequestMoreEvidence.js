import { doc, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { fetchActiveDisputeByGame } from "../services/disputes";
import {
  DISPUTES_COLLECTION,
  DISPUTE_STAGE,
  DISPUTE_EVENT_TYPE,
  getDisputeEvidenceDueAt,
} from "@shared";

/**
 * Test-only stand-in for the admin "request more evidence" action this app
 * doesn't have yet (see docs/testing/reject-game-flow-test-plan.md §5) —
 * appends an evidence_requested event and moves the dispute to
 * more_evidence_requested, the same shape a real admin action would write.
 * Takes `gameId` so callers can look up the currently-active dispute the same
 * way the app's own "disputed" link does.
 *
 * @param {{ gameId: string, actorId: string, note?: string }} params
 */
export const mockRequestMoreEvidence = async ({ gameId, actorId, note }) => {
  if (!gameId || !actorId) {
    throw new Error(
      "mockRequestMoreEvidence: gameId and actorId are required",
    );
  }

  const activeDispute = await fetchActiveDisputeByGame(gameId);
  if (!activeDispute) {
    throw new Error(
      `mockRequestMoreEvidence: no active dispute found for game ${gameId}`,
    );
  }
  const disputeRef = doc(db, DISPUTES_COLLECTION, activeDispute.disputeId);
  const now = new Date();
  const evidenceDueAt = getDisputeEvidenceDueAt(now.getTime());

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(disputeRef);
    if (!snap.exists()) throw new Error("Dispute not found");
    const dispute = snap.data();

    const event = {
      type: DISPUTE_EVENT_TYPE.EVIDENCE_REQUESTED,
      stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
      createdBy: actorId,
      createdAt: now,
      evidenceDueAt,
      ...(note ? { note } : {}),
    };

    tx.update(disputeRef, {
      stage: DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED,
      evidenceDueAt,
      events: [...(dispute.events ?? []), event],
    });
  });
};
