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
  resolveLadderMatchOutcome,
  hasOpenLadderDispute,
  scoreSinglesLadderGame,
  scoreDoublesLadderGame,
} from "courtchamps-shared/helpers";

import {
  isDueForAutoApproval,
  markGameApproved,
} from "./helpers/autoApproveHelpers";
import { reconcileLadderCourtFee } from "./helpers/courtFee";

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
export const autoApproveLadderGames = onSchedule(
  "every 30 minutes",
  async () => {
    const db = admin.firestore();
    try {
      const laddersSnapshot = await db.collection(LADDERS).get();
      let approved = 0;
      for (const ladderDoc of laddersSnapshot.docs) {
        const matchesSnapshot = await ladderDoc.ref
          .collection(LADDER_MATCHES)
          .where("matchStatus", "==", LADDER_MATCH_STATUS.ACCEPTED)
          .get();
        for (const matchDoc of matchesSnapshot.docs) {
          approved += await processMatch(db, ladderDoc.id, matchDoc);
        }
      }
      console.log(
        `✅ Ladder auto-approval finished. Approved ${approved} game(s).`,
      );
    } catch (error) {
      console.log("❌ Ladder auto-approval failed:", error);
    }
  },
);

const processMatch = async (
  db: admin.firestore.Firestore,
  ladderId: string,
  matchDoc: admin.firestore.QueryDocumentSnapshot,
): Promise<number> => {
  const match = matchDoc.data() as LadderMatch;
  const games = match.games ?? [];
  const due = games
    .map((game, index) => ({ game, index }))
    .filter(({ game }) => isDueForAutoApproval(game) && !!game.result?.winner);
  if (!due.length) return 0;

  const isDoubles = (match.teams?.length ?? 0) >= 2;
  const playerIds = match.participants ?? [];
  const ladderRef = db.collection(LADDERS).doc(ladderId);

  const participantSnaps = await Promise.all(
    playerIds.map((uid) =>
      ladderRef.collection(LADDER_PARTICIPANTS).doc(uid).get(),
    ),
  );
  let participants = participantSnaps
    .filter((snap) => snap.exists)
    .map((snap) => snap.data() as ScoreboardProfile);

  const userSnaps = await Promise.all(
    playerIds.map((uid) => db.collection(USERS).doc(uid).get()),
  );
  const users = userSnaps
    .filter((snap) => snap.exists)
    .map((snap) => snap.data() as UserProfile);

  let teams: TeamStats[] = [];
  if (isDoubles) {
    const teamSnaps = await Promise.all(
      (match.teams ?? []).map((team) =>
        ladderRef.collection(LADDER_TEAMS).doc(team.teamKey).get(),
      ),
    );
    teams = teamSnaps
      .filter((snap) => snap.exists)
      .map((snap) => snap.data() as TeamStats);
  }

  const nextGames = [...games];
  const bestOf = match.bestOf ?? games.length;
  let completed = false;

  for (const { game, index } of due) {
    const approvedGame = markGameApproved(game);
    nextGames[index] = approvedGame;
    const outcome = resolveLadderMatchOutcome(nextGames, bestOf);
    const matchDecided =
      !completed &&
      outcome.decided &&
      !!outcome.winnerTeam &&
      !hasOpenLadderDispute(nextGames);

    if (isDoubles) {
      const scored = await scoreDoublesLadderGame({
        game: approvedGame,
        participants,
        users,
        ladderTeams: teams,
        matchDecided,
        matchWinnerSide: outcome.winnerTeam,
      });
      participants = scored.scoringParticipants;
      teams = scored.teams;
      if (scored.matchCompleted) completed = true;
    } else {
      const scored = scoreSinglesLadderGame({
        game: approvedGame,
        participants,
        users,
        matchDecided,
        matchWinnerSide: outcome.winnerTeam,
      });
      participants = scored.participants;
      if (scored.matchCompleted) completed = true;
    }
  }

  const batch = db.batch();
  const matchUpdate: Record<string, unknown> = {
    games: nextGames,
    lastUpdated: new Date(),
  };
  if (completed) {
    matchUpdate.matchStatus = LADDER_MATCH_STATUS.COMPLETED;
    matchUpdate.completedAt = new Date();
    // STUB: settle the court fee now the match has played out.
    reconcileLadderCourtFee(match, "completed");
  }
  batch.update(matchDoc.ref, matchUpdate);
  participants.forEach((p) => {
    if (p.userId) {
      batch.set(ladderRef.collection(LADDER_PARTICIPANTS).doc(p.userId), p);
    }
  });
  users.forEach((u) => {
    if (u.userId) {
      batch.update(db.collection(USERS).doc(u.userId), {
        profileDetail: u.profileDetail,
      });
    }
  });
  teams.forEach((team) => {
    batch.set(ladderRef.collection(LADDER_TEAMS).doc(team.teamKey), team);
  });
  await batch.commit();

  return due.length;
};
