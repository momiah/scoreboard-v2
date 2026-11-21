import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import {
  COLLECTION_NAMES,
  COMPETITION_TYPES,
  notificationSchema,
  notificationTypes,
} from "@shared";
import type { Notification } from "@shared";
import type { Club } from "@shared/types";
import { db } from "../../services/firebase.config";

type SendNotification = (notification: Notification) => Promise<void>;

export const clubNotification = ({
  clubId,
  recipientId,
  senderId,
  message,
}: {
  clubId: string;
  recipientId: string;
  senderId: string;
  message: string;
}): Notification =>
  ({
    ...notificationSchema,
    createdAt: new Date(),
    recipientId,
    senderId,
    message,
    type: notificationTypes.INFORMATION.CLUB.TYPE,
    data: { clubId },
  }) as Notification;

export const clubJoinResponseMessage = (clubName: string, accepted: boolean) =>
  accepted
    ? `Your request to join ${clubName} was accepted!`
    : `Your request to join ${clubName} was declined`;

export const clubLeftMessage = (memberName: string, clubName: string) =>
  `${memberName} has left ${clubName}`;

export const clubCompetitionCreatedMessage = ({
  creatorName,
  competitionType,
  name,
  clubName,
}: {
  creatorName: string;
  competitionType: "league" | "tournament";
  name: string;
  clubName: string;
}) => `${creatorName} created the ${competitionType} "${name}" in ${clubName}`;

export const getClubName = async (clubId: string): Promise<string | null> => {
  const snap = await getDoc(doc(db, COLLECTION_NAMES.clubs, clubId));
  return snap.exists() ? ((snap.data() as Club).clubName ?? null) : null;
};

export const notifyClubMembersOfCompetition = async ({
  clubId,
  competitionType,
  competitionId,
  name,
  creatorId,
  creatorName,
  sendNotification,
}: {
  clubId: string;
  competitionType: "league" | "tournament";
  competitionId: string;
  name: string;
  creatorId: string;
  creatorName: string;
  sendNotification: SendNotification;
}): Promise<string[]> => {
  const [clubName, participantsSnap] = await Promise.all([
    getClubName(clubId),
    getDocs(collection(db, COLLECTION_NAMES.clubs, clubId, "participants")),
  ]);
  if (!clubName) return [];

  const isLeague = competitionType === COMPETITION_TYPES.LEAGUE;
  const recipientIds = participantsSnap.docs
    .map((participant) => participant.id)
    .filter((id) => id !== creatorId);

  const message = clubCompetitionCreatedMessage({
    creatorName,
    competitionType,
    name,
    clubName,
  });

  await Promise.allSettled(
    recipientIds.map((recipientId) =>
      sendNotification({
        ...notificationSchema,
        createdAt: new Date(),
        recipientId,
        senderId: creatorId,
        message,
        type: isLeague
          ? notificationTypes.INFORMATION.LEAGUE.TYPE
          : notificationTypes.INFORMATION.TOURNAMENT.TYPE,
        data: isLeague
          ? { leagueId: competitionId, clubId }
          : { tournamentId: competitionId, clubId },
      } as Notification),
    ),
  );
  return recipientIds;
};
