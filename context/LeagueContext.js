// LeagueContext.js
import React, { createContext, useState, useEffect } from "react";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";

import { generatedLeagues } from "../components/Leagues/leagueMocks";

import { db } from "../services/firebase.config";

const LeagueContext = createContext();

const LeagueProvider = ({ children }) => {
  const [leagues, setLeagues] = useState([]);
  const [showMockData, setShowMockData] = useState(false);

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

  return (
    <LeagueContext.Provider
      value={{
        setShowMockData,
        showMockData,

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
