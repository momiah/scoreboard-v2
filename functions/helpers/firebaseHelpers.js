const admin = require("firebase-admin");
const db = admin.firestore();

const getUserById = async (userId) => {
  const doc = await db.collection("users").doc(userId).get();
  return { userId: doc.id, ...doc.data() };
};

const updatePlayers = async (players, leagueId) => {
  const leagueRef = db.collection("leagues").doc(leagueId);
  await leagueRef.update({
    leagueParticipants: players,
  });
};

const updateUsers = async (users) => {
  const updates = users.map((user) =>
    db.collection("users").doc(user.userId).update(user)
  );
  await Promise.all(updates);
};

const updateTeams = async (teams, leagueId) => {
  const leagueRef = db.collection("leagues").doc(leagueId);
  await leagueRef.update({
    leagueTeams: teams,
  });
};

const retrieveTeams = async (leagueId) => {
  const leagueRef = db.collection("leagues").doc(leagueId);
  const leagueDoc = await leagueRef.get();
  const leagueData = leagueDoc.data();
  return leagueData.leagueTeams || [];
};

module.exports = {
  getUserById,
  updatePlayers,
  updateUsers,
  updateTeams,
  retrieveTeams,
};
