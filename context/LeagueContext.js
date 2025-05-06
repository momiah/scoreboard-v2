import React, { createContext, useState, useEffect } from "react";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import moment from "moment";

// import { generatedLeagues } from "../components/Leagues/leagueMocks";
import { ccDefaultImage } from "../mockImages";
import { db } from "../services/firebase.config";

import { generateLeagueId } from "../functions/generateLeagueId";
import { generateCourtId } from "../functions/generateCourtId";
import { generateUniqueUserId } from "../functions/generateUniqueUserId";
import {
  userProfileSchema,
  scoreboardProfileSchema,
  profileDetailSchema,
} from "../schemas/schema";

const LeagueContext = createContext();

const LeagueProvider = ({ children }) => {
  const [leagues, setLeagues] = useState([]);
  const [showMockData, setShowMockData] = useState(false);
  const [leagueIdForDetail, setLeagueIdForDetail] = useState("");
  const [leagueById, setLeagueById] = useState(null);

  // Fetch leagues data based on mock or real data
  useEffect(() => {
    fetchLeagues();
  }, []);

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
        const currentPlaytime = leagueDoc.data().playingTime || [];
        let updatedPlaytime;

        if (existingPlaytime) {
          updatedPlaytime = currentPlaytime.map((time) =>
            time.day === existingPlaytime.day &&
            time.startTime === existingPlaytime.startTime &&
            time.endTime === existingPlaytime.endTime
              ? playtime[0] // Replace with updated playtime
              : time
          );
        } else {
          updatedPlaytime = [...currentPlaytime, ...playtime];
        }

        // Update the league document with updated playtime array
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

        // Update Firebase with updated playtime array
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

      // Update the context state with new description
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

      fetchLeagues(); // Re-fetch leagues to update the list
      setLeagueIdForDetail(leagueId);

      // Reset the league detail state after a short delay
      setTimeout(() => {
        setLeagueIdForDetail("");
      }, 2000);
    } catch (error) {
      console.error("Error adding league: ", error);
    }
  };

  const fetchLeagueById = async (leagueId) => {
    try {
      const leagueDoc = await getDoc(doc(db, "leagues", leagueId));

      if (leagueDoc.exists()) {
        const leagueData = {
          id: leagueDoc.id,
          ...leagueDoc.data(),
        };

        setLeagueById(leagueData);
        return leagueData;
      } else {
        console.log("No league found with the given ID");
      }
    } catch (error) {
      console.error("Error fetching league:", error);
    }
  };

  // Function to update a league
  const updateLeague = async (updatedLeague) => {
    try {
      const leagueDocRef = doc(db, "leagues", updatedLeague.id);

      // Update the league document in Firebase
      await updateDoc(leagueDocRef, updatedLeague);

      // Update the state in the context
      setLeagues((prevLeagues) =>
        prevLeagues.map((league) =>
          league.id === updatedLeague.id ? updatedLeague : league
        )
      );
    } catch (error) {
      console.error("Error updating league:", error);
      Alert.alert("Error", "Unable to update the league.");
    }
  };

  const getCourts = async () => {
    const snapshot = await getDocs(collection(db, "courts"));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  const addCourt = async (courtData) => {
    try {
      const courtId = generateCourtId(courtData);
      console.log("court", courtData);
      await setDoc(doc(db, "courts", courtId), {
        ...courtData,
      });
      return courtId;
    } catch (error) {
      console.error("Error adding court: ", error);
      throw error; // Optional: Re-throw for error handling in components
    }
  };

  const generateNewLeagueParticipants = async (number, leagueId) => {
    const newPlayers = Array.from({ length: number }, (_, i) => {
      const userId = generateUniqueUserId();
      const username = `player${i + 1}`;
      const memberSince = moment().format("MMM YYYY");

      return {
        username,
        userId,
        memberSince,
        ...JSON.parse(JSON.stringify(scoreboardProfileSchema)),
      };
    });

    try {
      // Add each player to 'users' collection
      for (const player of newPlayers) {
        const userDoc = {
          ...userProfileSchema,
          userId: player.userId,
          username: player.username,
          firstName: `First${player.username}`,
          lastName: `Last${player.username}`,
          email: `${player.username}@example.com`,
          profileDetail: {
            ...profileDetailSchema,
            lastActive: player.memberSince,
          },
        };

        await setDoc(doc(db, "users", player.userId), userDoc);
      }

      console.log(
        "newPlayers added to users collection:",
        JSON.stringify(newPlayers, null, 2)
      );

      // Add newPlayers to league
      const leagueRef = doc(db, "leagues", leagueId);
      const leagueSnap = await getDoc(leagueRef);

      if (!leagueSnap.exists()) {
        throw new Error("League does not exist!");
      }

      const existingParticipants = leagueSnap.data().leagueParticipants || [];

      await updateDoc(leagueRef, {
        leagueParticipants: [...existingParticipants, ...newPlayers],
      });

      console.log(
        `✅ Added ${number} players to league '${leagueId}' and users collection.`
      );
    } catch (err) {
      console.error("❌ Error writing to Firestore:", err);
    }
  };

  return (
    <LeagueContext.Provider
      value={{
        // Playtime Management
        addPlaytime,
        deletePlaytime,

        // League Data Management
        addLeagues,
        updateLeague, // Exposing the updateLeague function
        fetchLeagues,
        fetchLeagueById,
        getCourts,
        addCourt,

        // League State Management
        leagues,
        leagueById,
        leagueIdForDetail,
        setLeagueIdForDetail,

        // Mock Data Management
        setShowMockData,
        showMockData,
        generateNewLeagueParticipants,

        // League Description Management
        handleLeagueDescription,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export { LeagueContext, LeagueProvider };
