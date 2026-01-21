import {
  doc,
  getDoc,
  updateDoc,
  collection,
  runTransaction,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import { Tournament, TeamStats } from "../types/competition";
import { ScoreboardProfile, UserProfile } from "../types/player";

// Helper function to get user by ID (similar to your UserContext)
export const getUserById = async (userId: string) => {
  try {
    if (!userId) return null;
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      console.error("No user found with the given ID.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
};

// Helper function to retrieve teams from league (similar to your UserContext)
export const retrieveTeams = async (
  competitionId: string,
  collectionName: string
) => {
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = doc(collectionRef, competitionId);

    // Get the existing league document
    const collectionDoc = await getDoc(docRef);
    if (!collectionDoc.exists()) {
      return [];
    }
    const data = collectionDoc.data();
    const teams =
      collectionName === "tournaments"
        ? data.tournamentTeams
        : data.leagueTeams;

    return teams;
  } catch (error) {
    console.error("Error retrieving teams:", error);
    return [];
  }
};

// Helper function to update users (similar to your UserContext)
export const updateUsers = async (usersToUpdate: UserProfile[]) => {
  try {
    const updatePromises = usersToUpdate.map(async (user) => {
      const userRef = doc(db, "users", user.userId);
      await updateDoc(userRef, {
        profileDetail: user.profileDetail,
      });
    });
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error updating users:", error);
  }
};

// Helper function to update teams (similar to your UserContext)
export const updateTeams = async ({
  updatedTeams,
  competitionId,
  collectionName,
}: {
  updatedTeams: TeamStats[];
  competitionId: string;
  collectionName: string;
}) => {
  if (updatedTeams.length === 0) {
    console.error("No teams to update!");
    return;
  }

  try {
    const collectionDocRef = doc(db, collectionName, competitionId);

    // Fetch the current league document
    const collectionDoc = await getDoc(collectionDocRef);
    if (!collectionDoc.exists()) {
      console.error("League not found!");
      return;
    }

    const collectionData = collectionDoc.data();
    const existingTeams =
      collectionName === "tournaments"
        ? collectionData.tournamentTeams || []
        : collectionData.leagueTeams || [];

    // Merge the updated teams into the existing ones
    const updatedTeamsArray = existingTeams.map((team: TeamStats) => {
      const updatedTeam = updatedTeams.find((t) => t.teamKey === team.teamKey);
      return updatedTeam ? { ...team, ...updatedTeam } : team;
    });

    // Add any new teams that weren't already in existingTeams
    const newTeams = updatedTeams.filter(
      (updatedTeam) =>
        !existingTeams.some(
          (team: TeamStats) => team.teamKey === updatedTeam.teamKey
        )
    );

    // Final teams list to update in Firestore
    const finalTeamsArray = [...updatedTeamsArray, ...newTeams];

    if (collectionName === "tournaments") {
      await updateDoc(collectionDocRef, { tournamentTeams: finalTeamsArray });
    } else {
      await updateDoc(collectionDocRef, { leagueTeams: finalTeamsArray });
    }
  } catch (error) {
    console.error("Error updating team data:", error);
  }
};
