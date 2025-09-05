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
export const retrieveTeams = async (leagueId) => {
  try {
    const leagueCollectionRef = collection(db, "leagues");
    const leagueDocRef = doc(leagueCollectionRef, leagueId);
    const leagueDoc = await getDoc(leagueDocRef);
    const leagueTeams = leagueDoc.data().leagueTeams;
    return leagueTeams || [];
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
export const updateTeams = async (updatedTeams, leagueId) => {
  if (updatedTeams.length === 0) {
    console.error("No teams to update!");
    return;
  }

  try {
    const leagueDocRef = doc(db, "leagues", leagueId);
    const leagueDoc = await getDoc(leagueDocRef);

    if (!leagueDoc.exists()) {
      console.error("League not found!");
      return;
    }

    const leagueData = leagueDoc.data();
    const existingTeams = leagueData.leagueTeams || [];

    const updatedTeamsArray = existingTeams.map((team) => {
      const updatedTeam = updatedTeams.find((t) => t.teamKey === team.teamKey);
      return updatedTeam ? { ...team, ...updatedTeam } : team;
    });

    const newTeams = updatedTeams.filter(
      (updatedTeam) =>
        !existingTeams.some((team) => team.teamKey === updatedTeam.teamKey)
    );

    const finalTeamsArray = [...updatedTeamsArray, ...newTeams];

    await updateDoc(leagueDocRef, { leagueTeams: finalTeamsArray });
  } catch (error) {
    console.error("Error updating team data:", error);
  }
};
