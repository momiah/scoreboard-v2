import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  where,
  type Transaction,
} from "firebase/firestore";

import { db } from "./firebase.config";
import { COLLECTION_NAMES } from "@shared";
import {
  DISPUTES_COLLECTION,
  DISPUTE_STAGE,
  DISPUTE_ACTIVE_STAGES,
  DISPUTE_EVENT_TYPE,
  DISPUTE_RESOLUTION,
  canUploadDisputeVideo,
  getDisputeEvidenceBlocker,
  getDisputeSubmissionType,
  hasCourtPositions,
} from "@shared/types";
import type {
  CreateDisputeOutcome,
  Dispute,
  DisputeResolution,
  DisputeEvent,
  DisputeEvidence,
  Game,
  GameVideo,
  LadderMatch,
  LadderType,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "@shared/types";
import {
  getDisputePlayerIds,
  isDoublesDispute,
  planDisputeResolution,
  isLadderMatchPlayFrozen,
  canApproveReportedGame,
  getReporterSideIds,
} from "@shared/helpers";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const USERS = "users";

/**
 * Live videos for a disputed game keyed by their `gameVideos` doc id (what
 * dispute events store as `videoId`), so another player's upload appears as it
 * lands.
 */
export const subscribeToDisputeGameVideos = (
  gameId: string,
  onChange: (videosById: Record<string, GameVideo>) => void,
): (() => void) => {
  if (!gameId) return () => {};
  return onSnapshot(
    query(
      collection(db, COLLECTION_NAMES.gameVideos),
      where("gameId", "==", gameId),
    ),
    (snap) =>
      onChange(
        Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as GameVideo])),
      ),
    (error) => console.error("Error listening to dispute videos:", error),
  );
};

