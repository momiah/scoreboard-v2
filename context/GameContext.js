// GameContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
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
import { PopupContext } from "./PopupContext";
import { generatedLeagues } from "../components/Leagues/leagueMocks";

import { db } from "../services/firebase.config";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GameContext = createContext();

const GameProvider = ({ children }) => {
  const { handleShowPopup } = useContext(PopupContext);
  const [games, setGames] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteGameContainer, setDeleteGameContainer] = useState(false);
  const [deleteGameId, setDeleteGameId] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [showMockData, setShowMockData] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        // Reference the `leagues` collection in Firestore
        const querySnapshot = await getDocs(collection(db, "leagues"));

        // Map through the documents and store data
        const leaguesData = querySnapshot.docs.map((doc) => ({
          id: doc.id, // Include document ID
          ...doc.data(), // Include the rest of the document fields
        }));
        console.log("leaguesData🙂", leaguesData);

        setLeagues(leaguesData);
      } catch (error) {
        console.error("Error fetching leagues:", error);
      }
    };

    if (showMockData) {
      setLeagues(generatedLeagues); // Use mock data if `showMockData` is true
    } else {
      fetchLeagues(); // Fetch real data if `showMockData` is false
    }
  }, [showMockData]);

  const addLeagues = async (leagueData) => {
    const leagueName = leagueData.leagueName;
    const leagueEntry = {
      id: 1,
      leagueAdmins: ["Rayyan", "Hussain"],
      leageueParticipants: [
        {
          id: "Rayyan",
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
        },
      ],
      maxPlayers: maxPlayers[0],
      privacy: privacyTypes[0],
      name: "Laura Trotter Badminton League",
      playingTime: [
        {
          day: "Monday",
          startTime: "6:00 PM",
          endTime: "8:00 PM",
        },
        {
          day: "Wednesday",
          startTime: "6:00 PM",
          endTime: "8:00 PM",
        },
        {
          day: "Friday",
          time: "6:00 PM",
          endTime: "8:00 PM",
        },
      ],
      leagueStatus: leagueStatus[0],
      location: "Cheshunt",
      centerName: "Cheshunt Sports Center",
      country: "England",
      startDate: "24/12/2023",
      endDate: "",
      leagueType: leagueTypes[0],
      prizeType: prizeTypes[0],
      entryFee: 10,
      currencyType: currencyTypes[0],
      image: mockImages.court1,
      games: [
        {
          id: "15-08-2024-game-2",
          team1: {
            player1: "Rayyan",
            score: 21,
            player2: "Hussain",
          },
          gameId: "15-08-2024-game-2",
          result: {
            loser: {
              team: "Team 2",
              score: 10,
              players: ["Yasin", "Abdul"],
            },
            winner: {
              score: 21,
              players: ["Rayyan", "Hussain"],
              team: "Team 1",
            },
          },
          team2: {
            score: 10,
            player2: "Abdul",
            player1: "Yasin",
          },
          date: "15-08-2024",
          gamescore: "21 - 10",
        },
      ],
    };
    try {
      await setDoc(doc(db, "leagues", "uniqueLeagueId4"), {
        ...leagueData,
      });
      console.log("League added successfully!");
    } catch (error) {
      console.error("Error adding league: ", error);
    }
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

  const addGame = async (newGame, gameId) => {
    try {
      const scoreboardCollectionRef = collection(db, "scoreboard");

      // Generate a unique document ID to prevent overwriting (optional)
      const gameDocRef = doc(scoreboardCollectionRef, gameId);

      await setDoc(gameDocRef, newGame);
      handleShowPopup("Game added and players updated successfully!");
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
        addGame,
        deleteGameById,
        deleteGameContainer,
        setDeleteGameContainer,
        deleteGameId,
        setDeleteGameId,
        addLeagues,
        retrieveGames,
        setShowMockData,
        showMockData,
        leagues,

        refreshing,
        setRefreshing,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export { GameContext, GameProvider };
