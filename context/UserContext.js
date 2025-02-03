import React, { createContext, useState, useEffect, useContext } from "react";
import { Keyboard } from "react-native";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import moment from "moment";
import { PopupContext } from "./PopupContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const { showPopup, setShowPopup, popupMessage, setPopupMessage } =
    useContext(PopupContext);
  const [players, setPlayers] = useState([]);
  const [player, setPlayer] = useState("");
  const [currentUser, setCurrentUser] = useState(null); // Optional: Track logged-in user

  const newPlayer = {
    memberSince: moment().format("MMM YYYY"),
    XP: 10,
    prevGameXP: 0,
    lastActive: "",
    numberOfWins: 0,
    numberOfLosses: 0,
    numberOfGamesPlayed: 0,
    winPercentage: 0,
    resultLog: [],
    pointEfficiency: 0,
    totalPoints: 0,
    totalPointEfficiency: 0,
    winStreak5: 0,
    winStreak7: 0,
    winStreak3: 0,
    demonWin: 0,
    currentStreak: {
      type: null,
      count: 0,
    },
    highestLossStreak: 0,
    highestWinStreak: 0,
  };

  const handleShowPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
  };

  const Logout = async () => {
    try {
      // Perform any cleanup or reset actions necessary
      await AsyncStorage.clear();
      setCurrentUser(null); // Clear the logged-in user
      setPlayers([]); // Clear player data
      handleShowPopup("Successfully logged out!");
    } catch (error) {
      console.error("Error during logout:", error);
      handleShowPopup("Error during logout");
    }
  };

  const retrievePlayers = async (leagueId) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueId);

      // Get the existing league document
      const leagueDoc = await getDoc(leagueDocRef);
      const leagueParticipants = leagueDoc.data().leagueParticipants;

      return leagueParticipants;
    } catch (error) {
      console.error("Error retrieving players:", error);
      return [];
    }
  };
  const retrieveTeams = async (leagueId) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueId);

      // Get the existing league document
      const leagueDoc = await getDoc(leagueDocRef);
      const leagueParticipants = leagueDoc.data().leagueTeams;

      return leagueParticipants;
    } catch (error) {
      console.error("Error retrieving players:", error);
      return [];
    }
  };

  // const retrievePlayers = async () => {
  //   try {
  //     const scoreboardCollectionRef = collection(db, "scoreboard");
  //     const playersCollectionRef = collection(
  //       scoreboardCollectionRef,
  //       "players",
  //       "players"
  //     );

  //     const querySnapshot = await getDocs(playersCollectionRef);

  //     const players = querySnapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     }));

  //     return players;
  //   } catch (error) {
  //     console.error("Error retrieving players:", error);
  //     return [];
  //   }
  // };

  async function checkUserRole(leagueData) {
    try {
      // Retrieve userId from AsyncStorage
      const userId = await AsyncStorage.getItem("userId");

      if (!userId) {
        // console.error('User ID not found in AsyncStorage');
        return "hide";
      }

      // If user is not an admin or participant, return user
      if (
        leagueData.leagueAdmins.length === 0 &&
        leagueData.leagueParticipants.length === 0
      ) {
        return "user";
      }

      // Check if the userId matches any league admin
      const isAdmin = leagueData.leagueAdmins.some(
        (admin) => admin.userId === userId
      );
      if (isAdmin) {
        return "admin";
      }

      // Check if the userId matches any league participant
      const isParticipant = leagueData.leagueParticipants.some(
        (participant) => participant.userId === userId
      );
      if (isParticipant) {
        return "participant";
      }

      // If no match, return user
      return "user";
    } catch (error) {
      // console.error('Error checking user role:', error);
      return "hide";
    }
  }

  const fetchPlayers = async (leagueId) => {
    try {
      const players = await retrievePlayers(leagueId);
      setPlayers(players); // Set the retrieved players in the state
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const [loading, setLoading] = useState(true); // Track loading state
  const [playersData, setPlayersData] = useState([]);

  const fetchPlayersToSort = async (leagueId) => {
    setLoading(true); // Set loading to true while fetching
    try {
      const retrievedPlayers = await retrievePlayers(leagueId);

      // Sort the players based on the sum of XP + totalPoints
      const sortedPlayers = retrievedPlayers.sort((a, b) => {
        const totalA = a.XP + a.totalPoints;
        const totalB = b.XP + b.totalPoints;

        return totalB - totalA; // Sort in descending order
      });

      setPlayersData(sortedPlayers);
    } catch (error) {
      console.error("Error fetching players:", error);
    } finally {
      setLoading(false);
    }
  };

  // const registerPlayer = async (player) => {
  //   if (players.some((thePlayer) => thePlayer.id === player)) {
  //     handleShowPopup("Player already exists!");
  //     return;
  //   }

  //   if (player.length > 10) {
  //     handleShowPopup("Player name cannot be more than 10 characters!");
  //     return;
  //   }

  //   if (player.length < 3) {
  //     handleShowPopup("Player name must be more than 3 characters!");
  //     return;
  //   }

  //   try {
  //     const scoreboardCollectionRef = collection(db, "scoreboard");
  //     const playersCollectionRef = collection(
  //       scoreboardCollectionRef,
  //       "players",
  //       "players"
  //     );

  //     const playerDocRef = doc(playersCollectionRef, player);
  //     await setDoc(playerDocRef, newPlayer); // Write the data directly

  //     handleShowPopup("Player saved successfully!");
  //     await fetchPlayers();
  //     Keyboard.dismiss();
  //   } catch (error) {
  //     console.error("Error saving player data:", error);
  //     handleShowPopup("Error saving player data");
  //   }
  // };

  const updatePlayers = async (updatedPlayers, leagueId) => {
    if (updatedPlayers.length === 0) {
      handleShowPopup("No players to update!");
      return;
    }

    try {
      const leagueDocRef = doc(db, "leagues", leagueId); // Reference to the league document

      // Fetch the current league document
      const leagueDoc = await getDoc(leagueDocRef);

      if (!leagueDoc.exists()) {
        handleShowPopup("League not found!");
        return;
      }

      const leagueData = leagueDoc.data();
      const existingPlayers = leagueData.leagueParticipants || [];

      // Update the existing players array with updated data
      const updatedParticipants = existingPlayers.map((player) => {
        const updatedPlayer = updatedPlayers.find((p) => p.id === player.id);
        return updatedPlayer ? { ...player, ...updatedPlayer } : player;
      });

      // Update the leagueParticipants field in Firestore
      await updateDoc(leagueDocRef, {
        leagueParticipants: updatedParticipants,
      });

      // Optionally fetch the updated players to refresh the UI
      await fetchPlayers(leagueId);
      handleShowPopup("Players updated successfully!");
    } catch (error) {
      console.error("Error updating player data:", error);
      handleShowPopup("Error updating player data");
    }
  };

  const updateTeams = async (updatedTeams, leagueId) => {
    if (updatedTeams.length === 0) {
      console.error("No teams to update!");
      return;
    }

    console.log("updatedTeams", JSON.stringify(updatedTeams, null, 2));

    try {
      const leagueDocRef = doc(db, "leagues", leagueId);

      // Fetch the current league document
      const leagueDoc = await getDoc(leagueDocRef);
      if (!leagueDoc.exists()) {
        console.error("League not found!");
        return;
      }

      const leagueData = leagueDoc.data();
      const existingTeams = leagueData.leagueTeams || [];

      // Merge the updated teams into the existing ones
      const updatedTeamsArray = existingTeams.map((team) => {
        const updatedTeam = updatedTeams.find(
          (t) => t.teamKey === team.teamKey
        );
        return updatedTeam ? { ...team, ...updatedTeam } : team;
      });

      // Add any new teams that weren't already in existingTeams
      const newTeams = updatedTeams.filter(
        (updatedTeam) =>
          !existingTeams.some((team) => team.teamKey === updatedTeam.teamKey)
      );

      // Final teams list to update in Firestore
      const finalTeamsArray = [...updatedTeamsArray, ...newTeams];

      // console.log("finalTeamsArray", finalTeamsArray);

      // Update Firestore with the new teams array
      await updateDoc(leagueDocRef, { leagueTeams: finalTeamsArray });

      console.log("Teams updated successfully!");
    } catch (error) {
      console.error("Error updating team data:", error);
    }
  };

  const getUserById = async (userId) => {
    try {
      if (!userId) {
        console.error("User ID is required to fetch details.");
        return null;
      }

      // Reference the document in the 'users' collection by ID
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data(); // Include the document ID
      } else {
        console.error("No user found with the given ID.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  };

  const resetAllPlayerStats = async () => {
    try {
      const allPlayers = await retrievePlayers();
      const allPlayersIds = allPlayers.map((player) => player.id);

      for (const playerId of allPlayersIds) {
        const scoreboardCollectionRef = collection(db, "scoreboard");
        const playersCollectionRef = collection(
          scoreboardCollectionRef,
          "players",
          "players"
        );

        const playerDocRef = doc(playersCollectionRef, playerId);
        await updateDoc(playerDocRef, newPlayer);
      }

      handleShowPopup("All player stats reset successfully!");
      await fetchPlayers();
    } catch (error) {
      console.error("Error resetting player stats:", error);
      handleShowPopup("Error resetting player stats");
    }
  };

  const resetPlayerStats = async () => {
    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");
      const playersCollectionRef = collection(
        scoreboardCollectionRef,
        "players",
        "players"
      );

      // Use the player name (or ID) as the document ID
      const playerDocRef = doc(playersCollectionRef, "Abdul");
      console.log("playerDocRef", playerDocRef);
      await setDoc(playerDocRef, newPlayer); // Write the data directly
      handleShowPopup("Player reset successfully!");
    } catch (error) {
      console.error("Error updating player data:", error);
      handleShowPopup("Error updating player data");
    }
  };

  const updatePlacementStats = async (userId, prizeXP, placement) => {
    try {
      // Fetch the user's document
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error(`User with ID ${userId} not found.`);
        return;
      }

      const userData = userDoc.data();

      // Ensure profileDetail exists
      const profileDetail = userData.profileDetail || {};

      // Update XP inside profileDetail
      const updatedXP = (profileDetail.XP || 0) + prizeXP;

      // Update leagueStats inside profileDetail
      const updatedLeagueStats = {
        first: profileDetail.leagueStats?.first || 0,
        second: profileDetail.leagueStats?.second || 0,
        third: profileDetail.leagueStats?.third || 0,
        fourth: profileDetail.leagueStats?.fourth || 0,
      };

      // Increment the corresponding placement stat
      if (placement === "1st") updatedLeagueStats.first += 1;
      if (placement === "2nd") updatedLeagueStats.second += 1;
      if (placement === "3rd") updatedLeagueStats.third += 1;
      if (placement === "4th") updatedLeagueStats.fourth += 1;

      // Update the user's document in Firebase
      await updateDoc(userDocRef, {
        profileDetail: {
          ...profileDetail,
          XP: updatedXP, // Update XP
          leagueStats: updatedLeagueStats, // Update leagueStats
        },
      });

      console.log(
        `User ${userId} updated in profileDetail: +${prizeXP} XP, Incremented ${placement} place`
      );
    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        showPopup,
        popupMessage,

        retrievePlayers,
        fetchPlayersToSort,
        loading,
        setLoading,
        playersData,
        setPlayersData,

        retrieveTeams,
        updateTeams,
        updatePlacementStats,
        Logout,
        resetPlayerStats,
        resetAllPlayerStats,
        fetchPlayers,
        setPlayers,
        updatePlayers,
        // registerPlayer,
        setPlayer,
        players,
        player,
        getUserById,
        checkUserRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
