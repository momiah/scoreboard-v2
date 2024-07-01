// GameContext.js
import React, { createContext, useState, useEffect } from "react";
// import { retrieveGames } from "../services/retrieveGame";
import { Alert } from "react-native";
import {
  deleteDoc,
  doc,
  setDoc,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import Popup from "../components/popup/Popup";

const GameContext = createContext();

const GameProvider = ({ children }) => {
  const [games, setGames] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteGameContainer, setDeleteGameContainer] = useState(false);
  const [deleteGameId, setDeleteGameId] = useState(null);
  const [player, setPlayer] = useState("");
  const [players, setPlayers] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };

    fetchData();
  }, []);

  const sortGamesByNewest = (games) => {
    return games.sort((a, b) => {
      const [dateA, gameNumberA] = a.gameId.split("-game-");
      const [dateB, gameNumberB] = b.gameId.split("-game-");

      const formattedDateA = dateA.split("-").reverse().join("-"); // Converts 11-06-2024 to 2024-06-11
      const formattedDateB = dateB.split("-").reverse().join("-"); // Converts 11-06-2024 to 2024-06-11

      if (formattedDateA === formattedDateB) {
        return parseInt(gameNumberB) - parseInt(gameNumberA); // Newest game number first
      }

      return new Date(formattedDateB) - new Date(formattedDateA); // Newest date first
    });
  };

  const retrieveGames = async () => {
    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");

      const sortQuery = query(
        scoreboardCollectionRef,
        orderBy("gameId", "desc")
      );

      const querySnapshot = await getDocs(
        sortQuery ? sortQuery : scoreboardCollectionRef
      );

      const games = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sortedGames = sortGamesByNewest(games);

      return sortedGames; // Return the retrieved games
    } catch (error) {
      console.error("Error retrieving games:", error);
      return []; // Return an empty array in case of errors
    }
  };

  const handleShowPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
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
      console.error("Error retrieving games:", error);
      return [];
    }
  };

  const fetchPlayers = async () => {
    try {
      const players = await retrievePlayers();
      setPlayers(players); // Set the retrieved players in the state
    } catch (error) {
      console.error("Error logging players:", error);
    }
  };

  const registerPlayer = async (player) => {
    // Check if player already exists
    if (players.some((thePlayer) => thePlayer.id === player)) {
      handleShowPopup("Player already exists!");
      return;
    }

    // Check if player name is more than 10 characters
    if (player.length > 10) {
      handleShowPopup("Player name cannot be more than 10 characters!");
      return;
    }

    if (player.length < 3) {
      handleShowPopup("Player name must be more than 3 characters!");
      return;
    }

    const newPlayer = {
      numberOfWins: 0,
      numberOfLosses: 0,
      totalPoints: 0,
      numberOfGamesPlayed: 0,
      resultLog: [],
      XP: 0,
      currentStreak: {
        type: null, // "W" for win streak, "L" for loss streak
        count: 0,
      },
    };

    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");
      const playersCollectionRef = collection(
        scoreboardCollectionRef,
        "players",
        "players"
      );

      // Use the player name as the document ID
      const playerDocRef = doc(playersCollectionRef, player);

      await setDoc(playerDocRef, { newPlayer }); // Write the data directly
      handleShowPopup("Player saved successfully!");
      await fetchPlayers();
    } catch (error) {
      console.error("Error saving player data:", error);
      handleShowPopup("Error saving player data");
    }
  };

  const addGame = async (newGame, gameId) => {
    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");

      // Generate a unique document ID to prevent overwriting (optional)
      const gameDocRef = doc(scoreboardCollectionRef, gameId);

      await setDoc(gameDocRef, newGame);
      Alert.alert("Success", "Game saved successfully!");
      setGames((prevGames) => [newGame, ...prevGames]);
    } catch (error) {
      console.error("Error saving game:", error);
      Alert.alert("Error", "Error saving game data");
    }
  };

  const deleteGameById = async (gameId, setGames) => {
    // 1. Confirm Deletion (Optional)
    Alert.alert("Delete Game", "Are you sure you want to delete this game?", [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          // 2. Remove Game from State
          setGames((prevGames) =>
            prevGames.filter((game) => game.gameId !== gameId)
          );

          // 3. Remove game from Firebase
          try {
            const gameDocRef = doc(db, "scoreboard", gameId);
            await deleteDoc(gameDocRef);
          } catch (error) {
            console.error("Error deleting game from Firebase:", error);
          }
        },
      },
    ]);
  };

  return (
    <GameContext.Provider
      value={{
        games,
        setGames,
        player,
        players,
        showPopup,
        setShowPopup,
        handleShowPopup,
        popupMessage,
        setPopupMessage,
        fetchPlayers,
        setPlayers,
        registerPlayer,
        retrievePlayers,
        setPlayer,
        addGame,
        deleteGameById,
        refreshing,
        retrieveGames,
        setRefreshing,
        deleteGameContainer,
        setDeleteGameContainer,
        deleteGameId,
        setDeleteGameId,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export { GameContext, GameProvider };
