import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import {
  LADDER_CANCELLED_REASON,
  LADDER_MATCH_STATUS,
  LADDER_PLAYOFF_TIES_COLLECTION,
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_REPORT_COUNTS_COLLECTION,
  LADDER_STATUS,
  LADDER_TYPE,
  TEAM_STATUS,
} from "courtchamps-shared/types";
import type {
  Ladder,
  LadderHomeCourt,
  LadderPlayoffTie,
  LadderReportCounts,
  LadderStatus,
  Player,
  ScoreboardProfile,
  TeamStats,
  UserProfile,
} from "courtchamps-shared/types";
import {
  LADDER_MIN_PLAYOFF_SIZE,
  buildLadderPlayoffTies,
  deriveExtendedLadderDates,
  getDisqualification,
  getLadderPlayoffQualifiers,
  getLadderSeasonCancelledNotification,
  getLadderSeasonExtendedNotification,
  getLadderSeasonStartStep,
  getLadderSeasonStartedNotification,
  isLadderSeasonStarted,
  isLadderStandingsFinal,
} from "courtchamps-shared/helpers";
import type {
  LadderNotificationCopy,
  LadderPlayoffEntrant,
} from "courtchamps-shared/helpers";

import { refundLadderEntryFees } from "./helpers/refundLadderEntryFees";
import { finaliseLadderStandings } from "./helpers/finaliseLadderStandings";
import { notifyLadderPlayers } from "./helpers/notifyLadderPlayers";
import {
  completeAndPayLadder,
  completeLadderPlayoffsIfFinished,
  notifyLadderPlayoffResolution,
  resolveLadderPlayoffTie,
  autoAcceptDueLadderPlayoffMatches,
  sendDueLadderPlayoffReminders,
  sendLadderPlayoffHostOverdueNotices,
  settleDisqualifiedLadderPlayoffTies,
  toLadderPlayoffTie,
} from "./helpers/ladderPlayoffTies";

const LADDERS = "ladders";
const LADDER_PARTICIPANTS = "ladderParticipants";
const LADDER_TEAMS = "ladderTeams";
const USERS = "users";
const USERS_PER_READ = 300;
const HOUR_MS = 60 * 60 * 1000;
const NOTIFICATION_RESUME_DAYS = 3;

const PRE_PLAYOFF_STATUSES: LadderStatus[] = [
  LADDER_STATUS.REGISTRATION_OPEN,
  LADDER_STATUS.REGISTRATION_CLOSED,
];

type Db = admin.firestore.Firestore;
type DocRef = admin.firestore.DocumentReference;

const openLadderPlayoffTies = async (ladderRef: DocRef) => {
  const snapshot = await ladderRef
    .collection(LADDER_PLAYOFF_TIES_COLLECTION)
    .where("status", "==", LADDER_PLAYOFF_TIE_STATUS.SCHEDULED)
    .get();
  return snapshot.docs.map((tieDoc) => toLadderPlayoffTie(tieDoc.id, tieDoc.data()));
};

