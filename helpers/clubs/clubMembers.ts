import { doc, runTransaction } from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import type { Club, CompetitionAdmins } from "@shared/types";
import { db } from "../../services/firebase.config";

const clubRefFor = (clubId: string) => doc(db, COLLECTION_NAMES.clubs, clubId);

const participantRefFor = (clubId: string, userId: string) =>
  doc(db, COLLECTION_NAMES.clubs, clubId, "participants", userId);

export const setClubAdmin = async ({
  clubId,
  user,
  isAdmin,
}: {
  clubId: string;
  user: CompetitionAdmins;
  isAdmin: boolean;
}): Promise<void> =>
  runTransaction(db, async (transaction) => {
    const clubRef = clubRefFor(clubId);
    const clubSnap = await transaction.get(clubRef);
    if (!clubSnap.exists()) throw new Error("Club does not exist");

    const club = clubSnap.data() as Club;
    const admins: CompetitionAdmins[] = club.clubAdmins || [];
    const alreadyAdmin = admins.some((admin) => admin.userId === user.userId);

    if (isAdmin) {
      if (alreadyAdmin) return;
      const participantSnap = await transaction.get(
        participantRefFor(clubId, user.userId),
      );
      if (!participantSnap.exists()) {
        throw new Error("Only club members can be made admins");
      }
      transaction.update(clubRef, {
        clubAdmins: [
          ...admins,
          { userId: user.userId, username: user.username },
        ],
      });
      return;
    }

    if (user.userId === club.clubOwner?.userId) {
      throw new Error("The club owner is always an admin");
    }
    if (!alreadyAdmin) return;
    transaction.update(clubRef, {
      clubAdmins: admins.filter((admin) => admin.userId !== user.userId),
    });
  });

export const removeClubMembership = async ({
  clubId,
  userId,
}: {
  clubId: string;
  userId: string;
}): Promise<Club | null> =>
  runTransaction(db, async (transaction) => {
    const clubRef = clubRefFor(clubId);
    const participantRef = participantRefFor(clubId, userId);
    const [clubSnap, participantSnap] = await Promise.all([
      transaction.get(clubRef),
      transaction.get(participantRef),
    ]);
    if (!clubSnap.exists() || !participantSnap.exists()) return null;

    const club = clubSnap.data() as Club;
    if (club.clubOwner?.userId === userId) {
      throw new Error("The club owner cannot be removed");
    }

    transaction.delete(participantRef);
    transaction.update(clubRef, {
      clubAdmins: (club.clubAdmins || []).filter(
        (admin) => admin.userId !== userId,
      ),
    });
    return club;
  });
