import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  scoreboardProfileSchema,
  notificationTypes,
  ScoreboardProfile,
  PendingInvites,
  PendingRequests,
  UserProfile,
  ccImageEndpoint,
  CollectionName,
} from "@/shared";
import { db } from "../services/firebase.config";
import { getUserById } from "./firebaseFunctions";

interface AddPlayerToCompetitionParams {
  userId: string;
  competitionId: string;
  notificationId: string | null;
  collectionName: CollectionName;
}

export const addPlayerToCompetition = async ({
  userId,
  competitionId,
  notificationId = null,
  collectionName,
}: AddPlayerToCompetitionParams): Promise<void> => {
  try {
    const competitionRef = doc(db, collectionName, competitionId);
    const competitionDoc = await getDoc(competitionRef);

    if (!competitionDoc.exists()) {
      console.error("Competition does not exist or has been deleted");
      return;
    }

    const competitionData = competitionDoc.data();
    const participantsKey =
      collectionName === "leagues"
        ? "leagueParticipants"
        : "tournamentParticipants";

    const currentParticipants: ScoreboardProfile[] =
      competitionData[participantsKey] || [];

    const pendingInvites: PendingInvites[] =
      competitionData.pendingInvites || [];

    const pendingRequests: PendingRequests[] =
      competitionData.pendingRequests || [];

    const alreadyJoined = currentParticipants.some((p) => p.userId === userId);

    if (alreadyJoined) {
      console.warn("Player is already a participant in this competition");
      return;
    }

    const newParticipant = (await getUserById(userId)) as UserProfile | null;

    if (!newParticipant) {
      console.error("User not found");
      return;
    }

    const newParticipantProfile: ScoreboardProfile = {
      ...scoreboardProfileSchema,
      username: newParticipant.username,
      firstName: newParticipant.firstName.split(" ")[0],
      lastName: newParticipant.lastName.split(" ")[0],
      userId: newParticipant.userId,
      memberSince: newParticipant.profileDetail?.memberSince || "",
      profileImage: newParticipant.profileImage || ccImageEndpoint,
    };

    const updates = {
      [participantsKey]: [...currentParticipants, newParticipantProfile],
      pendingInvites: pendingInvites.filter((inv) => inv.userId !== userId),
      pendingRequests: pendingRequests.filter((req) => req.userId !== userId),
    };

    await updateDoc(competitionRef, updates);

    if (notificationId) {
      const notificationRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId,
      );
      await updateDoc(notificationRef, {
        isRead: true,
        response: notificationTypes.RESPONSE.ACCEPT,
      });
    }

    console.log(
      `Player ${userId} successfully added to ${collectionName} ${competitionId}`,
    );
  } catch (error) {
    console.error("Error adding player to competition:", error);
    throw error;
  }
};
