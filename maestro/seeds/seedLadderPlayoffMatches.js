import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import moment from "moment";
import { db } from "../../services/firebase.config";
import {
  LADDER_MATCH_STATUS,
  LADDER_PLAYOFF_TIES_COLLECTION,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_TYPE,
  SHUTTLE_TYPE,
  advanceLadderPlayoffBracket,
  buildLadderPlayoffLegMatch,
  notificationSchema,
  notificationTypes,
} from "@shared";
import { MAESTRO_PO_LADDER_ID, seedLadderPlayoffs } from "./seedLadderPlayoffs";

const SIZE = 256;
const LADDER_NAME = `Maestro Playoffs ${SIZE}`;

export const PLAYOFF_MATCH_STAGE = {
  COIN_PENDING: "coinPending",
  COIN_WON: "coinWon",
  COIN_LOST: "coinLost",
  LEG1_POSTED: "leg1Posted",
  LEG1_COMPLETE: "leg1Complete",
  LEVEL: "level",
  SETTLED: "settled",
};

const other = (side) => (side === "team1" ? "team2" : "team1");
const sideKey = (side) => (side === "team1" ? "side1" : "side2");
const legId = (tie, leg) => `${tie.tieId}-leg${leg}`;
const day = (offset) => moment().add(offset, "days").format("DD-MM-YYYY");

const coinToss = (firstHost, flippedBy, flipperSide, now) => ({
  firstHost,
  flippedBy,
  flippedAt: now,
  call: "logo",
  face: firstHost === flipperSide ? "logo" : "trophy",
});

const playedGame = (tie, shell, winner, index) => {
  const winnerScore = 21;
  const loserScore = 12 + (index % 7);
  const team1Wins = winner === "team1";
  const team1Score = team1Wins ? winnerScore : loserScore;
  const team2Score = team1Wins ? loserScore : winnerScore;
  const winnerLabel = team1Wins ? "Team 1" : "Team 2";
  const loserLabel = team1Wins ? "Team 2" : "Team 1";
  const winnerIds = tie[sideKey(winner)].playerIds;
  const loserIds = tie[sideKey(other(winner))].playerIds;
  return {
    ...shell,
    team1: { ...tie.team1, score: team1Score },
    team2: { ...tie.team2, score: team2Score },
    gamescore: `${team1Score}-${team2Score}`,
    date: day(-2),
    reportedAt: new Date(),
    reportedTime: "19:00",
    result: {
      winner: { team: winnerLabel, players: winnerIds, score: winnerScore },
      loser: { team: loserLabel, players: loserIds, score: loserScore },
    },
    approvalStatus: notificationTypes.RESPONSE.APPROVED_GAME,
    reporter: winnerIds[0],
    numberOfApprovals: 1,
    numberOfDeclines: 0,
    approvers: [],
  };
};

const legMatch = ({ tie, leg, host, status, wins = [], now }) => {
  const hostSide = tie[sideKey(host)];
  const completed = status === LADDER_MATCH_STATUS.COMPLETED;
  const match = buildLadderPlayoffLegMatch({
    tie,
    leg,
    host,
    ladderMatchId: legId(tie, leg),
    ladderType: LADDER_TYPE.SINGLES,
    input: {
      court: hostSide.homeCourt,
      matchDate: completed || wins.length ? day(-2) : day(3),
      matchTime: { start: "18:00" },
      currencyType: "GBP",
      shuttleType: SHUTTLE_TYPE.FEATHER,
    },
    createdBy: leg === 3 ? "system" : hostSide.playerIds[0],
    now,
    accepted: status !== LADDER_MATCH_STATUS.POSTED,
  });
  return {
    ...match,
    matchStatus: status,
    games: match.games.map((shell, index) =>
      index < wins.length ? playedGame(tie, shell, wins[index], index) : shell,
    ),
    ...(completed ? { completedAt: now } : {}),
  };
};

const commit = async (writes) => {
  const batch = writeBatch(db);
  writes.forEach((write) => write(batch));
  await batch.commit();
};

const tieRef = (tieId) =>
  doc(
    db,
    "ladders",
    MAESTRO_PO_LADDER_ID,
    LADDER_PLAYOFF_TIES_COLLECTION,
    tieId,
  );