const runPlayoffDeadlinesAndReminders = async (
  db: Db,
  now: Date,
  summary: ProcessLadderPhasesSummary,
): Promise<void> => {
  const snapshot = await db
    .collection(LADDERS)
    .where("status", "==", LADDER_STATUS.PLAYOFFS)
    .get();
  for (const ladderDoc of snapshot.docs) {
    const ladder = { ...(ladderDoc.data() as Ladder), ladderId: ladderDoc.id };
    try {
      const tiesSnapshot = await ladderDoc.ref
        .collection(LADDER_PLAYOFF_TIES_COLLECTION)
        .where("status", "==", LADDER_PLAYOFF_TIE_STATUS.SCHEDULED)
        .get();
      const ties = tiesSnapshot.docs.map((tieDoc) =>
        toLadderPlayoffTie(tieDoc.id, tieDoc.data()),
      );
      summary.playoffTiesSettled.push(
        ...(await settleDisqualifiedLadderPlayoffTies({ db, ladder, ties, now })).map(
          (tieId) => `${ladder.ladderId}/${tieId}`,
        ),
      );
      const openTies = await openLadderPlayoffTies(ladderDoc.ref);
      for (const tie of openTies) {
        if (!tie.deadlineAt || now.getTime() < tie.deadlineAt.getTime()) continue;
        const resolution = await resolveLadderPlayoffTie({
          db,
          ladderId: ladder.ladderId,
          tieId: tie.tieId,
          now,
          atDeadline: true,
        });
        if (!resolution) continue;
        summary.playoffTiesSettled.push(`${ladder.ladderId}/${tie.tieId}`);
        await notifyLadderPlayoffResolution({ ladder, resolution });
        if (
          await completeLadderPlayoffsIfFinished({
            db,
            ladderId: ladder.ladderId,
            resolution,
            now,
          })
        ) {
          summary.laddersPaid.push(ladder.ladderId);
        }
      }
      if ((await completeAndPayLadder({ db, ladderId: ladder.ladderId, now })).paid) {
        summary.laddersPaid.push(ladder.ladderId);
        continue;
      }
      summary.playoffMatchesAutoAccepted.push(
        ...(await autoAcceptDueLadderPlayoffMatches({ db, ladder, now })).map(
          (matchId) => `${ladder.ladderId}/${matchId}`,
        ),
      );
      summary.playoffHostNoticesSent += await sendLadderPlayoffHostOverdueNotices({
        db,
        ladder,
        ties: openTies,
        now,
      });
      summary.playoffRemindersSent += await sendDueLadderPlayoffReminders({
        db,
        ladder,
        ties: openTies.filter(
          (tie) => !tie.deadlineAt || now.getTime() < tie.deadlineAt.getTime(),
        ),
        now,
      });
    } catch (error) {
      console.log(
        `❌ processLadderPhases playoff deadlines failed for ${ladder.ladderId}:`,
        error,
      );
    }
  }
};

export interface ProcessLadderPhasesSummary {
  seasonsStarted: string[];
  seasonsExtended: string[];
  registrationClosed: string[];
  cancelled: string[];
  playoffsGenerated: string[];
  standingsFinalised: string[];
  playoffTiesSettled: string[];
  playoffRemindersSent: number;
  playoffHostNoticesSent: number;
  playoffMatchesAutoAccepted: string[];
  laddersPaid: string[];
}

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
};

const isDue = (value: unknown, now: Date): boolean => {
  const date = toDate(value);
  return !!date && date.getTime() <= now.getTime();
};

const isPrePlayoff = (status: unknown): boolean =>
  PRE_PLAYOFF_STATUSES.includes(status as LadderStatus);

const entrantsCollection = (ladderRef: DocRef, ladder: Ladder) =>
  ladderRef.collection(
    ladder.ladderType === LADDER_TYPE.DOUBLES ? LADDER_TEAMS : LADDER_PARTICIPANTS,
  );

const fetchUsers = async (
  db: Db,
  userIds: string[],
): Promise<Map<string, UserProfile>> => {
  const users = new Map<string, UserProfile>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  for (let start = 0; start < uniqueIds.length; start += USERS_PER_READ) {
    const refs = uniqueIds
      .slice(start, start + USERS_PER_READ)
      .map((userId) => db.collection(USERS).doc(userId));
    const snapshots = await db.getAll(...refs);
    snapshots.forEach((snapshot) => {
      if (snapshot.exists) users.set(snapshot.id, snapshot.data() as UserProfile);
    });
  }
  return users;
};

const toPlayer = (
  userId: string,
  user: UserProfile | undefined,
  fallback?: Partial<Player>,
): Player => ({
  userId,
  firstName: user?.firstName ?? fallback?.firstName ?? "",
  lastName: user?.lastName ?? fallback?.lastName ?? "",
  username: user?.username ?? fallback?.username ?? "",
});

