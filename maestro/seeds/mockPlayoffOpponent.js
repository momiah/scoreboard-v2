import {
  Timestamp,
  addDoc,
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
  getLadderPlayoffLegHost,
  notificationSchema,
  notificationTypes,
} from "@shared";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import { playoffMatchMessages } from "../../helpers/playoffMatchMessages";
import { MAESTRO_PO_LADDER_ID } from "./seedLadderPlayoffs";
import { legId, other, sideKey } from "./seedLadderPlayoffMatches";

const matchRef = (ladderId, matchId) =>
  doc(db, "ladders", ladderId, "ladderMatches", matchId);

const ladderTypeOf = async (ladderId) =>
  (await getDoc(doc(db, "ladders", ladderId))).data()?.ladderType ??
  LADDER_TYPE.SINGLES;

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
  const partnerIds = tie[sideKey(user)].playerIds.filter((id) => id !== userId);
  return { tie, user, opponent: other(user), partnerIds };
};

const opponentName = (tie, opponent) => {
  const player = tie[opponent].player1;
  return formatDisplayName({
    firstName: player?.firstName,
    lastName: player?.lastName,
    username: player?.username,
  });
};

const notifyUser = async ({
  ladderId,
  tie,
  testUser,
  opponent,
  senderId = undefined,
  id,
  message,
}) => {
  await setDoc(
    doc(db, "users", testUser.userId, "notifications", `maestro-po-${id}`),
    {
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: testUser.userId,
      senderId: senderId ?? tie[sideKey(opponent)].playerIds[0],
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
      ladderType: await ladderTypeOf(ladderId),
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
    message: playoffMatchMessages.arranged(opponentName(tie, opponent), match),
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
  if (
    !snap.exists() ||
    snap.data().matchStatus !== LADDER_MATCH_STATUS.POSTED
  ) {
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
      ? playoffMatchMessages.accepted(opponentName(tie, opponent), match)
      : playoffMatchMessages.declined(opponentName(tie, opponent), match),
  });
  return { tieId: tie.tieId, leg, accept };
};

const partnerOf = (tie, user, userId) =>
  [tie[user].player1, tie[user].player2]
    .filter(Boolean)
    .find((player) => player.userId !== userId);

const playerName = (player) =>
  formatDisplayName({
    firstName: player?.firstName,
    lastName: player?.lastName,
    username: player?.username,
  });

export const mockPartnerArrangesLeg = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  leg,
  dayOffset = 2,
  time = "20:00",
}) => {
  const { tie, user } = await findUserTie({
    ladderId,
    userId: testUser.userId,
  });
  const partner = partnerOf(tie, user, testUser.userId);
  if (!partner)
    throw new Error("mockPartnerArrangesLeg: the user has no partner");
  if (getLadderPlayoffLegHost(tie, leg) !== user) {
    throw new Error(
      `mockPartnerArrangesLeg: the user's pair doesn't host match ${leg}`,
    );
  }
  const id = legId(tie, leg);
  const previous = await getDoc(matchRef(ladderId, id));
  const match = {
    ...buildLadderPlayoffLegMatch({
      tie,
      leg,
      host: user,
      ladderMatchId: id,
      ladderType: await ladderTypeOf(ladderId),
      input: {
        court: tie[sideKey(user)].homeCourt,
        matchDate: moment().add(dayOffset, "days").format("DD-MM-YYYY"),
        matchTime: { start: time },
        currencyType: "GBP",
        shuttleType: SHUTTLE_TYPE.FEATHER,
      },
      createdBy: partner.userId,
      now: new Date(),
    }),
    scheduleDeclines: previous.data()?.scheduleDeclines ?? 0,
  };
  await setDoc(matchRef(ladderId, id), match);
  await notifyUser({
    ladderId,
    tie,
    testUser,
    opponent: user,
    senderId: partner.userId,
    id: `partner-arranged-${id}`,
    message: playoffMatchMessages.arrangedByPartner(playerName(partner), match),
  });
  return { tieId: tie.tieId, leg, by: partner.userId };
};

export const mockPartnerRespondsToLeg = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  leg,
  accept,
}) => {
  const { tie, user } = await findUserTie({
    ladderId,
    userId: testUser.userId,
  });
  const partner = partnerOf(tie, user, testUser.userId);
  if (!partner)
    throw new Error("mockPartnerRespondsToLeg: the user has no partner");
  const id = legId(tie, leg);
  const snap = await getDoc(matchRef(ladderId, id));
  if (
    !snap.exists() ||
    snap.data().matchStatus !== LADDER_MATCH_STATUS.POSTED
  ) {
    throw new Error(
      `mockPartnerRespondsToLeg: match ${leg} is not awaiting a reply`,
    );
  }
  const match = snap.data();
  if (accept) {
    await updateDoc(matchRef(ladderId, id), {
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      acceptedBy: partner.userId,
      acceptedAt: new Date(),
    });
  } else {
    await updateDoc(matchRef(ladderId, id), {
      matchStatus: LADDER_MATCH_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelledReason: "Time declined",
      scheduleDeclines: (match.scheduleDeclines ?? 0) + 1,
    });
  }
  await notifyUser({
    ladderId,
    tie,
    testUser,
    opponent: user,
    senderId: partner.userId,
    id: `partner-${accept ? "accepted" : "declined"}-${id}`,
    message: playoffMatchMessages.answeredByPartner(
      playerName(partner),
      match,
      accept,
    ),
  });
  return { tieId: tie.tieId, leg, accept, by: partner.userId };
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
    message: playoffMatchMessages.playNowOffer(
      opponentName(tie, opponent),
      first.court?.courtName,
    ),
  });
  return { tieId: tie.tieId };
};

