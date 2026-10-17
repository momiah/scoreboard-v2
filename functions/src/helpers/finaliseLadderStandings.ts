import * as admin from "firebase-admin";

import { notificationSchema, notificationTypes } from "courtchamps-shared";
import {
  DISPUTES_COLLECTION,
  DISPUTE_ACTIVE_STAGES,
  DISPUTE_RESOLUTION,
  DISPUTE_SYSTEM_ACTOR,
  LADDER_MATCH_STATUS,
  LADDER_REPORT_COUNTS_COLLECTION,
  REPORTS_COLLECTION,
  REPORT_REASONS,
  REPORT_STATUS,
} from "courtchamps-shared/types";
import type { Dispute, Ladder, LadderMatch, Report } from "courtchamps-shared/types";
import {
  LADDER_SYSTEM_ACTOR,
  decideLadderNoShowCloseOut,
  getLadderWalkoverSides,
  planLadderWalkover,
  planReportStrikes,
} from "courtchamps-shared/helpers";
import type { LadderWalkoverSide } from "courtchamps-shared/helpers";

import { resolveDisputeAsSystem } from "../autoVoidLadderDisputes";
import { notifyLadderPlayers } from "./notifyLadderPlayers";
import { sendNotification } from "./sendNotification";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_PARTICIPANTS = "ladderParticipants";
const LADDER_TEAMS = "ladderTeams";
const TEAMS = "teams";
const USERS = "users";
const BATCH_LIMIT = 400;

type Db = admin.firestore.Firestore;
type DocRef = admin.firestore.DocumentReference;

export interface LadderStandingsSummary {
  disputesDiscarded: number;
  walkoversAwarded: number;
  claimsClosed: number;
  matchesExpired: number;
}

const discardOpenDisputes = async (
  db: Db,
  ladder: Pick<Ladder, "ladderId" | "name">,
  nowMs: number,
): Promise<number> => {
  const snapshot = await db
    .collection(DISPUTES_COLLECTION)
    .where("ladderId", "==", ladder.ladderId)
    .get();
  let discarded = 0;
  for (const disputeDoc of snapshot.docs) {
    if (!DISPUTE_ACTIVE_STAGES.includes((disputeDoc.data() as Dispute).stage)) {
      continue;
    }
    const dispute = await resolveDisputeAsSystem({
      db,
      disputeRef: disputeDoc.ref,
      nowMs,
      resolution: DISPUTE_RESOLUTION.DISCARDED,
      isDue: (current) => DISPUTE_ACTIVE_STAGES.includes(current.stage),
    });
    if (!dispute) continue;
    discarded += 1;
    await Promise.all(
      (dispute.participantIds ?? []).map((recipientId) =>
        sendNotification({
          ...notificationSchema,
          createdAt: new Date(nowMs),
          recipientId,
          senderId: DISPUTE_SYSTEM_ACTOR,
          message: `Your disputed game in ${ladder.name} wasn't decided before the standings became final for the playoffs, so it has been discarded and neither side gets its CP.`,
          type: notificationTypes.INFORMATION.LADDER_DISPUTE.TYPE,
          data: { disputeId: dispute.disputeId, ladderId: ladder.ladderId },
        }),
      ),
    );
  }
  return discarded;
};

const sideRef = (db: Db, ladderRef: DocRef, side: LadderWalkoverSide): DocRef =>
  side.kind === "ladderParticipant"
    ? ladderRef.collection(LADDER_PARTICIPANTS).doc(side.id)
    : side.kind === "ladderTeam"
      ? ladderRef.collection(LADDER_TEAMS).doc(side.id)
      : db.collection(TEAMS).doc(side.id);

