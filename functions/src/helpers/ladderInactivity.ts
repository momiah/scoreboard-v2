import * as admin from "firebase-admin";

import { LADDER_MATCH_STATUS, LADDER_TYPE } from "courtchamps-shared/types";
import type { Ladder, LadderMatch, TeamStats } from "courtchamps-shared/types";
import {
  getInactiveLadderEntrants,
  getLadderInactivityRemoval,
  getLadderInactivityStep,
  getLadderInactivityWarning,
  markLadderInactivityWarningSent,
} from "courtchamps-shared/helpers";
import type { LadderEntrant } from "courtchamps-shared/helpers";

import { notifyLadderPlayers } from "./notifyLadderPlayers";

type Db = admin.firestore.Firestore;
type DocRef = admin.firestore.DocumentReference;

export const LADDER_INACTIVITY_CANCELLED_REASON = "Removed for inactivity";

interface LoadedEntrant extends LadderEntrant {
  ref: DocRef;
  teamId: string | null;
}

const loadEntrants = async (
  ladderRef: DocRef,
  ladder: Ladder,
): Promise<LoadedEntrant[]> => {
  if (ladder.ladderType === LADDER_TYPE.DOUBLES) {
    const snapshot = await ladderRef.collection("ladderTeams").get();
    return snapshot.docs.map((teamDoc) => {
      const team = teamDoc.data() as TeamStats;
      return {
        entrantId: team.teamKey || teamDoc.id,
        playerIds: team.playerIds ?? [],
        ref: teamDoc.ref,
        teamId: team.teamId ?? null,
      };
    });
  }
  const snapshot = await ladderRef.collection("ladderParticipants").get();
  return snapshot.docs.map((participantDoc) => ({
    entrantId: participantDoc.id,
    playerIds: [participantDoc.id],
    ref: participantDoc.ref,
    teamId: null,
  }));
};

const findInactiveEntrants = async (ladderRef: DocRef, ladder: Ladder) => {
  const [entrants, completed] = await Promise.all([
    loadEntrants(ladderRef, ladder),
    ladderRef
      .collection("ladderMatches")
      .where("matchStatus", "==", LADDER_MATCH_STATUS.COMPLETED)
      .get(),
  ]);
  return getInactiveLadderEntrants(
    entrants,
    completed.docs.map((matchDoc) => matchDoc.data() as LadderMatch),
  );
};

const removeEntrants = async ({
  db,
  ladderRef,
  ladder,
  entrants,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  entrants: LoadedEntrant[];
  now: Date;
}): Promise<void> => {
  const removedPlayerIds = new Set(entrants.flatMap(({ playerIds }) => playerIds));
  const openMatches = await ladderRef
    .collection("ladderMatches")
    .where("matchStatus", "in", [LADDER_MATCH_STATUS.POSTED, LADDER_MATCH_STATUS.ACCEPTED])
    .get();

  const writer = db.bulkWriter();
  openMatches.docs
    .filter((matchDoc) => {
      const match = matchDoc.data() as LadderMatch;
      return (
        !match.playoffTieId &&
        (match.participants ?? []).some((userId) => removedPlayerIds.has(userId))
      );
    })
    .forEach((matchDoc) =>
      writer.update(matchDoc.ref, {
        matchStatus: LADDER_MATCH_STATUS.CANCELLED,
        cancelledAt: now,
        cancelledReason: LADDER_INACTIVITY_CANCELLED_REASON,
      }),
    );
  entrants.forEach((entrant) => {
    writer.delete(entrant.ref);
    if (ladder.ladderType === LADDER_TYPE.DOUBLES) {
      entrant.playerIds.forEach((userId) =>
        writer.delete(ladderRef.collection("ladderMembers").doc(userId)),
      );
      if (entrant.teamId) {
        writer.update(db.collection("teams").doc(entrant.teamId), {
          ladderIds: admin.firestore.FieldValue.arrayRemove(ladder.ladderId),
        });
      }
    }
  });
  await writer.close();
};

/**
 * Free ladders: warns entrants without a completed season match as
 * registration close approaches, then removes them when it closes. Runs before
 * the registration-close step so the entrant count it uses is already final.
 */
export const processLadderInactivity = async ({
  db,
  ladderRef,
  ladder,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  now: Date;
}): Promise<{ warned: number; removed: number } | null> => {
  const step = getLadderInactivityStep(ladder, now.getTime());
  if (!step) return null;
  const inactive = await findInactiveEntrants(ladderRef, ladder);
  const userIds = inactive.flatMap(({ playerIds }) => playerIds);

  if (step.kind === "warn") {
    const { title, message } = getLadderInactivityWarning(ladder, step.daysLeft);
    await notifyLadderPlayers({
      userIds,
      ladder,
      kind: `inactivity-warning-${step.daysLeft}`,
      title,
      message,
      tab: "Matchmaking",
    });
    await ladderRef.update({
      inactivityWarningDaysSent: markLadderInactivityWarningSent(
        ladder.inactivityWarningDaysSent,
        step.daysLeft,
      ),
    });
    return { warned: userIds.length, removed: 0 };
  }

  await removeEntrants({ db, ladderRef, ladder, entrants: inactive, now });
  const remaining = await ladderRef
    .collection(ladder.ladderType === LADDER_TYPE.DOUBLES ? "ladderTeams" : "ladderParticipants")
    .count()
    .get();
  await ladderRef.update({
    inactivityRemovedAt: now,
    participantCount: remaining.data().count,
  });
  const { title, message } = getLadderInactivityRemoval(ladder);
  await notifyLadderPlayers({
    userIds,
    ladder,
    kind: "inactivity-removed",
    title,
    message,
    tab: "Summary",
  });
  return { warned: 0, removed: inactive.length };
};
