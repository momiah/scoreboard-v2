import {
  COLLECTION_NAMES,
  notificationSchema,
  notificationTypes,
} from "@shared";
import type { CollectionName, Notification } from "@shared";
import type { Club } from "@shared/types";
import { addPendingInvite } from "../addPendingInvite";

export const sendClubInvite = async ({
  club,
  senderId,
  recipientId,
  sendNotification,
}: {
  club: Pick<Club, "clubId" | "clubName">;
  senderId: string;
  recipientId: string;
  sendNotification: (notification: Notification) => Promise<void>;
}): Promise<boolean> => {
  const invited = await addPendingInvite({
    collectionName: COLLECTION_NAMES.clubs as CollectionName,
    documentId: club.clubId,
    userId: recipientId,
  });
  if (!invited) return false;

  await sendNotification({
    ...notificationSchema,
    createdAt: new Date(),
    recipientId,
    senderId,
    message: `You've been invited to join ${club.clubName}`,
    type: notificationTypes.ACTION.INVITE.CLUB,
    data: { clubId: club.clubId },
  } as Notification);
  return true;
};
