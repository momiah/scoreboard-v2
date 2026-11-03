import { doc, runTransaction } from "firebase/firestore";
import { COLLECTION_NAMES, notificationTypes } from "@shared";
import type { Club, PendingRequests, Player } from "@shared/types";
import { db } from "../../services/firebase.config";

export const getClubAdminIds = (
  club: Pick<Club, "clubOwner" | "clubAdmins">,
): string[] => {
  const ids = [
    club.clubOwner?.userId,
    ...(club.clubAdmins ?? []).map((admin) => admin.userId),
  ].filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
};

export const addClubJoinRequest = async ({
  clubId,
  userId,
}: {
  clubId: string;
  userId: string;
}): Promise<Club | null> =>
  runTransaction(db, async (transaction) => {
    const clubRef = doc(db, COLLECTION_NAMES.clubs, clubId);
    const clubSnap = await transaction.get(clubRef);
    if (!clubSnap.exists()) return null;

    const club = clubSnap.data() as Club;
    const pendingRequests: PendingRequests[] = club.pendingRequests || [];
    if (pendingRequests.some((request) => request.userId === userId)) {
      return null;
    }

    transaction.update(clubRef, {
      pendingRequests: [...pendingRequests, { userId }],
    });
    return club;
  });

export type ClubJoinRequestOutcome =
  "accepted" | "declined" | "notPending" | "clubMissing";

export const resolveClubJoinRequest = async ({
  clubId,
  senderId,
  adminId,
  notificationId,
  accept,
  participant,
}: {
  clubId: string;
  senderId: string;
  adminId: string;
  notificationId: string;
  accept: boolean;
  participant?: Player;
}): Promise<ClubJoinRequestOutcome> =>
  runTransaction(db, async (transaction) => {
    const clubRef = doc(db, COLLECTION_NAMES.clubs, clubId);
    const notificationRef = doc(
      db,
      "users",
      adminId,
      "notifications",
      notificationId,
    );
    const clubSnap = await transaction.get(clubRef);

    if (!clubSnap.exists()) {
      transaction.update(notificationRef, { isRead: true });
      return "clubMissing";
    }

    const pendingRequests: PendingRequests[] =
      clubSnap.data().pendingRequests || [];
    if (!pendingRequests.some((request) => request.userId === senderId)) {
      transaction.update(notificationRef, { isRead: true });
      return "notPending";
    }

    transaction.update(clubRef, {
      pendingRequests: pendingRequests.filter(
        (request) => request.userId !== senderId,
      ),
    });

    if (accept) {
      if (!participant)
        throw new Error("resolveClubJoinRequest: no participant");
      transaction.set(
        doc(db, COLLECTION_NAMES.clubs, clubId, "participants", senderId),
        participant,
      );
    }

    transaction.update(notificationRef, {
      isRead: true,
      response: accept
        ? notificationTypes.RESPONSE.ACCEPT
        : notificationTypes.RESPONSE.DECLINE,
    });
    return accept ? "accepted" : "declined";
  });
