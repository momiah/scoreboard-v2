import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase.config";
import { COLLECTION_NAMES } from "@shared";
import {
  DISPUTES_COLLECTION,
  DISPUTE_STAGE,
  DISPUTE_ACTIVE_STAGES,
} from "@shared/types";
import type {
  CreateDisputeOutcome,
  Dispute,
  DisputeEvidence,
  Game,
  GameVideo,
  LadderType,
} from "@shared/types";

const toMillis = (value: unknown): number => {
  if (
    value &&
    typeof (value as { toMillis?: () => number }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  const t = new Date(value as string | number | Date).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** All video evidence uploaded for a disputed game (newest first). */
export const fetchDisputeGameVideos = async (
  gameId: string,
): Promise<GameVideo[]> => {
  if (!gameId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION_NAMES.gameVideos),
        where("gameId", "==", gameId),
      ),
    );
    return snap.docs
      .map((d) => d.data() as GameVideo)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } catch (error) {
    console.error("Error fetching dispute videos:", error);
    return [];
  }
};

// Firestore rejects undefined field values; drop them (and any nested in the
// initial evidence) before writing.
const pruneUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => pruneUndefined(item)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, pruneUndefined(v)]),
    ) as T;
  }
  return value;
};

export interface CreateDisputeInput {
  ladderId: string;
  ladderName?: string;
  ladderType: LadderType;
  ladderMatchId: string;
  gameId: string;
  originalGame: Game;
  disputedGame: Game;
  /** The player who rejected the game and is opening the dispute. */
  openedBy: string;
  /** Everyone to notify (both players in singles, all four in doubles). */
  participantIds: string[];
  /** The disputer's initial evidence round. */
  evidence: DisputeEvidence;
  matchDate?: string;
  matchTime?: string;
  courtName?: string;
}

/**
 * Open a dispute from the app: a new doc in {@link DISPUTES_COLLECTION} at
 * `under_review`. Refuses when an unresolved dispute already exists for the
 * game (mirrors the report/no-show duplicate guard).
 */
export const createDispute = async (
  input: CreateDisputeInput,
): Promise<CreateDisputeOutcome & { disputeId?: string }> => {
  if (!input.ladderId || !input.ladderMatchId || !input.gameId) {
    return { success: false, reason: "invalid" };
  }

  try {
    const existing = await getDocs(
      query(
        collection(db, DISPUTES_COLLECTION),
        where("gameId", "==", input.gameId),
      ),
    );
    const active = existing.docs.some((d) =>
      DISPUTE_ACTIVE_STAGES.includes((d.data() as Dispute).stage),
    );
    if (active) return { success: false, reason: "exists" };

    const disputeId = doc(collection(db, DISPUTES_COLLECTION)).id;
    const now = new Date();
    const dispute: Dispute = {
      disputeId,
      ladderId: input.ladderId,
      ladderName: input.ladderName,
      ladderType: input.ladderType,
      ladderMatchId: input.ladderMatchId,
      gameId: input.gameId,
      originalGame: input.originalGame,
      disputedGame: input.disputedGame,
      openedBy: input.openedBy,
      participantIds: input.participantIds,
      evidence: [input.evidence],
      stage: DISPUTE_STAGE.UNDER_REVIEW,
      events: [
        { stage: DISPUTE_STAGE.UNDER_REVIEW, createdBy: input.openedBy, createdAt: now },
      ],
      resolution: null,
      finalGame: null,
      adminNotes: null,
      matchDate: input.matchDate,
      matchTime: input.matchTime,
      courtName: input.courtName,
      createdAt: now,
      resolvedAt: null,
      resolvedBy: null,
    };

    await setDoc(doc(db, DISPUTES_COLLECTION, disputeId), pruneUndefined(dispute));
    return { success: true, disputeId };
  } catch (error) {
    console.error("Error creating dispute:", error);
    return { success: false, reason: "error" };
  }
};

export const fetchDisputeById = async (
  disputeId: string,
): Promise<Dispute | null> => {
  if (!disputeId) return null;
  try {
    const snap = await getDoc(doc(db, DISPUTES_COLLECTION, disputeId));
    return snap.exists() ? (snap.data() as Dispute) : null;
  } catch (error) {
    console.error("Error fetching dispute:", error);
    return null;
  }
};

/** The unresolved dispute for a game, if one exists (drives the "disputed" UI). */
export const fetchActiveDisputeByGame = async (
  gameId: string,
): Promise<Dispute | null> => {
  if (!gameId) return null;
  try {
    const snap = await getDocs(
      query(collection(db, DISPUTES_COLLECTION), where("gameId", "==", gameId)),
    );
    const active = snap.docs
      .map((d) => d.data() as Dispute)
      .find((d) => DISPUTE_ACTIVE_STAGES.includes(d.stage));
    return active ?? null;
  } catch (error) {
    console.error("Error fetching dispute for game:", error);
    return null;
  }
};

/**
 * Append a further evidence round from the disputer while the dispute is at
 * `more_evidence_requested`, and move it back to `under_review` for the admin.
 */
export const addDisputeEvidence = async (
  disputeId: string,
  evidence: DisputeEvidence,
): Promise<boolean> => {
  if (!disputeId) return false;
  try {
    const ref = doc(db, DISPUTES_COLLECTION, disputeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const dispute = snap.data() as Dispute;
    await updateDoc(ref, {
      evidence: [...(dispute.evidence ?? []), pruneUndefined(evidence)],
      stage: DISPUTE_STAGE.UNDER_REVIEW,
      events: [
        ...(dispute.events ?? []),
        {
          stage: DISPUTE_STAGE.UNDER_REVIEW,
          createdBy: evidence.submittedBy,
          createdAt: new Date(),
        },
      ],
    });
    return true;
  } catch (error) {
    console.error("Error adding dispute evidence:", error);
    return false;
  }
};