const globalXp = (user: UserProfile | undefined): number =>
  user?.profileDetail?.XP ?? 0;

const toHomeCourt = (value: unknown): LadderHomeCourt | null =>
  value && typeof value === "object" && (value as LadderHomeCourt).courtId
    ? (value as LadderHomeCourt)
    : null;

const loadEntrantPlayerIds = async (
  ladderRef: DocRef,
  ladder: Ladder,
): Promise<string[]> => {
  const snapshot = await entrantsCollection(ladderRef, ladder).get();
  return snapshot.docs.flatMap((entrantDoc) => {
    const data = entrantDoc.data() as ScoreboardProfile & TeamStats;
    return ladder.ladderType === LADDER_TYPE.DOUBLES
      ? data.playerIds ?? []
      : [data.userId || entrantDoc.id];
  });
};

const loadDisqualifiedUserIds = async (
  ladderRef: DocRef,
): Promise<Set<string>> => {
  const snapshot = await ladderRef
    .collection(LADDER_REPORT_COUNTS_COLLECTION)
    .get();
  return new Set(
    snapshot.docs
      .filter(
        (countsDoc) =>
          getDisqualification(
            (countsDoc.data() as LadderReportCounts).strikes ?? {},
          ).disqualified,
      )
      .map((countsDoc) => countsDoc.id),
  );
};

interface LoadedEntrants {
  entrants: LadderPlayoffEntrant[];
  disqualifiedPlayerIds: string[];
}

const loadEntrants = async (
  db: Db,
  ladderRef: DocRef,
  ladder: Ladder,
): Promise<LoadedEntrants> => {
  const snapshot = await entrantsCollection(ladderRef, ladder).get();
  const disqualified = await loadDisqualifiedUserIds(ladderRef);

  if (ladder.ladderType === LADDER_TYPE.DOUBLES) {
    const teams = snapshot.docs
      .map((teamDoc) => ({ id: teamDoc.id, team: teamDoc.data() as TeamStats }))
      .filter(
        ({ team }) =>
          team.status !== TEAM_STATUS.PENDING &&
          (team.playerIds ?? []).length >= 2,
      );
    const users = await fetchUsers(
      db,
      teams.flatMap(({ team }) => team.playerIds ?? []),
    );
    const disqualifiedPlayerIds: string[] = [];
    const eligible = teams.filter(({ team }) => {
      const playerIds = team.playerIds ?? [];
      if (!playerIds.every((userId) => users.has(userId))) return false;
      if (playerIds.some((userId) => disqualified.has(userId))) {
        disqualifiedPlayerIds.push(...playerIds);
        return false;
      }
      return true;
    });
    return {
      disqualifiedPlayerIds,
      entrants: eligible.map(({ id, team }) => {
        const playerIds = team.playerIds ?? [];
        return {
          entrantKey: team.teamKey || id,
          teamId: team.teamId ?? null,
          players: playerIds.map((userId) =>
            toPlayer(
              userId,
              users.get(userId),
              team.players?.find((member) => member.userId === userId),
            ),
          ),
          competitionXP: team.XP ?? 0,
          numberOfWins: team.numberOfWins ?? 0,
          totalPointDifference: team.totalPointDifference ?? 0,
          globalXp: playerIds.reduce(
            (sum, userId) => sum + globalXp(users.get(userId)),
            0,
          ),
          joinedAt: toDate(team.joinedAt),
          homeCourt: toHomeCourt(team.homeCourt),
        };
      }),
    };
  }

  const participants = snapshot.docs.map((participantDoc) => ({
    userId:
      (participantDoc.data() as ScoreboardProfile).userId || participantDoc.id,
    participant: participantDoc.data() as ScoreboardProfile,
  }));
  const users = await fetchUsers(
    db,
    participants.map(({ userId }) => userId),
  );
  const existing = participants.filter(({ userId }) => users.has(userId));
  return {
    disqualifiedPlayerIds: existing
      .filter(({ userId }) => disqualified.has(userId))
      .map(({ userId }) => userId),
    entrants: existing
      .filter(({ userId }) => !disqualified.has(userId))
      .map(({ userId, participant }) => ({
        entrantKey: userId,
        teamId: null,
        players: [toPlayer(userId, users.get(userId), participant)],
        competitionXP: participant.competitionXP ?? 0,
        numberOfWins: participant.numberOfWins ?? 0,
        totalPointDifference: participant.totalPointDifference ?? 0,
        globalXp: globalXp(users.get(userId)),
        joinedAt: toDate(participant.joinedAt),
        homeCourt: toHomeCourt(participant.homeCourt),
      })),
  };
};

