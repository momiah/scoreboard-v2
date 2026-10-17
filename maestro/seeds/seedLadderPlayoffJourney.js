import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import moment from "moment";
import { db } from "../../services/firebase.config";
import {
  LADDER_MATCH_STATUS,
  LADDER_PLAYOFF_TIES_COLLECTION,
  LADDER_PLAYOFF_TIE_DAYS,
  LADDER_STATUS,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS,
  advanceLadderPlayoffBracket,
  getLadderPlayoffLegHost,
} from "@shared";
import {
  MAESTRO_PO_LADDER_ID,
  deleteTiePlayerNotifications,
  seedLadderPlayoffs,
} from "./seedLadderPlayoffs";
import {
  commit,
  legMatch,
  matchRef,
  other,
  sideKey,
  tieRef,
  wins,
} from "./seedLadderPlayoffMatches";

const SIZE = 256;
const DAY_MS = 24 * 60 * 60 * 1000;

export const JOURNEY_ROUND = {
  R16: 1,
  QUARTER: 2,
  SEMI: 3,
  FINAL: 4,
  THIRD_PLACE: "thirdPlace",
};

export const JOURNEY_STAGE = {
  STARTED: "started",
  LEG1_FINISHING: "leg1Finishing",
  LEG2_FINISHING: "leg2Finishing",
  DECIDER_FINISHING: "deciderFinishing",
};

export const JOURNEY_OUTCOME = { WIN: "win", LOSS: "loss", LEVEL: "level" };

const A = LADDER_MATCH_STATUS.ACCEPTED;
const C = LADDER_MATCH_STATUS.COMPLETED;

const userSideOf = (tie, userId) => {
  if (tie.side1?.playerIds.includes(userId)) return "team1";
  if (tie.side2?.playerIds.includes(userId)) return "team2";
  return null;
};

const startedSeventyMinutesAgo = () => {
  const start = moment().subtract(70, "minutes");
  return {
    day: start.isSame(moment(), "day") ? 0 : -1,
    time: start.format("HH:mm"),
  };
};

const ladderNameOf = (entryFee) =>
  `Maestro Playoffs ${SIZE}${entryFee > 0 ? " (Paid)" : ""}`;

/**
 * The bracket carried forward to `round`: the test user wins every earlier
 * round (and loses the semi-final when the target is the 3rd-place tie), the
 * other games are settled, and the user's own tie is scheduled with `stage`
 * played. The last reported game of the stage awaits the user's approval, so
 * the real onLadderMatchStatusChange trigger settles the tie when they tap it.
 */
