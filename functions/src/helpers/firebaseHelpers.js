const admin = require("firebase-admin");

const getUserById = async (userId) => {
  const db = admin.firestore();
  try {
    if (!userId) {
      console.log("No userId provided");
      return null;
    }
    const userDocRef = db.collection("users").doc(userId);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      return { userId: userDoc.id, ...userDoc.data() };
    } else {
      console.log(`No user found with ID: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

const updatePlayers = async (updatedPlayers, leagueId) => {
  const db = admin.firestore();
  if (updatedPlayers.length === 0) {
    console.log("No players to update!");
    return;
  }
  try {
    const leagueDocRef = db.collection("leagues").doc(leagueId);
    const leagueDoc = await leagueDocRef.get();
    if (!leagueDoc.exists) {
      console.log("League not found!");
      return;
    }
    const leagueData = leagueDoc.data();
    const existingPlayers = leagueData.leagueParticipants || [];
    const updatedParticipants = existingPlayers.map((player) => {
      const updatedPlayer = updatedPlayers.find(
        (p) => p.username === player.username,
      );
      return updatedPlayer ? { ...player, ...updatedPlayer } : player;
    });
    await leagueDocRef.update({ leagueParticipants: updatedParticipants });
    console.log(
      `✅ Updated ${updatedPlayers.length} players in league ${leagueId}`,
    );
  } catch (error) {
    console.error("Error updating player data:", error);
    throw error;
  }
};

const updateUsers = async (usersToUpdate) => {
  const db = admin.firestore();
  try {
    const updatePromises = usersToUpdate.map(async (user) => {
      const userRef = db.collection("users").doc(user.userId);
      await userRef.update({ profileDetail: user.profileDetail });
    });
    await Promise.all(updatePromises);
    console.log(`✅ Updated ${usersToUpdate.length} users successfully`);
  } catch (error) {
    console.error("Error updating users:", error);
    throw error;
  }
};

const updateTeams = async (updatedTeams, leagueId) => {
  const db = admin.firestore();
  if (updatedTeams.length === 0) {
    console.log("No teams to update!");
    return;
  }
  try {
    const leagueDocRef = db.collection("leagues").doc(leagueId);
    const leagueDoc = await leagueDocRef.get();
    if (!leagueDoc.exists) {
      console.log("League not found!");
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
        !existingTeams.some((team) => team.teamKey === updatedTeam.teamKey),
    );
    const finalTeamsArray = [...updatedTeamsArray, ...newTeams];
    await leagueDocRef.update({ leagueTeams: finalTeamsArray });
    console.log(
      `✅ Updated ${updatedTeams.length} teams in league ${leagueId}`,
    );
    if (newTeams.length > 0) {
      console.log(
        `✅ Added ${newTeams.length} new teams to league ${leagueId}`,
      );
    }
  } catch (error) {
    console.error("Error updating team data:", error);
    throw error;
  }
};

const retrieveTeams = async (leagueId) => {
  const db = admin.firestore();
  try {
    const leagueDocRef = db.collection("leagues").doc(leagueId);
    const leagueDoc = await leagueDocRef.get();
    if (!leagueDoc.exists) {
      console.log(`League not found with ID: ${leagueId}`);
      return [];
    }
    const leagueData = leagueDoc.data();
    const leagueTeams = leagueData.leagueTeams || [];
    console.log(
      `✅ Retrieved ${leagueTeams.length} teams from league ${leagueId}`,
    );
    return leagueTeams;
  } catch (error) {
    console.error("Error retrieving teams:", error);
    return [];
  }
};

module.exports = {
  getUserById,
  updatePlayers,
  updateUsers,
  updateTeams,
  retrieveTeams,
};
