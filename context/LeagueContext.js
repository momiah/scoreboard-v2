// LeagueContext.js
import React, { createContext, useState, useEffect } from "react";
import { doc, setDoc, collection, getDocs, getDoc } from "firebase/firestore";

import { generatedLeagues } from "../components/Leagues/leagueMocks";

import { db } from "../services/firebase.config";

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

  return (
    <LeagueContext.Provider
      value={{
        setShowMockData,
        showMockData,
        fetchLeagueById,
        leagueById,

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
