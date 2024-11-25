// GameContext.js
import React, { createContext, useState, useEffect } from "react";
// import { retrieveGames } from "../services/retrieveGame";
import { Alert, Keyboard } from "react-native";
import {
  deleteDoc,
  doc,
  setDoc,
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase.config";
import moment from "moment";

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

    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");
      const playersCollectionRef = collection(
        scoreboardCollectionRef,
        "players",
        "players"
      );

      // Use the player name as the document ID
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

      // Iterate through each updated player and update their record in Firebase
      for (const updatedPlayer of updatedPlayers) {
        const { id } = updatedPlayer;

        console.log("updatedPlayer", updatedPlayer);

        // Use the player name as the document ID
        const playerDocRef = doc(playersCollectionRef, id);

        // Update the player's document with the new data
        await updateDoc(playerDocRef, updatedPlayer);
      }

      handleShowPopup("Players updated successfully!");
      await fetchPlayers(); // Fetch the updated list of players if needed
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
        try {
          const scoreboardCollectionRef = collection(db, "scoreboard");
          const playersCollectionRef = collection(
            scoreboardCollectionRef,
            "players",
            "players"
          );

          const playerDocRef = doc(playersCollectionRef, playerId);

          // 24-11-2024 adding {newPlayer} on line 241 will revert tp old player stats

          //remove {newPlayer} as an object into newPlayer - This breaks the live app as the
          //player details rely on the player data contained in the object,
          //specifically the memberSince key. Once this is fixed, the app will need
          // to be republished to the app store as removing the object will changes
          // the data structure on firestore
          await setDoc(playerDocRef, newPlayer);

          console.log(`Player ${playerId} reset successfully!`);
        } catch (error) {
          console.error(`Error updating player ${playerId}:`, error);
        }
      }

      handleShowPopup("All players reset successfully!");
      await fetchPlayers(); // Fetch the updated list of players if needed
    } catch (error) {
      console.error("Error resetting all player stats:", error);
      handleShowPopup("Error resetting all player stats");
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
    // console.log("gameId", gameId);

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
        updatePlayers,
        registerPlayer,
        retrievePlayers,
        setPlayer,
        addGame,
        deleteGameById,
        refreshing,
        resetPlayerStats,
        resetAllPlayerStats,
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
