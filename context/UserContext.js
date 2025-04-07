import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  use,
} from "react";
import { Keyboard } from "react-native";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  startAt,
  endAt,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import moment from "moment";
import { PopupContext } from "./PopupContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileDetailSchema } from "../schemas/schema";

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const { showPopup, setShowPopup, popupMessage, setPopupMessage } =
    useContext(PopupContext);
  const [players, setPlayers] = useState([]);

  const [currentUser, setCurrentUser] = useState(null); // Optional: Track logged-in user

  useEffect(() => {
    const loadInitialUser = async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          const userData = await getUserById(userId);
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Initial user load failed:", error);
      } finally {
        setInitializing(false);
      }
    };

    loadInitialUser();
  }, []);

  const handleShowPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
  };

  const Logout = async () => {
    try {
      await AsyncStorage.clear();
      setCurrentUser(null);
      setPlayers([]);
      handleShowPopup("Successfully logged out!");
    } catch (error) {
      console.error("Error during logout:", error);
      handleShowPopup("Error during logout");
    }
  };

  const retrievePlayersFromLeague = async (leagueId) => {
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
      const leagueTeams = leagueDoc.data().leagueTeams;

      return leagueTeams;
    } catch (error) {
      console.error("Error retrieving teams:", error);
      return [];
    }
  };

  async function checkUserRole(leagueData) {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return "hide";

      // Check if leagueData is valid
      if (
        !leagueData ||
        !leagueData.leagueAdmins ||
        !leagueData.leagueParticipants
      ) {
        console.error("Invalid league data:", leagueData);
        return "hide";
      }

      const isAdmin = leagueData.leagueAdmins.some(
        (admin) => admin.userId === userId
      );
      if (isAdmin) return "admin";

      const isParticipant = leagueData.leagueParticipants.some(
        (participant) => participant.userId === userId
      );
      return isParticipant ? "participant" : "user";
    } catch (error) {
      console.error("Error checking user role:", error);
      return "hide";
    }
  }

  const fetchPlayers = async (leagueId) => {
    try {
      const players = await retrievePlayersFromLeague(leagueId);
      setPlayers(players); // Set the retrieved players in the state
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const [loading, setLoading] = useState(true); // Track loading state

  const getAllUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const users = querySnapshot.docs.map((doc) => ({
        // id: doc.id,
        ...doc.data(),
      }));
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  };

  const updateUsers = async (usersToUpdate) => {
    try {
      const updatePromises = usersToUpdate.map(async (user) => {
        const userRef = doc(db, "users", user.userId);

        await updateDoc(userRef, {
          profileDetail: user.profileDetail,
        });
      });

      await Promise.all(updatePromises);
      // console.log("All users updated successfully.");
    } catch (error) {
      console.error("Error updating users:", error);
    }
  };

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
        const updatedPlayer = updatedPlayers.find(
          (p) => p.username === player.username
        );
        return updatedPlayer ? { ...player, ...updatedPlayer } : player;
      });

      // Update the leagueParticipants field in Firestore
      await updateDoc(leagueDocRef, {
        leagueParticipants: updatedParticipants,
      });

      // Optionally fetch the updated players to refresh the UI
      await fetchPlayers(leagueId);
      // handleShowPopup("Players updated successfully!");
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

      await updateDoc(leagueDocRef, { leagueTeams: finalTeamsArray });
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
      const allPlayers = await retrievePlayersFromLeague();
      const allPlayersIds = allPlayers.map((player) => player.username);

      for (const playerId of allPlayersIds) {
        const scoreboardCollectionRef = collection(db, "scoreboard");
        const playersCollectionRef = collection(
          scoreboardCollectionRef,
          "players",
          "players"
        );

        const playerDocRef = doc(playersCollectionRef, playerId);
        await updateDoc(playerDocRef, profileDetailSchema);
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
      await setDoc(playerDocRef, profileDetailSchema); // Write the data directly
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

      // console.log(
      //   `User ${userId} updated in profileDetail: +${prizeXP} XP, Incremented ${placement} place`
      // );
    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
    }
  };

  const rankSorting = (users) => {
    // Create a copy to avoid mutating original array
    return [...users].sort((a, b) => {
      // Add null safety checks
      const aDetail = a.profileDetail || {};
      const bDetail = b.profileDetail || {};

      if (bDetail.XP !== aDetail.XP) return bDetail.XP - aDetail.XP;
      if (bDetail.numberOfWins !== aDetail.numberOfWins)
        return bDetail.numberOfWins - aDetail.numberOfWins;
      if (bDetail.winPercentage !== aDetail.winPercentage)
        return bDetail.winPercentage - aDetail.winPercentage;
      if (bDetail.totalPointDifference !== aDetail.totalPointDifference)
        return bDetail.totalPointDifference - aDetail.totalPointDifference;

      // Fallback to username comparison
      return (a.username || "").localeCompare(b.username || "");
    });
  };

  const getGlobalRank = async (userId) => {
    try {
      // 1. Get all users using existing fetch logic
      const allUsers = await getAllUsers();

      // 2. Use the EXACT SAME sorting as AllPlayers
      const sorted = rankSorting(allUsers);

      // 3. Find index of the target user
      const userIndex = sorted.findIndex((user) => user.userId === userId);

      // 4. Return rank (index + 1)
      return userIndex >= 0 ? userIndex + 1 : null;
    } catch (error) {
      console.error("Rank check failed:", error);
      return null;
    }
  };

  const getLeaguesForUser = async (userId) => {
    try {
      // Get all leagues from the "leagues" collection
      const leaguesRef = collection(db, "leagues");
      const querySnapshot = await getDocs(leaguesRef);

      // Filter the leagues where the user is a participant
      const userLeagues = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((league) => {
          // Check if leagueParticipants exists and is an array
          if (
            !league.leagueParticipants ||
            !Array.isArray(league.leagueParticipants)
          ) {
            return false;
          }
          // Return true if at least one participant has a matching userId
          return league.leagueParticipants.some(
            (participant) => participant.userId === userId
          );
        });

      return userLeagues;
    } catch (error) {
      console.error("Error fetching leagues for user:", error);
      return [];
    }
  };

  // Add this in your UserProvider component
  // UserContext.js - Final optimized version
  const updateUserProfile = async (updatedFields) => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) throw new Error("User not authenticated");

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, updatedFields); // Surgical update

      setCurrentUser((prev) => ({
        ...prev,
        ...updatedFields,
      }));
      return true; // Keep for success confirmation
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
  };

  const profileViewCount = async (profileUserId) => {
    try {
      const viewerId = await AsyncStorage.getItem("userId");

      // Don't count if user is viewing their own profile
      if (viewerId === profileUserId) return;

      const userRef = doc(db, "users", profileUserId);

      const userDoc = await getDoc(userRef);
      const currentViews = userDoc.data().profileViews || 0;

      await updateDoc(userRef, {
        profileViews: currentViews + 1,
      });
    } catch (error) {
      console.error("Error updating profile view count:", error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        showPopup,
        popupMessage,

        retrievePlayersFromLeague,
        loading,
        setLoading,

        rankSorting,
        profileViewCount,
        currentUser,
        updateUserProfile,
        getLeaguesForUser,
        getGlobalRank,
        updateUsers,
        getAllUsers,
        retrieveTeams,
        updateTeams,
        updatePlacementStats,
        Logout,
        resetPlayerStats,
        resetAllPlayerStats,
        fetchPlayers,
        setPlayers,
        updatePlayers,
        players,
        getUserById,
        checkUserRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
