import React, { createContext, useState, useEffect, useContext } from "react";
import { Keyboard } from "react-native";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import moment from "moment";
import { PopupContext } from "./PopupContext";

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
      setCurrentUser(null); // Clear the logged-in user
      setPlayers([]); // Clear player data
      handleShowPopup("Successfully logged out!");
    } catch (error) {
      console.error("Error during logout:", error);
      handleShowPopup("Error during logout");
    }
  };

  const retrievePlayers = async () => {
    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");
      const playersCollectionRef = collection(
        scoreboardCollectionRef,
        "players",
        "players"
      );

      const querySnapshot = await getDocs(playersCollectionRef);

      const players = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return players;
    } catch (error) {
      console.error("Error retrieving players:", error);
      return [];
    }
  };

  const fetchPlayers = async () => {
    try {
      const players = await retrievePlayers();
      setPlayers(players); // Set the retrieved players in the state
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const [loading, setLoading] = useState(true); // Track loading state
  const [playersData, setPlayersData] = useState([]);

  const fetchPlayersToSort = async () => {
    setLoading(true); // Set loading to true while fetching
    try {
      const retrievedPlayers = await retrievePlayers();

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

  const registerPlayer = async (player) => {
    if (players.some((thePlayer) => thePlayer.id === player)) {
      handleShowPopup("Player already exists!");
      return;
    }

    if (player.length > 10) {
      handleShowPopup("Player name cannot be more than 10 characters!");
      return;
    }

    if (player.length < 3) {
      handleShowPopup("Player name must be more than 3 characters!");
      return;
    }

    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");
      const playersCollectionRef = collection(
        scoreboardCollectionRef,
        "players",
        "players"
      );

      const playerDocRef = doc(playersCollectionRef, player);
      await setDoc(playerDocRef, newPlayer); // Write the data directly

      handleShowPopup("Player saved successfully!");
      await fetchPlayers();
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error saving player data:", error);
      handleShowPopup("Error saving player data");
    }
  };

  const updatePlayers = async (updatedPlayers) => {
    if (updatedPlayers.length === 0) {
      handleShowPopup("No players to update!");
      return;
    }

    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");
      const playersCollectionRef = collection(
        scoreboardCollectionRef,
        "players",
        "players"
      );

      for (const updatedPlayer of updatedPlayers) {
        const { id } = updatedPlayer;

        const playerDocRef = doc(playersCollectionRef, id);
        await updateDoc(playerDocRef, updatedPlayer);
      }
      await fetchPlayers();
    } catch (error) {
      console.error("Error updating player data:", error);
      handleShowPopup("Error updating player data");
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

  useEffect(() => {
    fetchPlayers();
  }, []);

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

        Logout,
        resetPlayerStats,
        resetAllPlayerStats,
        fetchPlayers,
        setPlayers,
        updatePlayers,
        registerPlayer,
        retrievePlayers,
        setPlayer,
        players,
        player,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