const registrationClosedCancellation = (ladder: Ladder): LadderNotificationCopy => ({
  title: "Ladder cancelled",
  message: `${ladder.name} has been cancelled because not enough players signed up before registration closed. If you paid an entry fee, it will be refunded to you in full.`,
});

const sendCancellationNotifications = async ({
  ladderRef,
  ladder,
}: {
  ladderRef: DocRef;
  ladder: Ladder;
}): Promise<void> => {
  const { title, message } = ladder.seasonStartedAt
    ? registrationClosedCancellation(ladder)
    : getLadderSeasonCancelledNotification(ladder);
  await notifyLadderPlayers({
    userIds: await loadEntrantPlayerIds(ladderRef, ladder),
    ladder,
    kind: "ladder-cancelled",
    title,
    message,
    tab: "Summary",
  });
  await ladderRef.update({ cancellationNotificationsSentAt: new Date() });
};

type SeasonNotice = "started" | "extended";

const SEASON_NOTICE_SENT_FIELD: Record<SeasonNotice, string> = {
  started: "seasonStartNotificationsSentAt",
  extended: "seasonExtensionNotificationsSentAt",
};

const sendSeasonNotifications = async ({
  ladderRef,
  ladder,
  notice,
  entrantCount,
}: {
  ladderRef: DocRef;
  ladder: Ladder;
  notice: SeasonNotice;
  entrantCount: number;
}): Promise<void> => {
  const { title, message } =
    notice === "started"
      ? getLadderSeasonStartedNotification(ladder)
      : getLadderSeasonExtendedNotification(ladder, entrantCount);
  await notifyLadderPlayers({
    userIds: await loadEntrantPlayerIds(ladderRef, ladder),
    ladder,
    kind: `season-${notice}`,
    title,
    message,
    tab: "Summary",
  });
  await ladderRef.update({ [SEASON_NOTICE_SENT_FIELD[notice]]: new Date() });
};

const firstRoundTies = (
  ties: Pick<LadderPlayoffTie, "tieId" | "round" | "side1" | "side2">[],
): QualifierTie[] =>
  ties
    .filter((tie) => tie.round === 1)
    .map((tie) => ({
      tieId: tie.tieId,
      playerIds: [...(tie.side1?.playerIds ?? []), ...(tie.side2?.playerIds ?? [])],
    }));

interface QualifierTie {
  tieId: string;
  playerIds: string[];
}

const sendPlayoffNotifications = async ({
  ladderRef,
  ladder,
  qualifierTies,
  eliminatedPlayerIds,
}: {
  ladderRef: DocRef;
  ladder: Ladder;
  qualifierTies: QualifierTie[];
  eliminatedPlayerIds: string[];
}): Promise<void> => {
  for (const { tieId, playerIds } of qualifierTies) {
    await notifyLadderPlayers({
      userIds: playerIds,
      ladder,
      kind: "playoffs-promotion",
      title: "You made the playoffs!",
      message: `Congratulations! You've made the playoffs for ${ladder.name}. You have ${LADDER_PLAYOFF_TIE_DAYS} days to play your next round.`,
      tab: "Playoffs",
      data: { tieId },
    });
  }
  await notifyLadderPlayers({
    userIds: eliminatedPlayerIds,
    ladder,
    kind: "playoffs-elimination",
    title: "Playoffs have started",
    message: `The playoffs in ${ladder.name} have started, and unfortunately you didn't make the cut this time. The ladder is now closed, so you can no longer post matches. Thank you for playing, and come back next season for another chance to win!`,
    tab: "Playoffs",
  });
  await ladderRef.update({ playoffNotificationsSentAt: new Date() });
};

