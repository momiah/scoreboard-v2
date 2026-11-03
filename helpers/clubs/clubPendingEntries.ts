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

export type ClubPendingOutcome =
  "accepted" | "declined" | "notPending" | "clubMissing";

export const resolveClubPendingEntry = async ({
  clubId,
  pendingKey,
  memberId,
  notificationOwnerId,
  notificationId,
  accept,
  participant,
}: {
  clubId: string;
  pendingKey: "pendingRequests" | "pendingInvites";
  memberId: string;
  notificationOwnerId: string;
  notificationId: string;
  accept: boolean;
  participant?: Player;
}): Promise<ClubPendingOutcome> =>
  runTransaction(db, async (transaction) => {
    const clubRef = doc(db, COLLECTION_NAMES.clubs, clubId);
    const notificationRef = doc(
      db,
      "users",
      notificationOwnerId,
      "notifications",
      notificationId,
    );
    const clubSnap = await transaction.get(clubRef);

    if (!clubSnap.exists()) {
      transaction.update(notificationRef, { isRead: true });
      return "clubMissing";
    }

    const pending: PendingRequests[] = clubSnap.data()[pendingKey] || [];
    if (!pending.some((entry) => entry.userId === memberId)) {
      transaction.update(notificationRef, { isRead: true });
      return "notPending";
    }

    transaction.update(clubRef, {
      [pendingKey]: pending.filter((entry) => entry.userId !== memberId),
    });

    if (accept) {
      if (!participant) {
        throw new Error("resolveClubPendingEntry: no participant");
      }
      transaction.set(
        doc(db, COLLECTION_NAMES.clubs, clubId, "participants", memberId),
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