const matchRef = (matchId) =>
  doc(db, "ladders", MAESTRO_PO_LADDER_ID, "ladderMatches", matchId);

const wins = (side, count, otherCount) => {
  const result = [];
  for (let i = 0; i < Math.max(count, otherCount); i += 1) {
    if (i < otherCount) result.push(other(side));
    if (i < count) result.push(side);
  }
  return result;
};

export const seedLadderPlayoffMatches = async ({
  testUser,
  stage = PLAYOFF_MATCH_STAGE.COIN_PENDING,
}) => {
  if (!testUser?.userId) {
    throw new Error(
      "seedLadderPlayoffMatches: testUser with a userId is required",
    );
  }
  await seedLadderPlayoffs({ testUser, generate: true, size: SIZE });
  const now = new Date();
  const snapshot = await getDocs(
    collection(
      db,
      "ladders",
      MAESTRO_PO_LADDER_ID,
      LADDER_PLAYOFF_TIES_COLLECTION,
    ),
  );
  let ties = snapshot.docs.map((docSnap) => docSnap.data());
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
  const theirId = mine[sideKey(them)].playerIds[0];
  const neighbour = roundOne.find((tie) => tie.slot === (mine.slot ^ 1));
  const [played, voided, level] = roundOne.filter(
    (tie) => tie !== mine && tie !== neighbour,
  );

  const tieUpdates = new Map();
  const matches = [];
  const setTie = (tieId, fields) =>
    tieUpdates.set(tieId, { ...(tieUpdates.get(tieId) ?? {}), ...fields });
  const settle = (tieId, winner, outcome) => {
    const changed = advanceLadderPlayoffBracket({
      ties,
      tieId,
      winner,
      outcome,
      now,
    });
    ties = ties.map((tie) => changed.find((c) => c.tieId === tie.tieId) ?? tie);
    changed.forEach((tie) => setTie(tie.tieId, tie));
  };

  switch (stage) {
    case PLAYOFF_MATCH_STAGE.COIN_WON:
      setTie(mine.tieId, { coinToss: coinToss(me, theirId, them, now) });
      break;
    case PLAYOFF_MATCH_STAGE.COIN_LOST:
      setTie(mine.tieId, { coinToss: coinToss(them, theirId, them, now) });
      break;
    case PLAYOFF_MATCH_STAGE.LEG1_POSTED:
      setTie(mine.tieId, { coinToss: coinToss(them, theirId, them, now) });
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: them,
          status: LADDER_MATCH_STATUS.POSTED,
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.LEG1_COMPLETE:
      setTie(mine.tieId, { coinToss: coinToss(them, theirId, them, now) });
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: them,
          status: LADDER_MATCH_STATUS.COMPLETED,
          wins: wins(me, 4, 2),
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.LEVEL:
      setTie(mine.tieId, {
        coinToss: coinToss(me, myId, me, now),
        deciderRequired: true,
      });
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: me,
          status: LADDER_MATCH_STATUS.COMPLETED,
          wins: wins(me, 4, 2),
          now,
        }),
        legMatch({
          tie: mine,
          leg: 2,
          host: them,
          status: LADDER_MATCH_STATUS.COMPLETED,
          wins: wins(them, 4, 2),
          now,
        }),
        legMatch({
          tie: mine,
          leg: 3,
          host: them,
          status: LADDER_MATCH_STATUS.ACCEPTED,
          now,
        }),
      );
      break;
    case PLAYOFF_MATCH_STAGE.SETTLED:
      setTie(mine.tieId, { coinToss: coinToss(me, myId, me, now) });
      matches.push(
        legMatch({
          tie: mine,
          leg: 1,
          host: me,
          status: LADDER_MATCH_STATUS.COMPLETED,
          wins: wins(me, 4, 1),
          now,
        }),
        legMatch({
          tie: mine,
          leg: 2,
          host: them,
          status: LADDER_MATCH_STATUS.COMPLETED,
          wins: wins(me, 4, 2),
          now,
        }),
      );
      settle(mine.tieId, me, LADDER_PLAYOFF_TIE_OUTCOME.PLAYED);
      setTie(neighbour.tieId, {
        coinToss: coinToss("team1", neighbour.side1.playerIds[0], "team1", now),
      });
      matches.push(
        legMatch({
          tie: neighbour,
          leg: 1,
          host: "team1",
          status: LADDER_MATCH_STATUS.COMPLETED,
          wins: wins("team2", 4, 3),
          now,
        }),
        legMatch({
          tie: neighbour,
          leg: 2,
          host: "team2",
          status: LADDER_MATCH_STATUS.COMPLETED,
          wins: wins("team2", 4, 0),
          now,
        }),
      );
      settle(neighbour.tieId, "team2", LADDER_PLAYOFF_TIE_OUTCOME.PLAYED);
      break;
    default:
      break;
  }

  if (stage !== PLAYOFF_MATCH_STAGE.SETTLED) {
    setTie(neighbour.tieId, {
      coinToss: coinToss("team1", neighbour.side1.playerIds[0], "team1", now),
    });
    matches.push(
      legMatch({
        tie: neighbour,
        leg: 1,
        host: "team1",
        status: LADDER_MATCH_STATUS.COMPLETED,
        wins: wins("team2", 4, 3),
        now,
      }),
      legMatch({
        tie: neighbour,
        leg: 2,
        host: "team2",
        status: LADDER_MATCH_STATUS.ACCEPTED,
        wins: ["team1"],
        now,
      }),
    );
  }
  setTie(played.tieId, {
    coinToss: coinToss("team2", played.side1.playerIds[0], "team1", now),
  });
  matches.push(
    legMatch({
      tie: played,
      leg: 1,
      host: "team2",
      status: LADDER_MATCH_STATUS.COMPLETED,
      wins: wins("team1", 4, 1),
      now,
    }),
    legMatch({
      tie: played,
      leg: 2,
      host: "team1",
      status: LADDER_MATCH_STATUS.COMPLETED,
      wins: wins("team2", 4, 3),
      now,
    }),
  );
  settle(played.tieId, "team1", LADDER_PLAYOFF_TIE_OUTCOME.PLAYED);
  settle(voided.tieId, null, LADDER_PLAYOFF_TIE_OUTCOME.VOID);
  setTie(level.tieId, {
    coinToss: coinToss("team1", level.side2.playerIds[0], "team2", now),
    deciderRequired: true,
  });
  matches.push(
    legMatch({
      tie: level,
      leg: 1,
      host: "team1",
      status: LADDER_MATCH_STATUS.COMPLETED,
      wins: wins("team1", 4, 3),
      now,
    }),
    legMatch({
      tie: level,
      leg: 2,
      host: "team2",
      status: LADDER_MATCH_STATUS.COMPLETED,
      wins: wins("team2", 4, 3),
      now,
    }),
    legMatch({
      tie: level,
      leg: 3,
      host: "team2",
      status: LADDER_MATCH_STATUS.ACCEPTED,
      now,
    }),
  );

  const notifications =
    stage === PLAYOFF_MATCH_STAGE.LEVEL
      ? [
          {
            id: `maestro-po-decider-${mine.tieId}`,
            title: "One deciding game to play",
            message: `Your Round of 16 in ${LADDER_NAME} is level on aggregate. One deciding game must be played to decide who goes through.`,
            data: {
              ladderId: MAESTRO_PO_LADDER_ID,
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
              message: `Congratulations! You've reached the Quarter-Final in ${LADDER_NAME}. You have 10 days to play both your home and away games.`,
              data: {
                ladderId: MAESTRO_PO_LADDER_ID,
                tab: "Playoffs",
                tieId: "r2-s0",
              },
            },
          ]
        : [];

  await commit([
    ...[...tieUpdates].map(
      ([tieId, fields]) =>
        (batch) =>
          batch.set(tieRef(tieId), fields, { merge: true }),
    ),
    ...matches.map(
      (match) => (batch) => batch.set(matchRef(match.ladderMatchId), match),
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
    ladderId: MAESTRO_PO_LADDER_ID,
    stage,
    myTie: mine.tieId,
    ties: tieUpdates.size,
    matches: matches.length,
  };
};