export const seedLadderPlayoffJourney = async ({
  testUser,
  round = JOURNEY_ROUND.R16,
  stage = JOURNEY_STAGE.STARTED,
  outcome = JOURNEY_OUTCOME.WIN,
  ladderId = MAESTRO_PO_LADDER_ID,
  entryFee = 0,
}) => {
  if (!testUser?.userId) {
    throw new Error(
      "seedLadderPlayoffJourney: testUser with a userId is required",
    );
  }
  await deleteTiePlayerNotifications(ladderId);
  await seedLadderPlayoffs({
    testUser,
    generate: true,
    size: SIZE,
    ladderId,
    entryFee,
  });
  const now = new Date();
  const snapshot = await getDocs(
    collection(db, "ladders", ladderId, LADDER_PLAYOFF_TIES_COLLECTION),
  );
  let ties = snapshot.docs.map((docSnap) => docSnap.data());
  const updates = new Map();
  const setTie = (tieId, fields) =>
    updates.set(tieId, { ...(updates.get(tieId) ?? {}), ...fields });
  const matches = [];
  const settle = (tieId, winner) => {
    const finishedAt = new Date(
      Math.max(
        ...matches
          .filter((match) => match.playoffTieId === tieId && match.completedAt)
          .map((match) => match.completedAt.getTime()),
      ),
    );
    const changed = advanceLadderPlayoffBracket({
      ties,
      tieId,
      winner,
      outcome: LADDER_PLAYOFF_TIE_OUTCOME.PLAYED,
      now: finishedAt,
    });
    ties = ties.map((tie) => changed.find((c) => c.tieId === tie.tieId) ?? tie);
    changed.forEach((tie) => setTie(tie.tieId, tie));
  };

  const userId = testUser.userId;
  const lastKnockoutRound = Math.max(
    ...ties.filter((tie) => !tie.isThirdPlacePlayoff).map((tie) => tie.round),
  );
  const targetRound =
    round === JOURNEY_ROUND.THIRD_PLACE ? lastKnockoutRound - 1 : round;
  const settleThrough =
    round === JOURNEY_ROUND.THIRD_PLACE ? targetRound : round - 1;

  const stageDaysIn = stage === JOURNEY_STAGE.DECIDER_FINISHING ? 8 : 4;
  const roundGap = LADDER_PLAYOFF_TIE_DAYS - 1;
  const roundEndDay = (r) => -stageDaysIn - (settleThrough - r) * roundGap;
  const roundOneStart = new Date(now.getTime() + (roundEndDay(1) - 6) * DAY_MS);

  for (let r = 1; r <= settleThrough; r += 1) {
    ties
      .filter((tie) => tie.round === r && !tie.isThirdPlacePlayoff)
      .sort((a, b) => a.slot - b.slot)
      .forEach((tie) => {
        const current = ties.find((candidate) => candidate.tieId === tie.tieId);
        if (current.status === LADDER_PLAYOFF_TIE_STATUS.COMPLETED) return;
        const user = userSideOf(current, userId);
        const userLosesHere =
          round === JOURNEY_ROUND.THIRD_PLACE && r === targetRound;
        const winner = user ? (userLosesHere ? other(user) : user) : "team1";
        [1, 2].forEach((leg) =>
          matches.push(
            legMatch({
              tie: current,
              leg,
              host: getLadderPlayoffLegHost(current, leg),
              status: C,
              day: roundEndDay(r) - (leg === 1 ? 5 : 1),
              wins: wins(winner, 4, leg === 1 ? 1 : 2),
              now,
            }),
          ),
        );
        settle(current.tieId, winner);
      });
  }
  if (settleThrough >= 1) {
    ties
      .filter((tie) => tie.round === 1 && !tie.isThirdPlacePlayoff)
      .forEach((tie) =>
        setTie(tie.tieId, {
          scheduledAt: roundOneStart,
          deadlineAt: new Date(
            roundOneStart.getTime() + LADDER_PLAYOFF_TIE_DAYS * DAY_MS,
          ),
        }),
      );
  }

  const mine = ties.find(
    (tie) =>
      tie.status === LADDER_PLAYOFF_TIE_STATUS.SCHEDULED &&
      userSideOf(tie, userId) &&
      (round === JOURNEY_ROUND.THIRD_PLACE
        ? tie.isThirdPlacePlayoff
        : tie.round === round && !tie.isThirdPlacePlayoff),
  );
  if (!mine) {
    throw new Error(
      "seedLadderPlayoffJourney: the test user has no tie at this round",
    );
  }
  const user = userSideOf(mine, userId);
  const opponent = other(user);
  const hostOf = (leg) => getLadderPlayoffLegHost(mine, leg);

  if (stage !== JOURNEY_STAGE.STARTED && round === JOURNEY_ROUND.R16) {
    const scheduledAt = new Date(now.getTime() - stageDaysIn * DAY_MS);
    setTie(mine.tieId, {
      scheduledAt,
      deadlineAt: new Date(
        scheduledAt.getTime() + LADDER_PLAYOFF_TIE_DAYS * DAY_MS,
      ),
      remindersSentDays: stageDaysIn >= 6 ? [3, 6] : [3],
    });
  }

  const live = startedSeventyMinutesAgo();
  const finishing = (leg, winner, extra = {}) =>
    legMatch({
      tie: mine,
      leg,
      host: hostOf(leg),
      status: A,
      ...live,
      wins: leg === 3 ? [winner] : wins(winner, 4, 2),
      pendingLast: true,
      pendingReporter: opponent,
      now,
      ...extra,
    });
  const played = (leg, winner, day, count = 2) =>
    legMatch({
      tie: mine,
      leg,
      host: hostOf(leg),
      status: C,
      day,
      wins: wins(winner, 4, count),
      now,
    });

  if (stage === JOURNEY_STAGE.LEG1_FINISHING) {
    matches.push(finishing(1, user));
  }
  if (stage === JOURNEY_STAGE.LEG2_FINISHING) {
    if (outcome === JOURNEY_OUTCOME.WIN) {
      matches.push(played(1, user, -3), finishing(2, user));
    } else if (outcome === JOURNEY_OUTCOME.LOSS) {
      matches.push(played(1, opponent, -3), finishing(2, opponent));
    } else {
      matches.push(played(1, user, -3), finishing(2, opponent));
    }
  }
  if (stage === JOURNEY_STAGE.DECIDER_FINISHING) {
    setTie(mine.tieId, { deciderRequired: true });
    matches.push(
      played(1, user, -6),
      played(2, opponent, -2),
      finishing(3, outcome === JOURNEY_OUTCOME.LOSS ? opponent : user),
    );
  }

  const writes = [
    ...(settleThrough >= 1
      ? [
          (batch) =>
            batch.update(doc(db, "ladders", ladderId), {
              playoffsGeneratedAt: roundOneStart,
              playoffStartsAt: roundOneStart,
              seasonEndsAt: roundOneStart,
            }),
        ]
      : []),
    ...[...updates.entries()].map(
      ([tieId, fields]) =>
        (batch) =>
          batch.set(tieRef(ladderId, tieId), fields, { merge: true }),
    ),
    ...matches.map(
      (match) => (batch) =>
        batch.set(matchRef(ladderId, match.ladderMatchId), match),
    ),
  ];
  await commit(writes);

  return {
    ladderId,
    ladderName: ladderNameOf(entryFee),
    tieId: mine.tieId,
    round,
    stage,
    outcome,
  };
};

