import { doc, runTransaction } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { fetchActiveDisputeByGame } from "../services/disputes";
import {
  DISPUTES_COLLECTION,
  DISPUTE_STAGE,
  DISPUTE_EVENT_TYPE,
  getDisputeEvidenceDueAt,
} from "@shared";

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
