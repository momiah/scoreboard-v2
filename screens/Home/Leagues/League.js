import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import { generatedLeagues } from "../../../components/Leagues/leagueMocks";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../../assets";
import Scoreboard from "../../../components/scoreboard/Scoreboard";

const League = () => {
  const route = useRoute();
  const { leagueId } = route.params; // Access the leagueId from the route params

  console.log("route🙂", route);
  console.log("leagueId🙂", leagueId);

  const [leagueDetails, setLeagueDetails] = useState(null);
  const [loading, setLoading] = useState(true); // Track loading state

  useEffect(() => {
    fetchLeagueDetails(leagueId);
  }, [leagueId]);

  const fetchLeagueDetails = (id) => {
    const fetchedDetails = generatedLeagues.find((league) => league.id === id);
    setLeagueDetails(fetchedDetails);
    setLoading(false); // Set loading to false once data is fetched
  };

  useEffect(() => {
    if (leagueDetails) {
      console.log(
        "leagueDetails🙂",
        JSON.stringify(leagueDetails.games, null, 2)
      );
    }
  }, [leagueDetails]);

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
          source={leagueDetails.image}
          style={{ width: "100%", height: "100%", resizeMode: "cover" }}
        />
      </Overview>

      <Scoreboard mockgames={leagueDetails.games} />
    </View>
  );
};

const Overview = styled.View({
  flexDirection: "row",
  height: 175,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingRight: 15,
});

export default League;
