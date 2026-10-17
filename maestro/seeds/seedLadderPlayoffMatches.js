import {
  collection,
  deleteField,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import moment from "moment";
import { db } from "../../services/firebase.config";
import {
  LADDER_MATCH_STATUS,
  LADDER_PLAYOFF_TIES_COLLECTION,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_TYPE,
  SHUTTLE_TYPE,
  advanceLadderPlayoffBracket,
  getLadderPlayoffLegHost,
  buildLadderPlayoffLegMatch,
  createLadderMatchGames,
  notificationSchema,
  notificationTypes,
} from "@shared";
import {
  MAESTRO_PO_LADDER_ID,
  MAESTRO_PO_PAID_LADDER_ID,
  deleteTiePlayerNotifications,
  seedLadderPlayoffs,
} from "./seedLadderPlayoffs";

const SIZE = 256;
const PAID_ENTRY_FEE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const ROUND_ONE_STARTED_DAYS_AGO = 7;

export const PLAYOFF_MATCH_STAGE = {
  PENDING: "pending",
  LEG1_POSTED: "leg1Posted",
  LEG1_COMPLETE: "leg1Complete",
  LEVEL: "level",
  SETTLED: "settled",
  LEG1_POSTED_AFTER_DECLINE: "leg1PostedAfterDecline",
  NO_HOME_COURT: "noHomeCourt",
  LEG1_IN_PROGRESS: "leg1InProgress",
  PLAYOFF_REGULAR: "playoffRegular",
  LEG2_POSTED: "leg2Posted",
  LEG2_ACCEPTED: "leg2Accepted",
  LEG2_ONE_GAME: "leg2OneGame",
};

export const MAESTRO_PO_REGULAR_MATCH_ID = "maestro-po-regular-match";

const APPROVED = notificationTypes.RESPONSE.APPROVED_GAME;
const LOSER_SCORES = [17, 14, 19, 12, 21, 16, 18];

export const other = (side) => (side === "team1" ? "team2" : "team1");
export const sideKey = (side) => (side === "team1" ? "side1" : "side2");
export const legId = (tie, leg) => `${tie.tieId}-leg${leg}`;

export const at = (dayOffset, time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return moment()
    .add(dayOffset, "days")
    .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
};

export const playedGame = ({
  tie,
  shell,
  winner,
  index,
  start,
  approved,
  reporterSide,
}) => {
  const loserScore = LOSER_SCORES[index % LOSER_SCORES.length];
  const winnerScore = loserScore >= 20 ? loserScore + 2 : 21;
  const team1Wins = winner === "team1";
  const team1Score = team1Wins ? winnerScore : loserScore;
  const team2Score = team1Wins ? loserScore : winnerScore;
  const winnerIds = tie[sideKey(winner)].playerIds;
  const loserIds = tie[sideKey(other(winner))].playerIds;
  const reportedAt = start
    .clone()
    .add(25 * (index + 1), "minutes")
    .toDate();
  const reporting = reporterSide ?? winner;
  const approver = tie[other(reporting)].player1;
  return {
    ...shell,
    team1: { ...tie.team1, score: team1Score },
    team2: { ...tie.team2, score: team2Score },
    gamescore: `${team1Score}-${team2Score}`,
    date: start.format("DD-MM-YYYY"),
    createdAt: reportedAt,
    reportedAt,
    reportedTime: moment(reportedAt).format("HH:mm"),
    result: {
      winner: {
        team: team1Wins ? "Team 1" : "Team 2",
        players: winnerIds,
        score: winnerScore,
      },
      loser: {
        team: team1Wins ? "Team 2" : "Team 1",
        players: loserIds,
        score: loserScore,
      },
    },
    approvalStatus: approved ? APPROVED : "pending",
    reporter: tie[reporting].player1.userId,
    numberOfApprovals: approved ? 1 : 0,
    numberOfDeclines: 0,
    approvers: approved
      ? [{ userId: approver.userId, username: approver.username ?? "" }]
      : [],
  };
};

const checkInFor = (participants, start) => ({
  checkedInBy: participants,
  checkedInAt: Object.fromEntries(
    participants.map((id, i) => [
      id,
      start
        .clone()
        .subtract(10 - i * 3, "minutes")
        .toDate(),
    ]),
  ),
  completed: true,
  completedAt: start.clone().subtract(1, "minutes").toDate(),
});

/**
 * One leg of a tie, played on `day` (days from today) at `time`. Legs that
 * have started are checked in by every player; `pendingLast` leaves the last
 * reported game awaiting approval. A completed leg must have a side on the
 * best-of majority, and an open one must not.
 */
export const legMatch = ({
  tie,
  leg,
  host,
  status,
  day,
  time = "18:00",
  wins = [],
  pendingLast = false,
  pendingReporter,
  scheduleDeclines,
  now,
}) => {
  const hostSide = tie[sideKey(host)];
  const start = at(day, time);
  const match = buildLadderPlayoffLegMatch({
    tie,
    leg,
    host,
    ladderMatchId: legId(tie, leg),
    ladderType: LADDER_TYPE.SINGLES,
    input: {
      court: hostSide.homeCourt,
      matchDate: start.format("DD-MM-YYYY"),
      matchTime: { start: time },
      currencyType: "GBP",
      shuttleType: SHUTTLE_TYPE.FEATHER,
    },
    createdBy: hostSide.playerIds[0],
    now: start.clone().subtract(3, "days").toDate(),
    accepted: status !== LADDER_MATCH_STATUS.POSTED,
  });
  const majority = Math.floor(match.bestOf / 2) + 1;
  const approvedWins = (side) =>
    wins.filter((w, i) => w === side && !(pendingLast && i === wins.length - 1))
      .length;
  const decided =
    approvedWins("team1") >= majority || approvedWins("team2") >= majority;
  if ((status === LADDER_MATCH_STATUS.COMPLETED) !== decided) {
    throw new Error(
      `seedLadderPlayoffMatches: ${legId(tie, leg)} games don't match ${status}`,
    );
  }
  const games = match.games.map((shell, index) =>
    index < wins.length
      ? playedGame({
          tie,
          shell,
          winner: wins[index],
          index,
          start,
          approved: !(pendingLast && index === wins.length - 1),
          reporterSide:
            pendingLast && index === wins.length - 1
              ? pendingReporter
              : undefined,
        })
      : shell,
  );
  const played = games.filter((game) => game.result);
  const lastReport = played.length
    ? played[played.length - 1].reportedAt
    : null;
  const started =
    wins.length > 0 || (leg === 3 && status === LADDER_MATCH_STATUS.ACCEPTED);
  return {
    ...match,
    ...(scheduleDeclines ? { scheduleDeclines } : {}),
    matchStatus: status,
    games,
    ...(status !== LADDER_MATCH_STATUS.POSTED
      ? { acceptedBy: tie[sideKey(other(host))].playerIds[0] }
      : {}),
    ...(started ? { checkIn: checkInFor(match.participants, start) } : {}),
    ...(lastReport
      ? {
          lastUpdated: lastReport,
          gameReportedAt: Object.fromEntries(
            played.map((game) => [game.gameId, game.reportedAt]),
          ),
        }
      : started
        ? { lastUpdated: now }
        : {}),
    ...(status === LADDER_MATCH_STATUS.COMPLETED
      ? { completedAt: lastReport }
      : {}),
  };
};

/** Wins in play order: the loser takes alternate early games, the winner closes it out. */
export const wins = (side, count, otherCount) => {
  const result = [];
  for (let i = 0; i < Math.max(count, otherCount); i += 1) {
    if (i < otherCount) result.push(other(side));
    if (i < count) result.push(side);
  }
  return result;
};

export const commit = async (writes) => {
  for (let i = 0; i < writes.length; i += 400) {
    const batch = writeBatch(db);
    writes.slice(i, i + 400).forEach((write) => write(batch));
    await batch.commit();
  }
};

export const tieRef = (ladderId, tieId) =>
  doc(db, "ladders", ladderId, LADDER_PLAYOFF_TIES_COLLECTION, tieId);
export const matchRef = (ladderId, matchId) =>
  doc(db, "ladders", ladderId, "ladderMatches", matchId);

/**
 * A round of 16 a week into its 10 days, as production would have it: the
 * test user's own game at `stage`, and the other games spread across every
 * state a spectator can open (in progress today with a game awaiting
 * approval, settled, level with a decider, awaiting confirmation, upcoming,
 * half played and not yet arranged). Every score adds up and every started
 * match is checked in.
 */
export const seedLadderPlayoffMatches = async ({
  testUser,
  stage = PLAYOFF_MATCH_STAGE.PENDING,
  ladderId = MAESTRO_PO_LADDER_ID,
  entryFee = 0,
}) => {
  const ladderName = `Maestro Playoffs ${SIZE}${entryFee > 0 ? " (Paid)" : ""}`;
  if (!testUser?.userId) {
    throw new Error(
      "seedLadderPlayoffMatches: testUser with a userId is required",
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
  const roundOneStart = new Date(
    now.getTime() - ROUND_ONE_STARTED_DAYS_AGO * DAY_MS,
  );
  const snapshot = await getDocs(
    collection(db, "ladders", ladderId, LADDER_PLAYOFF_TIES_COLLECTION),
  );
  const tieUpdates = new Map();
  const setTie = (tieId, fields) =>
    tieUpdates.set(tieId, { ...(tieUpdates.get(tieId) ?? {}), ...fields });

  let ties = snapshot.docs.map((docSnap) => {
    const tie = docSnap.data();
    if (tie.round !== 1 || tie.isThirdPlacePlayoff) return tie;
    const window = {
      scheduledAt: roundOneStart,
      deadlineAt: new Date(roundOneStart.getTime() + 10 * DAY_MS),
      remindersSentDays: [3, 6],
    };
    setTie(tie.tieId, window);
    return { ...tie, ...window };
  });

  const myId = testUser.userId;
  const roundOne = ties
    .filter((tie) => tie.round === 1 && !tie.isThirdPlacePlayoff)
    .sort((a, b) => a.slot - b.slot);
  const mine = roundOne.find((tie) =>
    [tie.side1, tie.side2].some((side) => side?.playerIds.includes(myId)),
  );
  if (!mine)
    throw new Error("seedLadderPlayoffMatches: the test user has no game");
  const me = mine.side1.playerIds.includes(myId) ? "team1" : "team2";
  const them = other(me);
  const neighbour = roundOne.find((tie) => tie.slot === (mine.slot ^ 1));
  const [settled, level, awaiting, upcoming, halfway] = roundOne.filter(
    (tie) => tie !== mine && tie !== neighbour,
  );

  const matches = [];
  const settle = (tieId, winner) => {
    const changed = advanceLadderPlayoffBracket({
      ties,
      tieId,
      winner,
      outcome: LADDER_PLAYOFF_TIE_OUTCOME.PLAYED,
      now,
    });
    ties = ties.map((tie) => changed.find((c) => c.tieId === tie.tieId) ?? tie);
    changed.forEach((tie) => setTie(tie.tieId, tie));
  };
  const hostOf = (tie, leg) => getLadderPlayoffLegHost(tie, leg);
  const C = LADDER_MATCH_STATUS.COMPLETED;
  const A = LADDER_MATCH_STATUS.ACCEPTED;
  const P = LADDER_MATCH_STATUS.POSTED;

  switch (stage) {
    case PLAYOFF_MATCH_STAGE.LEG1_POSTED:
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: hostOf(mine, 1),
          status: P,
          day: 2,
          time: "19:30",
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.LEG1_POSTED_AFTER_DECLINE:
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: hostOf(mine, 1),
          status: P,
          day: 3,
          time: "20:00",
          scheduleDeclines: 1,
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.NO_HOME_COURT:
      setTie(mine.tieId, {
        [sideKey(me)]: { ...mine[sideKey(me)], homeCourt: null },
      });
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: hostOf(mine, 1),
          status: A,
          day: 1,
          time: "18:30",
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.LEG1_IN_PROGRESS:
    case PLAYOFF_MATCH_STAGE.PLAYOFF_REGULAR:
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: hostOf(mine, 1),
          status: A,
          day: moment().subtract(70, "minutes").isSame(moment(), "day")
            ? 0
            : -1,
          time: moment().subtract(70, "minutes").format("HH:mm"),
          wins: [me, them, me],
          pendingLast: true,
          pendingReporter: them,
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.LEG2_POSTED:
    case PLAYOFF_MATCH_STAGE.LEG2_ACCEPTED:
    case PLAYOFF_MATCH_STAGE.LEG2_ONE_GAME: {
      const live = stage === PLAYOFF_MATCH_STAGE.LEG2_ONE_GAME;
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: hostOf(mine, 1),
          status: C,
          day: -3,
          wins: wins(me, 4, 2),
          now,
        }),
        legMatch({
          tie: mine,
          leg: 2,
          host: hostOf(mine, 2),
          status: stage === PLAYOFF_MATCH_STAGE.LEG2_POSTED ? P : A,
          day: live
            ? moment().subtract(70, "minutes").isSame(moment(), "day")
              ? 0
              : -1
            : 2,
          time: live
            ? moment().subtract(70, "minutes").format("HH:mm")
            : "19:30",
          wins: live ? [me] : [],
          now,
        }),
      );
      break;
    }
    case PLAYOFF_MATCH_STAGE.LEG1_COMPLETE:
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: hostOf(mine, 1),
          status: C,
          day: -3,
          wins: wins(me, 4, 2),
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.LEVEL:
      setTie(mine.tieId, { deciderRequired: true });
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: hostOf(mine, 1),
          status: C,
          day: -5,
          wins: wins(me, 4, 2),
          now,
        }),
        legMatch({
          tie: mine,
          leg: 2,
          host: hostOf(mine, 2),
          status: C,
          day: -1,
          wins: wins(them, 4, 2),
          now,
        }),
        legMatch({
          tie: mine,
          leg: 3,
          host: hostOf(mine, 3),
          status: A,
          day: -1,
          time: "20:30",
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.SETTLED:
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: hostOf(mine, 1),
          status: C,
          day: -5,
          wins: wins(me, 4, 1),
          now,
        }),
        legMatch({
          tie: mine,
          leg: 2,
          host: hostOf(mine, 2),
          status: C,
          day: -2,
          wins: wins(me, 4, 2),
          now,
        }),
      );
      settle(mine.tieId, me);
      break;
    default:
      break;
  }

  const liveStart = moment().subtract(70, "minutes");
  const n1 = hostOf(neighbour, 1);
  if (stage === PLAYOFF_MATCH_STAGE.SETTLED) {
    matches.push(
      legMatch({
        tie: neighbour,
        leg: 1,
        host: n1,
        status: C,
        day: -6,
        wins: wins("team2", 4, 3),
        now,
      }),
      legMatch({
        tie: neighbour,
        leg: 2,
        host: other(n1),
        status: C,
        day: -2,
        time: "19:00",
        wins: wins("team2", 4, 0),
        now,
      }),
    );
    settle(neighbour.tieId, "team2");
  } else {
    matches.push(
      legMatch({
        tie: neighbour,
        leg: 1,
        host: n1,
        status: C,
        day: -4,
        wins: wins("team2", 4, 3),
        now,
      }),
      legMatch({
        tie: neighbour,
        leg: 2,
        host: other(n1),
        status: A,
        day: liveStart.isSame(moment(), "day") ? 0 : -1,
        time: liveStart.format("HH:mm"),
        wins: ["team1", "team2"],
        pendingLast: true,
        now,
      }),
    );
  }

  const s1 = hostOf(settled, 1);
  matches.push(
    legMatch({
      tie: settled,
      leg: 1,
      host: s1,
      status: C,
      day: -6,
      wins: wins("team1", 4, 1),
      now,
    }),
    legMatch({
      tie: settled,
      leg: 2,
      host: other(s1),
      status: C,
      day: -3,
      wins: wins("team2", 4, 3),
      now,
    }),
  );
  settle(settled.tieId, "team1");

  const l1 = hostOf(level, 1);
  setTie(level.tieId, { deciderRequired: true });
  matches.push(
    legMatch({
      tie: level,
      leg: 1,
      host: l1,
      status: C,
      day: -5,
      wins: wins("team1", 4, 3),
      now,
    }),
    legMatch({
      tie: level,
      leg: 2,
      host: other(l1),
      status: C,
      day: -1,
      wins: wins("team2", 4, 3),
      now,
    }),
    legMatch({
      tie: level,
      leg: 3,
      host: other(l1),
      status: A,
      day: -1,
      time: "20:45",
      now,
    }),
  );

  const a1 = hostOf(awaiting, 1);
  matches.push(
    legMatch({
      tie: awaiting,
      leg: 1,
      host: a1,
      status: P,
      day: 1,
      time: "19:00",
      now,
    }),
  );

  const u1 = hostOf(upcoming, 1);
  matches.push(
    legMatch({
      tie: upcoming,
      leg: 1,
      host: u1,
      status: A,
      day: 1,
      time: "18:30",
      now,
    }),
    legMatch({
      tie: upcoming,
      leg: 2,
      host: other(u1),
      status: A,
      day: 2,
      time: "20:00",
      now,
    }),
  );

  const h1 = hostOf(halfway, 1);
  matches.push(
    legMatch({
      tie: halfway,
      leg: 1,
      host: h1,
      status: C,
      day: -2,
      wins: wins("team2", 4, 0),
      now,
    }),
    legMatch({ tie: halfway, leg: 2, host: other(h1), status: P, day: 2, now }),
  );

  const notifications =
    stage === PLAYOFF_MATCH_STAGE.LEVEL
      ? [
          {
            id: `maestro-po-decider-${mine.tieId}`,
            title: "One deciding game to play",
            message: `Your Round of 16 in ${ladderName} is level on aggregate. One deciding game must be played to decide who goes through.`,
            data: {
              ladderId: ladderId,
              tab: "Playoffs",
              tieId: mine.tieId,
            },
          },
        ]
      : stage === PLAYOFF_MATCH_STAGE.SETTLED
        ? [
            {
              id: `maestro-po-round-${mine.tieId}`,
              title: "You've reached the Quarter-Final",
              message: `Congratulations! You've reached the Quarter-Final in ${ladderName}. You have 10 days to play both your home and away matches.`,
              data: {
                ladderId: ladderId,
                tab: "Playoffs",
                tieId: `r2-s${Math.floor(mine.slot / 2)}`,
              },
            },
          ]
        : [];

  const extraWrites = [];
  if (stage === PLAYOFF_MATCH_STAGE.NO_HOME_COURT) {
    extraWrites.push((batch) =>
      batch.update(doc(db, "ladders", ladderId, "ladderParticipants", myId), {
        homeCourt: deleteField(),
      }),
    );
  }
  if (stage === PLAYOFF_MATCH_STAGE.PLAYOFF_REGULAR) {
    const rival = settled.side1.playerIds[0];
    const rivalTeam = settled.team1;
    const shells = createLadderMatchGames(5, MAESTRO_PO_REGULAR_MATCH_ID);
    const today = moment().format("DD-MM-YYYY");
    const reportedAt = new Date();
    const regular = {
      ladderMatchId: MAESTRO_PO_REGULAR_MATCH_ID,
      court: mine[sideKey(me)].homeCourt,
      bestOf: 5,
      matchDate: today,
      matchTime: { start: moment().subtract(70, "minutes").format("HH:mm") },
      courtFee: 0,
      currencyType: "GBP",
      shuttleType: SHUTTLE_TYPE.FEATHER,
      participants: [rival, myId],
      games: shells.map((shell, index) =>
        index === 0
          ? {
              ...shell,
              team1: { ...rivalTeam, score: 21 },
              team2: { ...mine[`team${me === "team1" ? 1 : 2}`], score: 15 },
              gamescore: "21-15",
              date: today,
              createdAt: reportedAt,
              reportedAt,
              reportedTime: moment(reportedAt).format("HH:mm"),
              result: {
                winner: { team: "Team 1", players: [rival], score: 21 },
                loser: { team: "Team 2", players: [myId], score: 15 },
              },
              approvalStatus: "pending",
              reporter: rival,
              numberOfApprovals: 0,
              numberOfDeclines: 0,
              approvers: [],
            }
          : shell,
      ),
      matchStatus: A,
      createdBy: rival,
      createdAt: now,
      acceptedBy: myId,
      acceptedAt: now,
      checkIn: {
        checkedInBy: [rival, myId],
        checkedInAt: { [rival]: now, [myId]: now },
        completed: true,
        completedAt: now,
      },
      ladderType: LADDER_TYPE.SINGLES,
      lastUpdated: reportedAt,
      gameReportedAt: { [shells[0].gameId]: reportedAt },
    };
    extraWrites.push((batch) =>
      batch.set(matchRef(ladderId, MAESTRO_PO_REGULAR_MATCH_ID), regular),
    );
  }

  await commit([
    ...extraWrites,
    ...[...tieUpdates].map(
      ([tieId, fields]) =>
        (batch) =>
          batch.set(tieRef(ladderId, tieId), fields, { merge: true }),
    ),
    ...matches.map(
      (match) => (batch) =>
        batch.set(matchRef(ladderId, match.ladderMatchId), match),
    ),
    ...notifications.map(
      ({ id, ...notification }) =>
        (batch) =>
          batch.set(doc(db, "users", myId, "notifications", id), {
            ...notificationSchema,
            ...notification,
            createdAt: now,
            recipientId: myId,
            senderId: "system",
            type: notificationTypes.INFORMATION.LADDER.TYPE,
          }),
    ),
  ]);

  return {
    ladderId: ladderId,
    stage,
    myTie: mine.tieId,
    ties: tieUpdates.size,
    matches: matches.length,
  };
};

/** The same playoffs on a free ladder and on a paid one, to compare prizes. */
export const seedLadderPlayoffMatchesFreeAndPaid = async ({
  testUser,
  stage,
}) => [
  await seedLadderPlayoffMatches({ testUser, stage }),
  await seedLadderPlayoffMatches({
    testUser,
    stage,
    ladderId: MAESTRO_PO_PAID_LADDER_ID,
    entryFee: PAID_ENTRY_FEE,
  }),
];