/**
 * The companion tie that has to finish for the user's to matter: the
 * neighbouring tie in the same round, the 3rd-place tie when the user is in
 * the Final, the Final when the user plays for 3rd place.
 */
const companionTie = (ties, userTie) => {
  if (userTie.isThirdPlacePlayoff) {
    return ties.find(
      (tie) => !tie.isThirdPlacePlayoff && tie.round === userTie.round,
    );
  }
  const lastRound = Math.max(
    ...ties.filter((tie) => !tie.isThirdPlacePlayoff).map((tie) => tie.round),
  );
  if (userTie.round === lastRound) {
    return ties.find((tie) => tie.isThirdPlacePlayoff);
  }
  return ties.find(
    (tie) =>
      !tie.isThirdPlacePlayoff &&
      tie.round === userTie.round &&
      tie.slot === (userTie.slot ^ 1),
  );
};

const loadTies = async (ladderId) => {
  const snapshot = await getDocs(
    collection(db, "ladders", ladderId, LADDER_PLAYOFF_TIES_COLLECTION),
  );
  return snapshot.docs.map((d) => d.data());
};

const findUserOpenTie = (ties, userId) =>
  ties
    .filter(
      (tie) =>
        tie.status === LADDER_PLAYOFF_TIE_STATUS.SCHEDULED &&
        userSideOf(tie, userId),
    )
    .sort((a, b) => b.round - a.round)[0];

const findUserTie = (ties, userId) =>
  findUserOpenTie(ties, userId) ??
  ties
    .filter(
      (tie) =>
        tie.status === LADDER_PLAYOFF_TIE_STATUS.COMPLETED &&
        userSideOf(tie, userId),
    )
    .sort((a, b) => b.round - a.round)[0];