const cancelLadder = async ({
  db,
  ladderRef,
  ladder,
  entrantCount,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  entrantCount: number;
  now: Date;
}): Promise<boolean> => {
  const cancelled = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ladderRef);
    if (!fresh.exists || !isPrePlayoff(fresh.data()?.status)) return false;
    transaction.update(ladderRef, {
      status: LADDER_STATUS.CANCELLED,
      cancelledAt: now,
      cancelledReason: LADDER_CANCELLED_REASON.TOO_FEW_REGISTRATIONS,
    });
    return true;
  });
  if (cancelled) {
    await refundLadderEntryFees({ ladder, entrantCount });
    await sendCancellationNotifications({ ladderRef, ladder });
  }
  return cancelled;
};

const countEntrants = async (
  ladderRef: DocRef,
  ladder: Ladder,
): Promise<number> => {
  if (ladder.ladderType !== LADDER_TYPE.DOUBLES) {
    const countSnapshot = await entrantsCollection(ladderRef, ladder)
      .count()
      .get();
    return countSnapshot.data().count;
  }
  const snapshot = await entrantsCollection(ladderRef, ladder).get();
  return snapshot.docs.filter((teamDoc) => {
    const team = teamDoc.data() as TeamStats;
    return (
      team.status !== TEAM_STATUS.PENDING && (team.playerIds ?? []).length >= 2
    );
  }).length;
};

/**
 * At the season start: with enough entrants the season starts and matches
 * open; with too few the dates move back once, then the ladder is cancelled.
 */
const processSeasonStart = async ({
  db,
  ladderRef,
  ladder,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  now: Date;
}): Promise<"started" | "extended" | "cancelled" | null> => {
  if (!getLadderSeasonStartStep(ladder, LADDER_MIN_PLAYOFF_SIZE, now.getTime())) {
    return null;
  }
  const entrantCount = await countEntrants(ladderRef, ladder);
  const step = getLadderSeasonStartStep(ladder, entrantCount, now.getTime());
  if (!step) return null;

  if (step === "cancel") {
    const cancelled = await cancelLadder({
      db,
      ladderRef,
      ladder,
      entrantCount,
      now,
    });
    return cancelled ? "cancelled" : null;
  }

  const updated = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ladderRef);
    const data = fresh.data() as Ladder | undefined;
    if (!data || getLadderSeasonStartStep(data, entrantCount, now.getTime()) !== step) {
      return null;
    }
    if (step === "start") {
      transaction.update(ladderRef, { seasonStartedAt: now });
      return { ...data, seasonStartedAt: now };
    }
    const seasonStartsAt = toDate(data.seasonStartsAt);
    if (!seasonStartsAt) return null;
    const dates = deriveExtendedLadderDates(seasonStartsAt);
    transaction.update(ladderRef, { ...dates, seasonExtendedAt: now });
    return { ...data, ...dates, seasonExtendedAt: now };
  });
  if (!updated) return null;

  const notice: SeasonNotice = step === "start" ? "started" : "extended";
  await sendSeasonNotifications({
    ladderRef,
    ladder: { ...updated, ladderId: ladder.ladderId },
    notice,
    entrantCount,
  });
  return notice;
};

