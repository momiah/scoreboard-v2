// LeagueContext.js
import React, { createContext, useState, useEffect } from "react";
import { doc, setDoc, collection, getDocs, getDoc, query, where, updateDoc } from "firebase/firestore";

import { generatedLeagues } from "../components/Leagues/leagueMocks";

import { db } from "../services/firebase.config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LeagueContext = createContext();

const LeagueProvider = ({ children }) => {
  const [leagues, setLeagues] = useState([]);
  const [showMockData, setShowMockData] = useState(false);
  const [leagueById, setLeagueById] = useState();

  useEffect(() => {
    if (showMockData) {
      setLeagues(generatedLeagues); // Use mock data if `showMockData` is true
    } else {
      fetchLeagues(); // Fetch real data if `showMockData` is false
    }
  }, [showMockData]);

  const fetchLeagues = async () => {
    try {
      // Reference the `leagues` collection in Firestore
      const querySnapshot = await getDocs(collection(db, "leagues"));

      // Map through the documents and store data
      const leaguesData = querySnapshot.docs.map((doc) => ({
        id: doc.id, // Include document ID
        ...doc.data(), // Include the rest of the document fields
      }));
      console.log("leaguesDataleaguesDataleaguesData===>", leaguesData);

      setLeagues(leaguesData);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  const addLeagues = async (leagueData) => {
    // console.log("League Entry:", leagueData);

    try {
      await setDoc(doc(db, "leagues", leagueData.leagueName), {
        ...leagueData,
      });
      console.log("League added successfully!");
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
        console.log("League Data:", leagueData);

        // Optionally, update state with the fetched league data
        setLeagueById(leagueData);
      } else {
        console.log("No league found with the given ID");
      }
    } catch (error) {
      console.error("Error fetching league:", error);
    }
  };
  const calculateParticipantTotals = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        console.error("No user ID found");
        return;
      }
  
      const leaguesRef = collection(db, "leagues");
      const querySnapshot = await getDocs(leaguesRef);
  
      // Filter leagues where the user is a participant
      const userLeagues = querySnapshot.docs
        .map((doc) => doc.data())
        .filter((league) =>
          league.leagueParticipants.some((participant) => participant.userId === userId)
        );

        console.log(userLeagues,'userLeagues')
  
      // Initialize a totals object
      const totals = {
        numberOfLosses: 0,
        XP: 0,
        winStreak5: 0,
        winStreak7: 0,
        numberOfGamesPlayed: 0,
        prevGameXP: 0,
        totalPoints: 0,
        demonWin: 0,
        winStreak3: 0,
        highestLossStreak: 0,
        numberOfWins: 0,
        highestWinStreak: 0,
        winPercentage: 0,
        totalPointEfficiency: 0,
      };
  
      // Iterate over each league and add values for the matching participant
      userLeagues.forEach((league) => {
        const participant = league.leagueParticipants.find((p) => p.userId === userId);
        if (participant) {
          Object.keys(totals).forEach((key) => {
            if (participant[key] !== undefined) {
              totals[key] += participant[key];
            }
          });
            const calculateParticipantTotals = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        console.error("No user ID found");
        return;
      }
  
      const leaguesRef = collection(db, "leagues");
      const querySnapshot = await getDocs(leaguesRef);
  
      // Filter leagues where the user is a participant
      const userLeagues = querySnapshot.docs
        .map((doc) => doc.data())
        .filter((league) =>
          league.leagueParticipants.some((participant) => participant.userId === userId)
        );

        console.log(userLeagues,'userLeagues')
  
      // Initialize a totals object
      const totals = {
        userId: userId,
        numberOfLosses: 0,
        XP: 0,
        winStreak5: 0,
        winStreak7: 0,
        numberOfGamesPlayed: 0,
        prevGameXP: 0,
        totalPoints: 0,
        demonWin: 0,
        winStreak3: 0,
        highestLossStreak: 0,
        numberOfWins: 0,
        highestWinStreak: 0,
        winPercentage: 0,
        totalPointEfficiency: 0,
      };
  
      // Iterate over each league and add values for the matching participant
      userLeagues.forEach((league) => {
        const participant = league.leagueParticipants.find((p) => p.userId === userId);
        if (participant) {
          Object.keys(totals).forEach((key) => {
            if (participant[key] !== undefined) {
              totals[key] += participant[key];
            }
          });
        }
      });
  
      // Adjust fields if needed (e.g., winPercentage might be better as an average)
      // if (userLeagues.length > 0) {
      //   totals.winPercentage /= userLeagues.length;
      // }
  
      console.log("Totals:", totals);
      return totals;
    } catch (error) {
      console.error("Error calculating totals:", error);
    }
  };
        }
      });
  
      // Adjust fields if needed (e.g., winPercentage might be better as an average)
      // if (userLeagues.length > 0) {
      //   totals.winPercentage /= userLeagues.length;
      // }
  
      console.log("Totals:", totals);
      return totals;
    } catch (error) {
      console.error("Error calculating totals:", error);
    }
  };
  





  const getAllUsers = async () => {
    try {
      // Reference the 'users' collection
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
  
      // Default profileDetail object
      const defaultProfileDetail = {
        winStreak3: 0,
        highestLossStreak: 0,
        pointEfficiency: 0,
        XP: 10,
        winStreak7: 0,
        numberOfLosses: 0,
        demonWin: 0,
        totalPoints: 0,
        winPercentage: 0,
        currentStreak: {
          type: null,
          count: 0,
        },
        lastActive: "",
        totalPointEfficiency: 0,
        resultLog: [],
        numberOfWins: 0,
        numberOfGamesPlayed: 0,
        highestWinStreak: 0,
        prevGameXP: 0,
        winStreak5: 0,
        memberSince: "Dec 2024",
      };
  
      // Iterate over all users
      for (const docSnapshot of querySnapshot.docs) {
        const userData = docSnapshot.data();
        const userRef = doc(db, "users", docSnapshot.id);
  
        // Check if profile_detail exists and rename to profileDetail
        if (userData.profile_detail) {
          await updateDoc(userRef, {
            profileDetail: userData.profile_detail, // Rename field
          });
         
        }
  
        // If profileDetail doesn't exist, add the default profileDetail object
        if (!userData.profileDetail && !userData.profile_detail) {
          await updateDoc(userRef, {
            profileDetail: defaultProfileDetail,
          });
        }
      }
  
      console.log("Users collection updated successfully.");
    } catch (error) {
      console.error("Error updating users collection:", error);
    }
  }
  return (
    <LeagueContext.Provider
      value={{
        setShowMockData,
        showMockData,
        fetchLeagueById,
        leagueById,
        calculateParticipantTotals,
        getAllUsers,
        addLeagues,
        leagues,
        fetchLeagues,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
};

export { LeagueContext, LeagueProvider };