const awardWalkover = async ({
  db,
  ladderRef,
  matchRef,
  report,
  others,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  matchRef: DocRef;
  report: Report;
  others: Report[];
  now: Date;
}): Promise<boolean> =>
  db.runTransaction(async (transaction) => {
    const reportRef = db.collection(REPORTS_COLLECTION).doc(report.reportId);
    const fresh = await transaction.get(reportRef);
    if ((fresh.data() as Report | undefined)?.status !== REPORT_STATUS.PENDING) return false;
    const walkover = report.walkover;
    if (!walkover) return false;

    const sides = getLadderWalkoverSides(report, walkover);
    const sideRefs = sides.map((side) => sideRef(db, ladderRef, side));
    const targetIds = report.target.userIds ?? [];
    const countRefs = targetIds.map((userId) =>
      ladderRef.collection(LADDER_REPORT_COUNTS_COLLECTION).doc(userId),
    );
    const userRefs = targetIds.map((userId) => db.collection(USERS).doc(userId));
    const [matchSnap, sideSnaps, countSnaps, userSnaps] = await Promise.all([
      transaction.get(matchRef),
      Promise.all(sideRefs.map((ref) => transaction.get(ref))),
      Promise.all(countRefs.map((ref) => transaction.get(ref))),
      Promise.all(userRefs.map((ref) => transaction.get(ref))),
    ]);
    if (matchSnap.data()?.matchStatus !== LADDER_MATCH_STATUS.ACCEPTED) return false;

    const walkoverPlan = planLadderWalkover({
      walkover,
      sides,
      sideData: sideSnaps.map((snap) => (snap.exists ? snap.data() : undefined)),
      match: matchSnap.data(),
      mode: "approve",
      now,
    });
    const strikes = planReportStrikes({
      report,
      counts: countSnaps.map((snap) => snap.data()),
      users: userSnaps.map((snap) => snap.data()),
      mode: "apply",
      now,
    });

    walkoverPlan.sideUpdates.forEach((update, index) => {
      if (update) transaction.update(sideRefs[index], update);
    });
    if (walkoverPlan.matchUpdate) {
      transaction.update(matchRef, { ...walkoverPlan.matchUpdate, noShowReported: false });
    }
    strikes.countUpdates.forEach((update, index) =>
      transaction.set(countRefs[index], update, { merge: true }),
    );
    strikes.userUpdates.forEach((update, index) =>
      transaction.set(userRefs[index], update, { merge: true }),
    );
    transaction.update(reportRef, {
      status: REPORT_STATUS.APPROVED,
      resolvedAt: now,
      resolvedBy: LADDER_SYSTEM_ACTOR,
    });
    others.forEach((other) =>
      transaction.update(db.collection(REPORTS_COLLECTION).doc(other.reportId), {
        status: REPORT_STATUS.REJECTED,
        resolvedAt: now,
        resolvedBy: LADDER_SYSTEM_ACTOR,
      }),
    );
    return true;
  });

const closeClaims = async (
  db: Db,
  matchRef: DocRef,
  claims: Report[],
  now: Date,
): Promise<void> => {
  const batch = db.batch();
  claims.forEach((claim) =>
    batch.update(db.collection(REPORTS_COLLECTION).doc(claim.reportId), {
      status: REPORT_STATUS.REJECTED,
      resolvedAt: now,
      resolvedBy: LADDER_SYSTEM_ACTOR,
    }),
  );
  batch.update(matchRef, { noShowReported: false });
  await batch.commit();
};