const closeRegistration = async ({
  db,
  ladderRef,
  ladder,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  now: Date;
}): Promise<"closed" | "cancelled" | null> => {
  const entrantCount = await countEntrants(ladderRef, ladder);

  if (entrantCount < LADDER_MIN_PLAYOFF_SIZE) {
    const cancelled = await cancelLadder({
      db,
      ladderRef,
      ladder,
      entrantCount,
      now,
    });
    return cancelled ? "cancelled" : null;
  }

  const closed = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ladderRef);
    if (fresh.data()?.status !== LADDER_STATUS.REGISTRATION_OPEN) return false;
    transaction.update(ladderRef, {
      status: LADDER_STATUS.REGISTRATION_CLOSED,
    });
    return true;
  });
  return closed ? "closed" : null;
};

const generatePlayoffs = async ({
  db,
  ladderRef,
  ladder,
  now,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
  now: Date;
}): Promise<"generated" | "cancelled" | null> => {
  const { entrants, disqualifiedPlayerIds } = await loadEntrants(
    db,
    ladderRef,
    ladder,
  );
  const { bracketSize, qualifiers } = getLadderPlayoffQualifiers({
    entrants,
    registeredCount: Math.max(entrants.length, LADDER_MIN_PLAYOFF_SIZE),
    maxPlayers: ladder.maxPlayers,
  });

  if (bracketSize === 0) {
    const cancelled = await cancelLadder({
      db,
      ladderRef,
      ladder,
      entrantCount: entrants.length,
      now,
    });
    return cancelled ? "cancelled" : null;
  }

  const ties = buildLadderPlayoffTies({
    ladderId: ladder.ladderId,
    qualifiers,
    createdAt: now,
  });

  const outcome = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ladderRef);
    const data = fresh.data();
    if (!fresh.exists || !isPrePlayoff(data?.status) || data?.playoffsGeneratedAt) {
      return null;
    }
    ties.forEach((tie) => {
      transaction.create(
        ladderRef.collection(LADDER_PLAYOFF_TIES_COLLECTION).doc(tie.tieId),
        tie,
      );
    });
    transaction.update(ladderRef, {
      status: LADDER_STATUS.PLAYOFFS,
      playoffsGeneratedAt: now,
      playoffBracketSize: bracketSize,
      playoffEntrantCount: entrants.length,
    });
    return "generated" as const;
  });

  if (outcome === "generated") {
    const qualifierKeys = new Set(
      qualifiers.map((qualifier) => qualifier.entrantKey),
    );
    await sendPlayoffNotifications({
      ladderRef,
      ladder,
      qualifierTies: firstRoundTies(ties),
      eliminatedPlayerIds: [
        ...entrants
          .filter((entrant) => !qualifierKeys.has(entrant.entrantKey))
          .flatMap((entrant) => entrant.players.map((player) => player.userId)),
        ...disqualifiedPlayerIds,
      ],
    });
  }
  return outcome;
};

const isRecent = (value: unknown, now: Date): boolean => {
  const date = toDate(value);
  return (
    !!date &&
    now.getTime() - date.getTime() <= NOTIFICATION_RESUME_DAYS * 24 * HOUR_MS
  );
};

const resumePlayoffNotifications = async ({
  db,
  ladderRef,
  ladder,
}: {
  db: Db;
  ladderRef: DocRef;
  ladder: Ladder;
}): Promise<void> => {
  const tiesSnapshot = await ladderRef
    .collection(LADDER_PLAYOFF_TIES_COLLECTION)
    .get();
  const resumedTies = tiesSnapshot.docs.map(
    (tieDoc) => ({ ...(tieDoc.data() as LadderPlayoffTie), tieId: tieDoc.id }),
  );
  const qualifierTies = firstRoundTies(resumedTies);
  const qualifierPlayerIds = new Set(
    qualifierTies.flatMap((tie) => tie.playerIds),
  );
  const { entrants, disqualifiedPlayerIds } = await loadEntrants(
    db,
    ladderRef,
    ladder,
  );
  await sendPlayoffNotifications({
    ladderRef,
    ladder,
    qualifierTies,
    eliminatedPlayerIds: [
      ...entrants
        .flatMap((entrant) => entrant.players.map((player) => player.userId))
        .filter((userId) => !qualifierPlayerIds.has(userId)),
      ...disqualifiedPlayerIds,
    ],
  });
};