/** Live dispute doc, so other players' submissions and admin actions appear in place. */
export const subscribeToDispute = (
  disputeId: string,
  onChange: (dispute: Dispute | null) => void,
): (() => void) => {
  if (!disputeId) return () => {};
  return onSnapshot(
    doc(db, DISPUTES_COLLECTION, disputeId),
    (snap) => onChange(snap.exists() ? (snap.data() as Dispute) : null),
    (error) => {
      console.error("Error listening to dispute:", error);
      onChange(null);
    },
  );
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
  /** The opener's evidence (a note or a video is required). */
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
export type CreateDisputeResult = Omit<CreateDisputeOutcome, "reason"> & {
  reason?: CreateDisputeOutcome["reason"] | "not_opponent" | "frozen";
  disputeId?: string;
};

const readLadderFrozen = async (
  tx: Transaction,
  ladderId: string,
): Promise<boolean> => {
  const ladderSnap = await tx.get(doc(db, LADDERS, ladderId));
  return isLadderMatchPlayFrozen(ladderSnap.data()?.status);
};

export const createDispute = async (
  input: CreateDisputeInput,
): Promise<CreateDisputeResult> => {
  if (
    !input.ladderId ||
    !input.ladderMatchId ||
    !input.gameId ||
    !isValidEvidence(input.evidence)
  ) {
    return { success: false, reason: "invalid" };
  }

  if (!canApproveReportedGame(input.originalGame, input.openedBy)) {
    return { success: false, reason: "not_opponent" };
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
      stage: DISPUTE_STAGE.UNDER_REVIEW,
      events: [
        {
          ...input.evidence,
          type: DISPUTE_EVENT_TYPE.OPENED,
          stage: DISPUTE_STAGE.UNDER_REVIEW,
          createdBy: input.openedBy,
          createdAt: now,
        },
      ],
      evidenceDueAt: null,
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

    const disputeRef = doc(db, DISPUTES_COLLECTION, disputeId);
    const matchRef = doc(
      db,
      LADDERS,
      input.ladderId,
      LADDER_MATCHES,
      input.ladderMatchId,
    );

    // Write the dispute and flag its game as `disputed` in the match together,
    // so the fixture list shows the pill. Resolution reverts the game's status
    // through the shared resolution path (getDisputeFinalGame).
    const frozen = await runTransaction(db, async (tx) => {
      const matchSnap = await tx.get(matchRef);
      if (await readLadderFrozen(tx, input.ladderId)) return true;
      tx.set(disputeRef, pruneUndefined(dispute));
      if (!matchSnap.exists()) return false;
      const match = matchSnap.data() as LadderMatch;
      const games = match.games ?? [];
      const index = games.findIndex((g) => g.gameId === input.gameId);
      if (index === -1) return false;
      const nextGames = [...games];
      nextGames[index] = { ...nextGames[index], approvalStatus: "disputed" };
      tx.update(matchRef, { games: nextGames });
      return false;
    });
    if (frozen) return { success: false, reason: "frozen" };
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

const isValidEvidence = (evidence: DisputeEvidence): boolean =>
  getDisputeEvidenceBlocker({
    note: evidence.note,
    hasVideo: Boolean(evidence.videoId),
    courtPositions: evidence.courtPositions,
  }) === null &&
  (Boolean(evidence.videoId) || !hasCourtPositions(evidence.courtPositions));

export type AddDisputeEvidenceOutcome =
  | { success: true }
  | {
      success: false;
      reason: "invalid" | "resolved" | "video_limit" | "frozen" | "error";
    };

/**
 * Append one participant's evidence (or a note on its own) as its own
 * timeline phase. Any participant
 * can submit while the dispute is unresolved; a submission moves the dispute to
 * `under_review` (flagging it for the admin) and clears any void deadline.
 */
export const addDisputeEvidence = async (
  disputeId: string,
  userId: string,
  evidence: DisputeEvidence,
): Promise<AddDisputeEvidenceOutcome> => {
  if (!disputeId || !userId || !isValidEvidence(evidence)) {
    return { success: false, reason: "invalid" };
  }
  try {
    const ref = doc(db, DISPUTES_COLLECTION, disputeId);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { success: false, reason: "invalid" } as const;
      const dispute = snap.data() as Dispute;
      if (!DISPUTE_ACTIVE_STAGES.includes(dispute.stage)) {
        return { success: false, reason: "resolved" } as const;
      }
      if (!(dispute.participantIds ?? []).includes(userId)) {
        return { success: false, reason: "invalid" } as const;
      }
      if (await readLadderFrozen(tx, dispute.ladderId)) {
        return { success: false, reason: "frozen" } as const;
      }
      if (
        evidence.videoId &&
        !canUploadDisputeVideo(dispute.events ?? [], userId)
      ) {
        return { success: false, reason: "video_limit" } as const;
      }
      const event: DisputeEvent = pruneUndefined({
        ...evidence,
        type: getDisputeSubmissionType(evidence),
        stage: DISPUTE_STAGE.UNDER_REVIEW,
        createdBy: userId,
        createdAt: new Date(),
      });
      tx.update(ref, {
        stage: DISPUTE_STAGE.UNDER_REVIEW,
        evidenceDueAt: null,
        events: [...(dispute.events ?? []), event],
      });
      return { success: true } as const;
    });
  } catch (error) {
    console.error("Error adding dispute evidence:", error);
    return { success: false, reason: "error" };
  }
};

type ResolveOutcome<Denied extends string> =
  | { success: true }
  | { success: false; reason: Denied | "resolved" | "frozen" | "error" };

const DENIED_REASON = {
  opener: "not_opener",
  reporter_side: "not_reporter_side",
} as const;

const resolveActiveDispute = async <Role extends keyof typeof DENIED_REASON>({
  disputeId,
  userId,
  resolution,
  requires,
}: {
  disputeId: string;
  userId: string;
  resolution: DisputeResolution;
  requires: Role;
}): Promise<ResolveOutcome<(typeof DENIED_REASON)[Role]>> => {
  if (!disputeId || !userId) return { success: false, reason: "error" };
  const disputeRef = doc(db, DISPUTES_COLLECTION, disputeId);
  try {
    return await runTransaction(db, async (tx) => {
      const disputeSnap = await tx.get(disputeRef);
      if (!disputeSnap.exists()) {
        return { success: false, reason: "error" } as const;
      }
      const dispute = disputeSnap.data() as Dispute;
      const permitted =
        requires === "opener"
          ? dispute.openedBy === userId
          : dispute.openedBy !== userId &&
            getReporterSideIds(dispute.originalGame).includes(userId);
      if (!permitted) {
        return { success: false, reason: DENIED_REASON[requires] } as const;
      }
      if (!DISPUTE_ACTIVE_STAGES.includes(dispute.stage)) {
        return { success: false, reason: "resolved" } as const;
      }

      if (await readLadderFrozen(tx, dispute.ladderId)) {
        return { success: false, reason: "frozen" } as const;
      }

      const ladderPath = [LADDERS, dispute.ladderId] as const;
      const matchRef = doc(
        db,
        ...ladderPath,
        LADDER_MATCHES,
        dispute.ladderMatchId,
      );
      const matchSnap = await tx.get(matchRef);
      if (!matchSnap.exists()) throw new Error("Match not found");
      const match = matchSnap.data() as LadderMatch;

      const participantRef = (uid: string) =>
        doc(db, ...ladderPath, LADDER_PARTICIPANTS, uid);
      const teamRef = (teamKey: string) =>
        doc(db, ...ladderPath, LADDER_TEAMS, teamKey);
      const userRef = (uid: string) => doc(db, USERS, uid);
      const playerIds = getDisputePlayerIds(dispute.originalGame);

      const [participantSnaps, userSnaps, teamSnaps] = await Promise.all([
        Promise.all(playerIds.map((uid) => tx.get(participantRef(uid)))),
        Promise.all(playerIds.map((uid) => tx.get(userRef(uid)))),
        Promise.all(
          isDoublesDispute(dispute, match)
            ? (match.teams ?? []).map((t) => tx.get(teamRef(t.teamKey)))
            : [],
        ),
      ]);

      const plan = await planDisputeResolution({
        dispute,
        match,
        participants: participantSnaps
          .filter((snap) => snap.exists())
          .map((snap) => snap.data() as ScoreboardProfile),
        users: userSnaps
          .filter((snap) => snap.exists())
          .map((snap) => snap.data() as UserProfile),
        ladderTeams: teamSnaps
          .filter((snap) => snap.exists())
          .map((snap) => snap.data() as TeamStats),
        resolution,
        actorId: userId,
        now: new Date(),
      });

      plan.participants.forEach((p) => {
        if (p.userId) tx.set(participantRef(p.userId), p);
      });
      plan.users.forEach((u) =>
        tx.update(userRef(u.userId), { profileDetail: u.profileDetail }),
      );
      plan.teams.forEach((team) => tx.set(teamRef(team.teamKey), team));
      tx.update(matchRef, plan.matchUpdate);
      tx.update(disputeRef, plan.disputeUpdate);
      return { success: true } as const;
    });
  } catch (error) {
    console.error("Error resolving dispute:", error);
    return { success: false, reason: "error" };
  }
};

export type CancelDisputeOutcome = ResolveOutcome<"not_opener">;

export const cancelDispute = (
  disputeId: string,
  userId: string,
): Promise<CancelDisputeOutcome> =>
  resolveActiveDispute({
    disputeId,
    userId,
    resolution: DISPUTE_RESOLUTION.CANCELLED,
    requires: "opener",
  });

export type ApproveDisputedScoreOutcome = ResolveOutcome<"not_reporter_side">;

export const approveDisputedScore = (
  disputeId: string,
  userId: string,
): Promise<ApproveDisputedScoreOutcome> =>
  resolveActiveDispute({
    disputeId,
    userId,
    resolution: DISPUTE_RESOLUTION.UPHELD,
    requires: "reporter_side",
  });
