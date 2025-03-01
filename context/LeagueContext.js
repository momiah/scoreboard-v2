// LeagueContext.js
import React, { createContext, useState, useEffect } from "react";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";

import { generatedLeagues } from "../components/Leagues/leagueMocks";
import { ccDefaultImage } from "../mockImages";

import { db } from "../services/firebase.config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateLeagueId } from "../functions/generateLeagueId";

const LeagueContext = createContext();

const LeagueProvider = ({ children }) => {
  const [leagues, setLeagues] = useState([]);
  const [showMockData, setShowMockData] = useState(false);
  const [leagueIdForDetail, setLeagueIdForDetail] = useState("");
  const [leagueById, setLeagueById] = useState();

  useEffect(() => {
    if (showMockData) {
      setLeagues(generatedLeagues);
    } else {
      fetchLeagues();
    }
  }, [showMockData]);

  const fetchLeagues = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "leagues"));

      const leaguesData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          image: data.image || ccDefaultImage, // Set default image if none exists
        };
      });

      setLeagues(leaguesData);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  const addPlaytime = async (playtime, existingPlaytime = null) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueById.id);

      // Get the existing league document
      const leagueDoc = await getDoc(leagueDocRef);

      if (leagueDoc.exists()) {
        // Get the current playtime array from the league document
        const currentPlaytime = leagueDoc.data().playingTime || [];

        let updatedPlaytime;

        if (existingPlaytime) {
          // Update existing playtime
          updatedPlaytime = currentPlaytime.map((time) =>
            time.day === existingPlaytime.day &&
            time.startTime === existingPlaytime.startTime &&
            time.endTime === existingPlaytime.endTime
              ? playtime[0] // Replace with the updated playtime
              : time
          );
        } else {
          // Add new playtime
          updatedPlaytime = [...currentPlaytime, ...playtime];
        }

        // Update the league document with the updated playtime array
        await updateDoc(leagueDocRef, { playingTime: updatedPlaytime });
      } else {
        console.error("League document not found.");
        Alert.alert("Error", "League not found.");
      }
    } catch (error) {
      console.error("Error saving playtime:", error);
      Alert.alert("Error", "Error saving playtime data");
    }
  };

  const deletePlaytime = async (playtimeToDelete) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueById.id);

      // Get the existing league document
      const leagueDoc = await getDoc(leagueDocRef);

      if (leagueDoc.exists()) {
        const currentPlaytime = leagueDoc.data().playingTime || [];

        // Filter out the playtime to be deleted
        const updatedPlaytime = currentPlaytime.filter(
          (playtime) =>
            !(
              playtime.day === playtimeToDelete.day &&
              playtime.startTime === playtimeToDelete.startTime &&
              playtime.endTime === playtimeToDelete.endTime
            )
        );

        // Update Firebase with the updated playtime array
        await updateDoc(leagueDocRef, { playingTime: updatedPlaytime });
      } else {
        console.error("League document not found.");
        Alert.alert("Error", "League not found.");
      }
    } catch (error) {
      console.error("Error deleting playtime:", error);
      Alert.alert("Error", "Error deleting playtime");
    }
  };

  const handleLeagueDescription = async (newDescription) => {
    try {
      const leagueCollectionRef = collection(db, "leagues");
      const leagueDocRef = doc(leagueCollectionRef, leagueById.id);

      // Update the leagueDescription field in Firebase
      await updateDoc(leagueDocRef, { leagueDescription: newDescription });

      // Update the context state with the new description
      setLeagueById((prev) => ({
        ...prev,
        leagueDescription: newDescription,
      }));
    } catch (error) {
      console.error("Error updating league description:", error);
      Alert.alert("Error", "Unable to update the league description.");
    }
  };

  const addLeagues = async (leagueData) => {
    const leagueId = generateLeagueId(leagueData);
    try {
      await setDoc(doc(db, "leagues", leagueId), {
        ...leagueData,
      });

      fetchLeagues();
      setLeagueIdForDetail(leagueId);
      setTimeout(() => {
        setLeagueIdForDetail("");
      }, 2000);
    } catch (error) {
      console.error("Error adding league: ", error);
    }
  };

  const fetchLeagueById = async (leagueId) => {
    try {
      // Reference the specific league document in the 'leagues' collection
      const leagueDoc = await getDoc(doc(db, "leagues", leagueId));

      // Check if the league exists
      if (leagueDoc.exists()) {
        // Store the data along with the document ID
        const leagueData = {
          id: leagueDoc.id, // Include document ID
          ...leagueDoc.data(), // Include the rest of the document fields
        };

        // Optionally, update state with the fetched league data
        setLeagueById(leagueData);
        return leagueData;
      } else {
        console.log("No league found with the given ID");
      }
    } catch (error) {
      console.error("Error fetching league:", error);
    }
  };

  return (
    <LeagueContext.Provider
      value={{
        addPlaytime,
        setShowMockData,
        showMockData,
        fetchLeagueById,
        leagueById,
        addLeagues,
        leagues,
        fetchLeagues,
        setLeagueIdForDetail,
        handleLeagueDescription,
        leagueIdForDetail,
        deletePlaytime,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export { LeagueContext, LeagueProvider };
