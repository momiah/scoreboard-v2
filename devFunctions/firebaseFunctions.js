import { doc, getDoc, updateDoc, collection } from "firebase/firestore";
import { db } from "../services/firebase.config";

// Helper function to get user by ID (similar to your UserContext)
export const getUserById = async (userId) => {
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
export const retrieveTeams = async (competitionId, collectionName) => {
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = doc(collectionRef, competitionId);

    // Get the existing league document
    const collectionDoc = await getDoc(docRef);
    const teams =
      collectionName === "tournaments"
        ? collectionDoc.data().tournamentTeams
        : collectionDoc.data().leagueTeams;

    return teams;
  } catch (error) {
    console.error("Error retrieving teams:", error);
    return [];
  }
};

// Helper function to update users (similar to your UserContext)
export const updateUsers = async (usersToUpdate) => {
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
    const updatedTeamsArray = existingTeams.map((team) => {
      const updatedTeam = updatedTeams.find((t) => t.teamKey === team.teamKey);
      return updatedTeam ? { ...team, ...updatedTeam } : team;
    });

    // Add any new teams that weren't already in existingTeams
    const newTeams = updatedTeams.filter(
      (updatedTeam) =>
        !existingTeams.some((team) => team.teamKey === updatedTeam.teamKey)
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
