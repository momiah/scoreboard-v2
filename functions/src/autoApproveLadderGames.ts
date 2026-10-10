import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { LADDER_MATCH_STATUS } from "courtchamps-shared/types";
import type {
  LadderMatch,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "courtchamps-shared/types";
import {
  isLadderMatchPlayFrozen,
  planLadderGameApproval,
} from "courtchamps-shared/helpers";

import { isDueForAutoApproval } from "./helpers/autoApproveHelpers";

const LADDERS = "ladders";
const LADDER_MATCHES = "ladderMatches";
const LADDER_PARTICIPANTS = "ladderParticipants";
const LADDER_TEAMS = "ladderTeams";
const USERS = "users";

/**
 * Auto-approves ladder games left pending past the window, then scores them and
 * completes the match through the shared ladder scoring path — the admin-SDK
 * mirror of the app's approveLadderGame. Completion is held while any game is
 * disputed, exactly as in the app.
 */
const LADDER_CONCURRENCY = 5;

const processLadder = async (
  db: admin.firestore.Firestore,
  ladderDoc: admin.firestore.QueryDocumentSnapshot,
): Promise<number> => {
  if (isLadderMatchPlayFrozen(ladderDoc.data().status)) return 0;
  let approved = 0;
  const matchesSnapshot = await ladderDoc.ref
    .collection(LADDER_MATCHES)
    .where("matchStatus", "==", LADDER_MATCH_STATUS.ACCEPTED)
    .get();
  for (const matchDoc of matchesSnapshot.docs) {
    try {
      approved += await processMatch(db, ladderDoc.id, matchDoc);
    } catch (error) {
      console.error(
        `❌ Ladder auto-approval failed for ${ladderDoc.id}/${matchDoc.id}:`,
        error,
      );
    }
  }
  return approved;
};

/**
 * Auto-approves ladder games left pending past the window, then scores them and
 * completes the match through the shared ladder scoring path — the admin-SDK
 * mirror of the app's approveLadderGame. Completion is held while any game is
 * disputed, exactly as in the app. A failing match or ladder never stops the
 * rest of the run.
 */
export const runAutoApproveLadderGames = async (): Promise<void> => {
  const db = admin.firestore();
  try {
    const laddersSnapshot = await db.collection(LADDERS).get();
    let approved = 0;
    for (let i = 0; i < laddersSnapshot.docs.length; i += LADDER_CONCURRENCY) {
      const chunk = laddersSnapshot.docs.slice(i, i + LADDER_CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map((ladderDoc) => processLadder(db, ladderDoc)),
      );
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          approved += result.value;
        } else {
          console.error(
            `❌ Ladder auto-approval failed for ${chunk[index].id}:`,
            result.reason,
          );
        }
      });
    }
    console.log(
      `✅ Ladder auto-approval finished. Approved ${approved} game(s).`,
    );
  } catch (error) {
    console.log("❌ Ladder auto-approval failed:", error);
  }
};

export const autoApproveLadderGames = onSchedule(
  { schedule: "every 30 minutes", timeoutSeconds: 540, memory: "1GiB" },
  async () => {
    await runAutoApproveLadderGames();
  },
);

const approveDueGame = (
  db: admin.firestore.Firestore,
  ladderRef: admin.firestore.DocumentReference,
  matchRef: admin.firestore.DocumentReference,
  gameId: string,
): Promise<boolean> =>
  db.runTransaction(async (transaction) => {
    const [matchSnap, ladderSnap] = await Promise.all([
      transaction.get(matchRef),
      transaction.get(ladderRef),
    ]);
    if (!matchSnap.exists) return false;

    const match = matchSnap.data() as LadderMatch;
    const game = (match.games ?? []).find((g) => g.gameId === gameId);
    if (!game || !game.result?.winner) return false;
    if (!isDueForAutoApproval(game, match.gameReportedAt?.[gameId])) {
      return false;
    }

    const playerIds = match.participants ?? [];
    const teamKeys =
      (match.teams?.length ?? 0) >= 2
        ? (match.teams ?? []).map((team) => team.teamKey)
        : [];
    const [participantSnaps, userSnaps, teamSnaps] = await Promise.all([
      Promise.all(
        playerIds.map((uid) =>
          transaction.get(ladderRef.collection(LADDER_PARTICIPANTS).doc(uid)),
        ),
      ),
      Promise.all(
        playerIds.map((uid) => transaction.get(db.collection(USERS).doc(uid))),
      ),
      Promise.all(
        teamKeys.map((key) =>
          transaction.get(ladderRef.collection(LADDER_TEAMS).doc(key)),
        ),
      ),
    ]);

    const plan = await planLadderGameApproval({
      match,
      gameId,
      actor: { kind: "auto" },
      ladderStatus: ladderSnap.data()?.status,
      participants: participantSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as ScoreboardProfile),
      users: userSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as UserProfile),
      ladderTeams: teamSnaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() as TeamStats),
      now: new Date(),
    });
    if (!plan.ok) return false;

    plan.participants.forEach((p) => {
      if (p.userId) {
        transaction.set(
          ladderRef.collection(LADDER_PARTICIPANTS).doc(p.userId),
          p,
        );
      }
    });
    plan.users.forEach((u) => {
      if (u.userId) {
        transaction.update(db.collection(USERS).doc(u.userId), {
          profileDetail: u.profileDetail,
        });
      }
    });
    plan.teams.forEach((team) => {
      transaction.set(
        ladderRef.collection(LADDER_TEAMS).doc(team.teamKey),
        team,
      );
    });
    transaction.update(matchRef, plan.matchUpdate as Record<string, unknown>);
    return true;
  });

const processMatch = async (
  db: admin.firestore.Firestore,
  ladderId: string,
  matchDoc: admin.firestore.QueryDocumentSnapshot,
): Promise<number> => {
  const match = matchDoc.data() as LadderMatch;
  const dueGameIds = (match.games ?? [])
    .filter(
      (game) =>
        isDueForAutoApproval(game, match.gameReportedAt?.[game.gameId]) &&
        !!game.result?.winner,
    )
    .map((game) => game.gameId);

  const ladderRef = db.collection(LADDERS).doc(ladderId);
  let approved = 0;
  for (const gameId of dueGameIds) {
    if (await approveDueGame(db, ladderRef, matchDoc.ref, gameId))
      approved += 1;
  }
  return approved;
};
