import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import { generatedLeagues } from "../../../components/Leagues/leagueMocks";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../../assets";
import { LinearGradient } from "expo-linear-gradient";
import Scoreboard from "../../../components/scoreboard/Scoreboard";
import Ionicons from "@expo/vector-icons/Ionicons";
import Tag from "../../../components/Tag";

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
        JSON.stringify(leagueDetails.leagueStatus.status, null, 2)
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
        <LeagueImage source={leagueDetails.image}>
          <GradientOverlay
            colors={["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.9)"]}
            locations={[0.1, 1]}
          />
          <LeagueDetailsContainer>
            <LeagueName>{leagueDetails.name}</LeagueName>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <LeagueLocation>
                {leagueDetails.centerName}, {leagueDetails.location}
              </LeagueLocation>
              <Ionicons
                name={"location"}
                size={15}
                color={"#286EFA"}
                backgroundColor={"rgba(0, 0, 0, 0.3)"}
                padding={5}
                borderRadius={15}
              />
            </View>
            <Tag
              name={leagueDetails.leagueStatus.status}
              color={leagueDetails.leagueStatus.color}
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row" }}>
                <Tag name={leagueDetails.leagueType} />
                <Tag name={leagueDetails.prizeType} />
              </View>
              {/* Should be changed to Action button for users
                  If part of the league = "Participant"
                  If not part of the league = "Request to Join"
              */}
              <Tag name={leagueDetails.leagueType} />
            </View>
          </LeagueDetailsContainer>
        </LeagueImage>
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
});

const LeagueImage = styled.ImageBackground({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end", // Positions text at the bottom
  alignItems: "flex-start",
});

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
});

const LeagueName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
  padding: 5,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
  alignSelf: "flex-start",
});

const LeagueLocation = styled.Text({
  fontSize: 13,
  padding: 5,
  color: "white",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
});

const LeagueDetailsContainer = styled.View({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden", // Ensures image respects border radius
  paddingLeft: 15,
  paddingRight: 15,
  paddingTop: 35,
});

export default League;