const tieChatId = (ladderId, tie) => `${ladderId}-${tie.tieId}`;

export const mockOpponentTieChat = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  text,
}) => {
  const { tie, opponent } = await findUserTie({
    ladderId,
    userId: testUser.userId,
  });
  const player = tie[opponent].player1;
  const opponentId = tie[sideKey(opponent)].playerIds[0];
  await addDoc(
    collection(
      db,
      "ladders",
      ladderId,
      LADDER_PLAYOFF_TIES_COLLECTION,
      tie.tieId,
      "chat",
    ),
    {
      text,
      createdAt: Timestamp.now(),
      user: { _id: opponentId, name: player?.username ?? "", avatar: "" },
    },
  );
  await setDoc(
    doc(db, "users", testUser.userId, "chats", tieChatId(ladderId, tie)),
    {
      type: "chat",
      isRead: false,
      messageCount: 1,
      competitionId: tieChatId(ladderId, tie),
      lastMessage: `${player?.username ?? ""}: ${text}`,
      createdAt: new Date(),
      competitionName: "Round of 16 · Tie 2 · Maestro Playoffs 256",
      competitionType: "ladder",
      ladderId,
      tieId: tie.tieId,
    },
  );
  return { tieId: tie.tieId };
};

export const assertTieChatDelivered = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  text,
}) => {
  const { tie, opponent } = await findUserTie({
    ladderId,
    userId: testUser.userId,
  });
  const opponentId = tie[sideKey(opponent)].playerIds[0];
  const messages = await getDocs(
    collection(
      db,
      "ladders",
      ladderId,
      LADDER_PLAYOFF_TIES_COLLECTION,
      tie.tieId,
      "chat",
    ),
  );
  const sent = messages.docs
    .map((d) => d.data())
    .find((data) => data.text === text && data.user?._id !== opponentId);
  if (!sent) throw new Error(`Tie chat message "${text}" was not stored`);
  const chat = await getDoc(
    doc(db, "users", opponentId, "chats", tieChatId(ladderId, tie)),
  );
  if (!chat.exists()) throw new Error("The opponent has no chat entry");
  const data = chat.data();
  if (
    data.competitionType !== "ladder" ||
    data.ladderId !== ladderId ||
    data.tieId !== tie.tieId ||
    data.isRead !== false ||
    !String(data.lastMessage ?? "").includes(text)
  ) {
    throw new Error(
      `The opponent's chat entry is wrong: ${JSON.stringify(data)}`,
    );
  }
  return { delivered: true, tieId: tie.tieId };
};

const NOTIFICATION_KINDS = {
  "cancellation-request": ({ name, court }) => ({
    message: `${name} asked to cancel your ladder match at ${court}`,
  }),
  "reschedule-request": ({ name, court }) => ({
    message: `${name} asked to move your ladder match at ${court} to Mon 19 Oct, 19:00`,
  }),
  extension: ({ name, court }) => ({
    message: `${name} extended your ladder match at ${court}. Your extension has 7 days left to complete your match.`,
  }),
  reminder: ({ ladderName }) => ({
    title: "Playoff reminder",
    message: `3 days left to finish your Round of 16 in ${ladderName}.`,
  }),
};

export const PLAYOFF_NOTIFICATION_KINDS = Object.keys(NOTIFICATION_KINDS);

export const mockPlayoffNotification = async ({
  testUser,
  ladderId = MAESTRO_PO_LADDER_ID,
  kind,
}) => {
  const { tie, opponent } = await findUserTie({
    ladderId,
    userId: testUser.userId,
  });
  const ladder = (await getDoc(doc(db, "ladders", ladderId))).data();
  const content = NOTIFICATION_KINDS[kind]({
    name: opponentName(tie, opponent),
    court: tie[sideKey(opponent)].homeCourt?.courtName ?? "your court",
    ladderName: ladder.name,
  });
  await setDoc(
    doc(
      db,
      "users",
      testUser.userId,
      "notifications",
      `maestro-po-notify-${kind}`,
    ),
    {
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: testUser.userId,
      senderId: tie[sideKey(opponent)].playerIds[0],
      type: notificationTypes.INFORMATION.LADDER.TYPE,
      data: { ladderId, tieId: tie.tieId, tab: "Playoffs" },
      ...content,
    },
  );
  return { kind, tieId: tie.tieId };
};
