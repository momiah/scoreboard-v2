import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import { leagues } from "../../../components/Leagues/leagueMocks";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../../assets";
import Scoreboard from "../../../components/scoreboard/Scoreboard";

const League = () => {
  const route = useRoute();
  const { leagueId } = route.params; // Access the leagueId from the route params

  const [leagueDetails, setLeagueDetails] = useState(null);
  const [loading, setLoading] = useState(true); // Track loading state

  useEffect(() => {
    fetchLeagueDetails(leagueId);
  }, [leagueId]);

  const fetchLeagueDetails = (id) => {
    const fetchedDetails = leagues.find((league) => league.id === id);
    setLeagueDetails(fetchedDetails);
    setLoading(false); // Set loading to false once data is fetched
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#00152B",
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#00152B" }}>
      <Overview>
        <Image
          source={CourtChampLogo}
          style={{ width: 175, height: 175, resizeMode: "contain" }}
        />
      </Overview>
      <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
        {leagueDetails.name}
      </Text>
      <Scoreboard />
    </View>
  );
};

const Overview = styled.View({
  flexDirection: "row",
  height: 100,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingRight: 15,
});

export default League;