const settleNoShowClaims = async (
  db: Db,
  ladderRef: DocRef,
  ladder: Pick<Ladder, "ladderId" | "name">,
  now: Date,
): Promise<{ awarded: number; closed: number }> => {
  const snapshot = await db
    .collection(REPORTS_COLLECTION)
    .where("ladderId", "==", ladder.ladderId)
    .where("status", "==", REPORT_STATUS.PENDING)
    .get();
  const byMatch = new Map<string, Report[]>();
  snapshot.docs
    .map((reportDoc) => ({ ...(reportDoc.data() as Report), reportId: reportDoc.id }))
    .filter((report) => report.reason === REPORT_REASONS.NO_SHOW)
    .forEach((report) =>
      byMatch.set(report.ladderMatchId, [...(byMatch.get(report.ladderMatchId) ?? []), report]),
    );

  let awarded = 0;
  let closed = 0;
  for (const [matchId, claims] of byMatch) {
    const matchRef = ladderRef.collection(LADDER_MATCHES).doc(matchId);
    const matchSnap = await matchRef.get();
    if (!matchSnap.exists) continue;
    const match = matchSnap.data() as LadderMatch;
    const claimantIds = [...new Set(claims.map((claim) => claim.reportedBy))];
    const history = (
      await Promise.all(
        claimantIds.map((userId) =>
          db.collection(REPORTS_COLLECTION).where("reportedBy", "==", userId).get(),
        ),
      )
    ).flatMap((result) => result.docs.map((reportDoc) => reportDoc.data() as Report));

    const decision = decideLadderNoShowCloseOut({ match, claims, claimantHistory: history });
    const participants = match.participants ?? [];
    if ("report" in decision) {
      const others = claims.filter((claim) => claim.reportId !== decision.report.reportId);
      if (
        await awardWalkover({ db, ladderRef, matchRef, report: decision.report, others, now })
      ) {
        awarded += 1;
        await notifyLadderPlayers({
          userIds: participants,
          ladder,
          kind: `no-show-closed-${matchId}`,
          title: "No-show settled",
          message: `The no-show at ${match.court?.courtName ?? "your match"} in ${ladder.name} has been settled before the playoffs: the match goes to the side that turned up.`,
          tab: "Summary",
        });
      }
      continue;
    }
    await closeClaims(db, matchRef, claims, now);
    closed += 1;
    await notifyLadderPlayers({
      userIds: participants,
      ladder,
      kind: `no-show-closed-${matchId}`,
      title: "No-show closed",
      message: `The no-show claim at ${match.court?.courtName ?? "your match"} in ${ladder.name} couldn't be confirmed before the standings became final, so no walkover was awarded. Any approved games still count.`,
      tab: "Summary",
    });
  }
  return { awarded, closed };
};

const expireUnfinishedMatches = async (
  db: Db,
  ladderRef: DocRef,
  now: Date,
): Promise<number> => {
  const snapshot = await ladderRef
    .collection(LADDER_MATCHES)
    .where("matchStatus", "==", LADDER_MATCH_STATUS.ACCEPTED)
    .get();
  const refs = snapshot.docs
    .filter((matchDoc) => !(matchDoc.data() as LadderMatch).playoffTieId)
    .map((matchDoc) => matchDoc.ref);
  for (let start = 0; start < refs.length; start += BATCH_LIMIT) {
    const batch = db.batch();
    refs.slice(start, start + BATCH_LIMIT).forEach((ref) =>
      batch.update(ref, { matchStatus: LADDER_MATCH_STATUS.EXPIRED, expiredAt: now }),
    );
    await batch.commit();
  }
  return refs.length;
};

/**
 * Makes a ladder's standings final before playoffs: every dispute still open is
 * discarded, every no-show claim still open is settled (a walkover only when the
 * arrivals make it clear) or closed, and every unfinished regular match
 * expires, keeping its approved games. Each step re-reads what's still open, so
 * re-running is harmless.
 */
export const finaliseLadderStandings = async ({
  db,
  ladder,
  now,
}: {
  db: Db;
  ladder: Pick<Ladder, "ladderId" | "name">;
  now: Date;
}): Promise<LadderStandingsSummary> => {
  const ladderRef = db.collection(LADDERS).doc(ladder.ladderId);
  const disputesDiscarded = await discardOpenDisputes(db, ladder, now.getTime());
  const { awarded, closed } = await settleNoShowClaims(db, ladderRef, ladder, now);
  const matchesExpired = await expireUnfinishedMatches(db, ladderRef, now);
  await ladderRef.update({ standingsFinalisedAt: now });
  return {
    disputesDiscarded,
    walkoversAwarded: awarded,
    claimsClosed: closed,
    matchesExpired,
  };
};
