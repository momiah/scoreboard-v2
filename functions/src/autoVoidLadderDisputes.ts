import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { notificationSchema, notificationTypes } from "courtchamps-shared";
import {
  DISPUTES_COLLECTION,
  DISPUTE_EVENT_TYPE,
  DISPUTE_EVIDENCE_WINDOW_HOURS,
  DISPUTE_RESOLUTION,
  DISPUTE_STAGE,
  DISPUTE_SYSTEM_ACTOR,
  LADDER_MATCH_STATUS,
  LADDER_TYPE,
  isDisputeEvidenceOverdue,
} from "courtchamps-shared/types";
import type {
  Dispute,
  DisputeEvent,
  Game,
  LadderMatch,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "courtchamps-shared/types";
import {
  resolveLadderMatchOutcome,
  scoreDoublesLadderGame,
  scoreSinglesLadderGame,
} from "courtchamps-shared/helpers";

import { sendNotification } from "./helpers/sendNotification";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_TEAMS = "ladderTeams";
const LADDER_PARTICIPANTS = "ladderParticipants";
const USERS = "users";

const pruneUndefined = <T>(value: T): T =>
  Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    ),
  ) as T;

/**
 * Void a dispute whose evidence request went unanswered: the original game is
 * approved and scored exactly as the website's "Keep original" action does,
 * the match completes if decided, and the dispute resolves as `void`.
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

    const finalGame = pruneUndefined<Game>({
      ...dispute.originalGame,
      approvalStatus: notificationTypes.RESPONSE.APPROVED_GAME,
    });

    const matchRef = db
      .collection(LADDERS)
      .doc(dispute.ladderId)
      .collection(LADDER_MATCHES)
      .doc(dispute.ladderMatchId);
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists) throw new Error("Match not found");

    const match = matchSnap.data() as LadderMatch;
    if (match.matchStatus === LADDER_MATCH_STATUS.COMPLETED) {
      throw new Error("Match has already been completed");
    }

    const games = match.games ?? [];
    const index = games.findIndex((g) => g.gameId === dispute.gameId);
    if (index === -1) throw new Error("Game not found in match");

    const nextGames = [...games];
    nextGames[index] = finalGame;

    const outcome = resolveLadderMatchOutcome(
      nextGames,
      match.bestOf ?? nextGames.length,
    );
    const matchDecided = outcome.decided && !!outcome.winnerTeam;

    const playerUserIds = [
      finalGame.team1.player1?.userId,
      finalGame.team1.player2?.userId,
      finalGame.team2.player1?.userId,
      finalGame.team2.player2?.userId,
    ].filter((id): id is string => Boolean(id));

    const isDoubles =
      (match.teams?.length ?? 0) >= 2 ||
      dispute.ladderType === LADDER_TYPE.DOUBLES;

    const ladderRef = db.collection(LADDERS).doc(dispute.ladderId);
    const participantRef = (uid: string) =>
      ladderRef.collection(LADDER_PARTICIPANTS).doc(uid);
    const teamRef = (teamKey: string) =>
      ladderRef.collection(LADDER_TEAMS).doc(teamKey);

    const [participantSnaps, userSnaps, teamSnaps] = await Promise.all([
      Promise.all(playerUserIds.map((uid) => tx.get(participantRef(uid)))),
      Promise.all(
        playerUserIds.map((uid) => tx.get(db.collection(USERS).doc(uid))),
      ),
      Promise.all(
        isDoubles
          ? (match.teams ?? []).map((t) => tx.get(teamRef(t.teamKey)))
          : [],
      ),
    ]);

    const participants = participantSnaps
      .filter((snap) => snap.exists)
      .map((snap) => snap.data() as ScoreboardProfile);
    const users = userSnaps
      .filter((snap) => snap.exists)
      .map((snap) => snap.data() as UserProfile);
    const ladderTeams = teamSnaps
      .filter((snap) => snap.exists)
      .map((snap) => snap.data() as TeamStats);

    const persistUsers = () =>
      users.forEach((u) => {
        if (!u.userId) return;
        tx.update(db.collection(USERS).doc(u.userId), {
          profileDetail: u.profileDetail,
        });
      });

    if (isDoubles) {
      const { scoringParticipants, teams } = await scoreDoublesLadderGame({
        game: finalGame,
        participants,
        users,
        ladderTeams,
        matchDecided,
        matchWinnerSide: outcome.winnerTeam,
      });
      scoringParticipants.forEach((p) => {
        if (p.userId) tx.set(participantRef(p.userId), p);
      });
      persistUsers();
      teams.forEach((team) => tx.set(teamRef(team.teamKey), team));
    } else {
      scoreSinglesLadderGame({
        game: finalGame,
        participants,
        users,
        matchDecided,
        matchWinnerSide: outcome.winnerTeam,
      });
      participants.forEach((p) => {
        if (p.userId) tx.set(participantRef(p.userId), p);
      });
      persistUsers();
    }

    const now = new Date(nowMs);
    const matchUpdate: Record<string, unknown> = {
      games: nextGames,
      lastUpdated: now,
    };
    if (matchDecided) {
      matchUpdate.matchStatus = LADDER_MATCH_STATUS.COMPLETED;
      matchUpdate.completedAt = now;
    }
    tx.update(matchRef, matchUpdate);

    const event: DisputeEvent = {
      type: DISPUTE_EVENT_TYPE.VOIDED,
      stage: DISPUTE_STAGE.RESOLVED,
      createdBy: DISPUTE_SYSTEM_ACTOR,
      createdAt: now,
    };
    tx.update(disputeRef, {
      stage: DISPUTE_STAGE.RESOLVED,
      resolution: DISPUTE_RESOLUTION.VOID,
      finalGame,
      evidenceDueAt: null,
      resolvedAt: now,
      resolvedBy: DISPUTE_SYSTEM_ACTOR,
      events: [...(dispute.events ?? []), event],
    });

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
