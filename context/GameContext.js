// GameContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { Alert } from "react-native";
import {
  deleteDoc,
  getDoc,
  doc,
  setDoc,
  collection,
  query,
  orderBy,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { PopupContext } from "./PopupContext";
import { AntDesign } from "@expo/vector-icons";

import { db } from "../services/firebase.config";

import { ranks } from "../rankingMedals/ranking/ranks";

const GameContext = createContext();

const GameProvider = ({ children }) => {
  const { handleShowPopup } = useContext(PopupContext);
  const [games, setGames] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteGameContainer, setDeleteGameContainer] = useState(false);
  const [deleteGameId, setDeleteGameId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };

    fetchData();
  }, []);

  const medalNames = (xp) => {
    const rank = ranks.find((rank, index) => {
      const nextRank = ranks[index + 1];
      if (nextRank) {
        return xp >= rank.xp && xp < nextRank.xp;
      } else {
        return xp >= rank.xp;
      }
    });
    return rank ? rank.name : "Recruit";
  };

  const findRankIndex = (xp) => {
    const index = ranks.findIndex((rank, i) => {
      return xp < (ranks[i + 1]?.xp || Infinity);
    });

    return index !== -1 ? index : ranks.length - 1;
  };

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

  const recentGameResult = (resultLog) => {
    const lastResult = resultLog[resultLog.length - 1]; // Get the last element without modifying the array

    const icon = lastResult === "W" ? "caretup" : "caretdown";
    const color = lastResult === "W" ? "green" : "red";

    return <AntDesign name={icon} size={10} color={color} />;
  };

  const getRankByXP = (xp) => {
    const rank = ranks
      .slice()
      .reverse()
      .find((rank) => xp >= rank.xp);
    return rank || ranks[0]; // Default to the first rank if no match is found
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

  const addGame = async (newGame, gameId, leagueId) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueId);

      // Get the existing league document
      const leagueDoc = await getDoc(leagueDocRef);

      if (leagueDoc.exists()) {
        // Get the current games array from the league document
        const currentGames = leagueDoc.data().games || [];

        // Update the games array with the new game
        const updatedGames = [...currentGames, newGame];

        // Update the league document with the updated games array
        await updateDoc(leagueDocRef, { games: updatedGames });

        handleShowPopup("Game added and players updated successfully!");
        setGames((prevGames) => [newGame, ...prevGames]);
      } else {
        console.error("League document not found.");
        Alert.alert("Error", "League not found.");
      }
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
        addGame,
        deleteGameById,
        deleteGameContainer,
        setDeleteGameContainer,
        deleteGameId,
        setDeleteGameId,
        retrieveGames,

        medalNames,
        ranks,
        findRankIndex,
        getRankByXP,
        recentGameResult,

        refreshing,
        setRefreshing,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export { GameContext, GameProvider };
