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
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_TYPE,
  SHUTTLE_TYPE,
  buildLadderPlayoffLegMatch,
  canDeclineLadderPlayoffMatch,
  getLadderPlayoffLegHost,
  notificationSchema,
  notificationTypes,
} from "@shared";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import { MAESTRO_PO_LADDER_ID } from "./seedLadderPlayoffs";
import { legId, other, sideKey } from "./seedLadderPlayoffMatches";

const matchRef = (ladderId, matchId) =>
  doc(db, "ladders", ladderId, "ladderMatches", matchId);

const slotLabel = (match) =>
  moment(
    `${match.matchDate} ${match.matchTime?.start ?? "00:00"}`,
    "DD-MM-YYYY HH:mm",
  ).format("ddd D MMM, HH:mm");

const matchLabel = (match) =>
  `playoff match ${match.playoffLeg} at ${match.court?.courtName ?? "your court"}, ${slotLabel(match)}`;

export const findUserTie = async ({
  ladderId = MAESTRO_PO_LADDER_ID,
  userId,
}) => {
  const snapshot = await getDocs(
    collection(db, "ladders", ladderId, LADDER_PLAYOFF_TIES_COLLECTION),
  );
  const tie = snapshot.docs
    .map((d) => ({ ...d.data(), tieId: d.id }))
    .filter(
      (candidate) =>
        candidate.status === LADDER_PLAYOFF_TIE_STATUS.SCHEDULED &&
        [candidate.side1, candidate.side2].some((side) =>
          side?.playerIds?.includes(userId),
        ),
    )
    .sort((a, b) => b.round - a.round)[0];
  if (!tie) throw new Error("mockPlayoffOpponent: the user has no open tie");
  const user = tie.side1.playerIds.includes(userId) ? "team1" : "team2";
  return { tie, user, opponent: other(user) };
};

const opponentName = (tie, opponent) => {
  const player = tie[opponent].player1;
  return formatDisplayName({
    firstName: player?.firstName,
    lastName: player?.lastName,
    username: player?.username,
  });
};

const notifyUser = async ({ ladderId, tie, testUser, opponent, id, message }) => {
  await setDoc(
    doc(db, "users", testUser.userId, "notifications", `maestro-po-${id}`),
    {
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: testUser.userId,
      senderId: tie[sideKey(opponent)].playerIds[0],
      message,
      type: notificationTypes.INFORMATION.LADDER.TYPE,
      data: { ladderId, tieId: tie.tieId, tab: "Playoffs" },
    },
  );
};

export const mockOpponentArrangesLeg = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  leg,
  dayOffset = 2,
  time = "19:30",
}) => {
  const { tie, opponent } = await findUserTie({
    ladderId,
    userId: testUser.userId,
  });
  const host = getLadderPlayoffLegHost(tie, leg);
  if (host !== opponent) {
    throw new Error(
      `mockOpponentArrangesLeg: the opponent does not host match ${leg}`,
    );
  }
  const id = legId(tie, leg);
  const previousSnap = await getDoc(matchRef(ladderId, id));
  const hostSide = tie[sideKey(host)];
  const match = {
    ...buildLadderPlayoffLegMatch({
      tie,
      leg,
      host,
      ladderMatchId: id,
      ladderType: LADDER_TYPE.SINGLES,
      input: {
        court: hostSide.homeCourt,
        matchDate: moment().add(dayOffset, "days").format("DD-MM-YYYY"),
        matchTime: { start: time },
        currencyType: "GBP",
        shuttleType: SHUTTLE_TYPE.FEATHER,
      },
      createdBy: hostSide.playerIds[0],
      now: new Date(),
    }),
    scheduleDeclines: previousSnap.data()?.scheduleDeclines ?? 0,
  };
  await setDoc(matchRef(ladderId, id), match);
  await notifyUser({
    ladderId,
    tie,
    testUser,
    opponent,
    id: `arranged-${id}`,
    message: `${opponentName(tie, opponent)} arranged ${matchLabel(match)}. ${
      canDeclineLadderPlayoffMatch(match)
        ? "Open it to accept or decline."
        : "Open it to accept."
    }`,
  });
  return { tieId: tie.tieId, leg };
};

export const mockOpponentRespondsToLeg = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  leg,
  accept,
}) => {
  const { tie, opponent } = await findUserTie({
    ladderId,
    userId: testUser.userId,
  });
  const id = legId(tie, leg);
  const snap = await getDoc(matchRef(ladderId, id));
  if (!snap.exists() || snap.data().matchStatus !== LADDER_MATCH_STATUS.POSTED) {
    throw new Error(
      `mockOpponentRespondsToLeg: match ${leg} is not awaiting a reply`,
    );
  }
  const match = snap.data();
  if (accept) {
    const carriedCheckIn = match.playNow
      ? (await getDoc(matchRef(ladderId, legId(tie, 1)))).data()?.checkIn
      : undefined;
    await updateDoc(matchRef(ladderId, id), {
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      acceptedBy: tie[sideKey(opponent)].playerIds[0],
      acceptedAt: new Date(),
      ...(carriedCheckIn
        ? { checkIn: carriedCheckIn, lastUpdated: new Date() }
        : {}),
    });
  } else {
    await updateDoc(matchRef(ladderId, id), {
      matchStatus: LADDER_MATCH_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelledReason: match.playNow ? "Play now declined" : "Time declined",
      scheduleDeclines: (match.scheduleDeclines ?? 0) + (match.playNow ? 0 : 1),
    });
  }
  await notifyUser({
    ladderId,
    tie,
    testUser,
    opponent,
    id: `${accept ? "accepted" : "declined"}-${id}`,
    message: accept
      ? `${opponentName(tie, opponent)} accepted ${matchLabel(match)}.`
      : `${opponentName(tie, opponent)} can't make ${matchLabel(match)}. Arrange another time.`,
  });
  return { tieId: tie.tieId, leg, accept };
};

export const mockOpponentOffersPlayHere = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
}) => {
  const { tie, opponent } = await findUserTie({
    ladderId,
    userId: testUser.userId,
  });
  const first = (await getDoc(matchRef(ladderId, legId(tie, 1)))).data();
  if (first?.matchStatus !== LADDER_MATCH_STATUS.COMPLETED) {
    throw new Error("mockOpponentOffersPlayHere: match 1 is not complete");
  }
  const now = new Date();
  const id = legId(tie, 2);
  await setDoc(matchRef(ladderId, id), {
    ...buildLadderPlayoffLegMatch({
      tie,
      leg: 2,
      host: getLadderPlayoffLegHost(tie, 2),
      ladderMatchId: id,
      ladderType: first.ladderType ?? LADDER_TYPE.SINGLES,
      input: {
        court: first.court,
        matchDate: moment(now).format("DD-MM-YYYY"),
        matchTime: { start: moment(now).format("HH:mm") },
        currencyType: first.currencyType,
        shuttleType: first.shuttleType,
      },
      createdBy: tie[sideKey(opponent)].playerIds[0],
      now,
    }),
    playNow: true,
    scheduleDeclines: 0,
  });
  await notifyUser({
    ladderId,
    tie,
    testUser,
    opponent,
    id: `play-here-${id}`,
    message: `${opponentName(tie, opponent)} wants to play match 2 now at ${first.court?.courtName ?? "your court"}. Open the game to accept or decline.`,
  });
  return { tieId: tie.tieId };
};