const resumeSeasonNotifications = async (db: Db, now: Date): Promise<void> => {
  const snapshot = await db
    .collection(LADDERS)
    .where("status", "==", LADDER_STATUS.REGISTRATION_OPEN)
    .get();
  for (const ladderDoc of snapshot.docs) {
    const ladder = { ...(ladderDoc.data() as Ladder), ladderId: ladderDoc.id };
    const data = ladderDoc.data();
    const notice: SeasonNotice | null =
      isRecent(data.seasonStartedAt, now) && !data.seasonStartNotificationsSentAt
        ? "started"
        : !data.seasonStartedAt &&
            isRecent(data.seasonExtendedAt, now) &&
            !data.seasonExtensionNotificationsSentAt
          ? "extended"
          : null;
    if (!notice) continue;
    try {
      await sendSeasonNotifications({
        ladderRef: ladderDoc.ref,
        ladder,
        notice,
        entrantCount: await countEntrants(ladderDoc.ref, ladder),
      });
    } catch (error) {
      console.log(
        `❌ processLadderPhases could not resume season notifications for ${ladder.ladderId}:`,
        error,
      );
    }
  }
};

const resumePendingNotifications = async (db: Db, now: Date): Promise<void> => {
  await resumeSeasonNotifications(db, now);
  const snapshot = await db
    .collection(LADDERS)
    .where("status", "in", [LADDER_STATUS.PLAYOFFS, LADDER_STATUS.CANCELLED])
    .get();
  for (const ladderDoc of snapshot.docs) {
    const ladder = { ...(ladderDoc.data() as Ladder), ladderId: ladderDoc.id };
    const data = ladderDoc.data();
    try {
      if (
        ladder.status === LADDER_STATUS.PLAYOFFS &&
        isRecent(data.playoffsGeneratedAt, now) &&
        !data.playoffNotificationsSentAt
      ) {
        await resumePlayoffNotifications({ db, ladderRef: ladderDoc.ref, ladder });
      }
      if (
        ladder.status === LADDER_STATUS.CANCELLED &&
        isRecent(data.cancelledAt, now) &&
        !data.cancellationNotificationsSentAt
      ) {
        await sendCancellationNotifications({ ladderRef: ladderDoc.ref, ladder });
      }
    } catch (error) {
      console.log(
        `❌ processLadderPhases could not resume notifications for ${ladder.ladderId}:`,
        error,
      );
    }
  }
};

const payUnpaidCompletedLadders = async (
  db: Db,
  now: Date,
  summary: ProcessLadderPhasesSummary,
): Promise<void> => {
  const snapshot = await db
    .collection(LADDERS)
    .where("status", "==", LADDER_STATUS.COMPLETED)
    .where("prizesDistributed", "==", false)
    .get();
  for (const ladderDoc of snapshot.docs) {
    try {
      if ((await completeAndPayLadder({ db, ladderId: ladderDoc.id, now })).paid) {
        summary.laddersPaid.push(ladderDoc.id);
      }
    } catch (error) {
      console.log(`❌ processLadderPhases payout failed for ${ladderDoc.id}:`, error);
    }
  }
};

/**
 * Moves ladders through their scheduled phases. At the season start a ladder
 * with LADDER_MIN_PLAYOFF_SIZE entrants starts and matches open; with fewer its
 * dates move back once, then it is cancelled (and refunded). At registration
 * close a ladder that has dropped below LADDER_MIN_PLAYOFF_SIZE is cancelled,
 * otherwise registration is closed. At playoff start the top entrants are
 * placed into a knockout bracket and the ladder moves to Playoffs. Each step
 * re-checks the ladder inside a transaction and bracket slots have fixed ids,
 * so re-running never generates twice.
 */