/**
 * Plays out the companion tie as a second pair of players would: match 1
 * completed, match 2 accepted and then completed, so the real
 * onLadderMatchStatusChange trigger settles the tie and sends its
 * notifications and, once both deciding ties are done, completes the ladder.
 */
export const mockFinishCompanionTie = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  winner = "team1",
}) => {
  const ties = await loadTies(ladderId);
  const userTie = findUserTie(ties, testUser.userId);
  const tie = companionTie(ties, userTie);
  if (!tie || tie.status !== LADDER_PLAYOFF_TIE_STATUS.SCHEDULED) {
    throw new Error("mockFinishCompanionTie: no open companion tie");
  }
  const now = new Date();
  const build = (leg, day, count) =>
    legMatch({
      tie,
      leg,
      host: getLadderPlayoffLegHost(tie, leg),
      status: C,
      day,
      wins: wins(winner, 4, count),
      now,
    });
  const first = build(1, -3, 1);
  const second = build(2, -1, 2);
  await setDoc(matchRef(ladderId, first.ladderMatchId), first);
  const { completedAt, ...open } = second;
  await setDoc(matchRef(ladderId, second.ladderMatchId), {
    ...open,
    matchStatus: A,
  });
  await updateDoc(matchRef(ladderId, second.ladderMatchId), {
    matchStatus: C,
    completedAt,
  });
  return { tieId: tie.tieId, winner };
};

const POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 1500;

const poll = async (check) => {
  let lastError;
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  throw lastError;
};

const tieSidePlayerIds = (tie, who, userId) => {
  if (who === "user" || who === "opponent") {
    const userSide = userSideOf(tie, userId);
    const side = who === "user" ? userSide : other(userSide);
    return tie[sideKey(side)]?.playerIds ?? [];
  }
  const winnerSide = tie.winner;
  const side = {
    winner: winnerSide,
    loser: winnerSide ? other(winnerSide) : null,
  }[who];
  return tie[sideKey(side)]?.playerIds ?? [];
};

/** Asserts a notification reached the user, opponent, winner or loser of the user's or the companion tie. */
export const assertPlayoffNotification = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  tie: which,
  who,
  includes,
  excludes = /** @type {string | undefined} */ (undefined),
}) =>
  poll(async () => {
    const ties = await loadTies(ladderId);
    const userTie = findUserTie(ties, testUser.userId);
    const tie = which === "companion" ? companionTie(ties, userTie) : userTie;
    const recipients = tieSidePlayerIds(tie, who, testUser.userId);
    if (!recipients.length)
      throw new Error("assertPlayoffNotification: no recipients");
    const found = await Promise.all(
      recipients.map(async (recipientId) => {
        const snap = await getDocs(
          collection(db, "users", recipientId, "notifications"),
        );
        const messages = snap.docs
          .map((d) => d.data())
          .filter((data) => data.data?.ladderId === ladderId)
          .map((data) => String(data.message ?? ""));
        return {
          recipientId,
          matched: messages.some(
            (message) =>
              message.includes(includes) &&
              !(excludes && message.includes(excludes)),
          ),
        };
      }),
    );
    const missing = found.filter((entry) => !entry.matched);
    if (missing.length) {
      throw new Error(
        `No "${includes}" notification for ${missing.map((m) => m.recipientId).join(", ")}`,
      );
    }
    return { tieId: tie.tieId, who, includes };
  });

export const assertLadderCompleted = async ({
  ladderId = MAESTRO_PO_LADDER_ID,
}) =>
  poll(async () => {
    const ladder = (await getDoc(doc(db, "ladders", ladderId))).data();
    if (ladder?.status !== LADDER_STATUS.COMPLETED) {
      throw new Error(`Ladder ${ladderId} is ${ladder?.status}, not Completed`);
    }
    return { ladderId, status: ladder.status };
  });
