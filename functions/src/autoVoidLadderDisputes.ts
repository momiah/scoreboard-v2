import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { notificationSchema, notificationTypes } from "courtchamps-shared";
import {
  DISPUTES_COLLECTION,
  DISPUTE_EVIDENCE_WINDOW_HOURS,
  DISPUTE_RESOLUTION,
  DISPUTE_STAGE,
  DISPUTE_SYSTEM_ACTOR,
  isDisputeEvidenceOverdue,
} from "courtchamps-shared/types";
import type {
  Dispute,
  LadderMatch,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "courtchamps-shared/types";
import {
  getDisputePlayerIds,
  isDoublesDispute,
  planDisputeResolution,
} from "courtchamps-shared/helpers";

import { sendNotification } from "./helpers/sendNotification";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const USERS = "users";

/**
 * Void a dispute whose evidence request went unanswered: the original game is
 * approved and scored through the same shared path as the website's "Keep
 * original", the match completes if decided, and the dispute resolves as
 * `void`.
 */
const voidDispute = async (
  db: admin.firestore.Firestore,
  disputeRef: admin.firestore.DocumentReference,
  nowMs: number,
): Promise<Dispute | null> =>
  db.runTransaction(async (tx) => {
    const disputeSnap = await tx.get(disputeRef);
    if (!disputeSnap.exists) return null;
    const dispute = disputeSnap.data() as Dispute;
    if (!isDisputeEvidenceOverdue(dispute, nowMs)) return null;

    const ladderRef = db.collection(LADDERS).doc(dispute.ladderId);
    const matchRef = ladderRef
      .collection(LADDER_MATCHES)
      .doc(dispute.ladderMatchId);
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) throw new Error("Match not found");
    const match = matchSnap.data() as LadderMatch;

    const participantRef = (uid: string) =>
      ladderRef.collection(LADDER_PARTICIPANTS).doc(uid);
    const teamRef = (teamKey: string) =>
      ladderRef.collection(LADDER_TEAMS).doc(teamKey);
    const userRef = (uid: string) => db.collection(USERS).doc(uid);
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

    const now = new Date(nowMs);
    const plan = await planDisputeResolution({
      dispute,
      match,
      participants: participantSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as ScoreboardProfile),
      users: userSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as UserProfile),
      ladderTeams: teamSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as TeamStats),
      resolution: DISPUTE_RESOLUTION.VOID,
      actorId: DISPUTE_SYSTEM_ACTOR,
      now,
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

    return dispute;
  });

export const autoVoidLadderDisputes = onSchedule("every 1 hours", async () => {
  const db = admin.firestore();
  const nowMs = Date.now();
  try {
    const snapshot = await db
      .collection(DISPUTES_COLLECTION)
      .where("stage", "==", DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED)
      .get();

    const overdue = snapshot.docs.filter((d) =>
      isDisputeEvidenceOverdue(d.data() as Dispute, nowMs),
    );

    let voided = 0;
    for (const disputeDoc of overdue) {
      try {
        const dispute = await voidDispute(db, disputeDoc.ref, nowMs);
        if (!dispute) continue;
        voided += 1;
        await Promise.all(
          (dispute.participantIds ?? []).map((recipientId) =>
            sendNotification({
              ...notificationSchema,
              createdAt: new Date(),
              recipientId,
              senderId: DISPUTE_SYSTEM_ACTOR,
              message: `Your disputed game in ${
                dispute.ladderName ?? "the ladder"
              } was voided — no evidence was added within ${DISPUTE_EVIDENCE_WINDOW_HOURS} hours, so the original score stands.`,
              type: notificationTypes.INFORMATION.LADDER_DISPUTE.TYPE,
              data: {
                disputeId: dispute.disputeId,
                ladderId: dispute.ladderId,
              },
            }),
          ),
        );
      } catch (error) {
        console.log(`❌ Could not void dispute ${disputeDoc.id}:`, error);
      }
    }

    console.log(`✅ Auto-void finished. Voided ${voided} dispute(s).`);
  } catch (error) {
    console.log("❌ Auto-void function failed:", error);
  }
});