export const runProcessLadderPhases = async (
  now: Date = new Date(),
): Promise<ProcessLadderPhasesSummary> => {
  const db = admin.firestore();
  const summary: ProcessLadderPhasesSummary = {
    seasonsStarted: [],
    seasonsExtended: [],
    registrationClosed: [],
    cancelled: [],
    playoffsGenerated: [],
    standingsFinalised: [],
    playoffTiesSettled: [],
    playoffRemindersSent: 0,
    playoffHostNoticesSent: 0,
    playoffMatchesAutoAccepted: [],
    laddersPaid: [],
  };

  await resumePendingNotifications(db, now);

  const laddersSnapshot = await db
    .collection(LADDERS)
    .where("status", "in", PRE_PLAYOFF_STATUSES)
    .get();

  for (const ladderDoc of laddersSnapshot.docs) {
    const ladder = { ...(ladderDoc.data() as Ladder), ladderId: ladderDoc.id };
    try {
      let status = ladder.status;

      if (!isLadderSeasonStarted(ladder)) {
        const outcome = await processSeasonStart({
          db,
          ladderRef: ladderDoc.ref,
          ladder,
          now,
        });
        if (outcome === "started") {
          summary.seasonsStarted.push(ladder.ladderId);
        } else {
          if (outcome === "extended") summary.seasonsExtended.push(ladder.ladderId);
          if (outcome === "cancelled") summary.cancelled.push(ladder.ladderId);
          continue;
        }
      }

      if (
        status === LADDER_STATUS.REGISTRATION_OPEN &&
        isDue(ladder.registrationClosesAt, now)
      ) {
        const outcome = await closeRegistration({
          db,
          ladderRef: ladderDoc.ref,
          ladder,
          now,
        });
        if (outcome === "cancelled") {
          summary.cancelled.push(ladder.ladderId);
          continue;
        }
        if (outcome === "closed") {
          summary.registrationClosed.push(ladder.ladderId);
          status = LADDER_STATUS.REGISTRATION_CLOSED;
        }
      }

      if (
        isPrePlayoff(status) &&
        !ladder.standingsFinalisedAt &&
        isLadderStandingsFinal(ladder, now)
      ) {
        const standings = await finaliseLadderStandings({ db, ladder, now });
        summary.standingsFinalised.push(ladder.ladderId);
        console.log(
          `📋 ${ladder.ladderId}: standings final — ${standings.disputesDiscarded} dispute(s) discarded, ${standings.walkoversAwarded} walkover(s) awarded, ${standings.claimsClosed} claim(s) closed, ${standings.matchesExpired} match(es) expired.`,
        );
      }

      if (isPrePlayoff(status) && isDue(ladder.playoffStartsAt, now)) {
        const outcome = await generatePlayoffs({
          db,
          ladderRef: ladderDoc.ref,
          ladder,
          now,
        });
        if (outcome === "generated") {
          summary.playoffsGenerated.push(ladder.ladderId);
        } else if (outcome === "cancelled") {
          summary.cancelled.push(ladder.ladderId);
        }
      }
    } catch (error) {
      console.log(`❌ processLadderPhases failed for ${ladder.ladderId}:`, error);
    }
  }

  await runPlayoffDeadlinesAndReminders(db, now, summary);
  await payUnpaidCompletedLadders(db, now, summary);

  console.log(
    `✅ processLadderPhases: started ${summary.seasonsStarted.length}, extended ${summary.seasonsExtended.length}, closed ${summary.registrationClosed.length}, cancelled ${summary.cancelled.length}, playoffs ${summary.playoffsGenerated.length}, standings final ${summary.standingsFinalised.length}.`,
  );
  return summary;
};

export const processLadderPhases = onSchedule(
  { schedule: "every 15 minutes", timeoutSeconds: 540, memory: "1GiB" },
  async () => {
    await runProcessLadderPhases();
  },
);
