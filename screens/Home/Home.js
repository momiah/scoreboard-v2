import React, { useContext, useState } from "react";
import { Text, TouchableOpacity, Image, SafeAreaView } from "react-native";

import styled from "styled-components/native";
import { CourtChampLogo } from "../../assets";
import { Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import LeagueCarousel from "../../components/Leagues/LeagueCarousel";
import TournamentGrid from "../../components/Tournaments/TournamentGrid";
import { leagues } from "../../components/Leagues/leagueMocks";
import { tournaments } from "../../components/Tournaments/tournamentMocks";
import TopPlayers from "../../components/TopPlayersDisplay/TopPlayers";
import { topPlayers } from "../../components/TopPlayersDisplay/topPlayerMocks";

const Home = () => {
  const navigation = useNavigation();

  const navigateToLeagues = () => {
    // Navigation logic to Leagues screen
    navigation.navigate("Leagues");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
      <HomeContainer>
        <Overview>
          <Image
            source={CourtChampLogo}
            style={{ width: 175, height: 175, resizeMode: "contain" }}
          />
          <TouchableOpacity onPress={navigateToLeagues}>
            <Text style={{ color: "white" }}>Click</Text>
          </TouchableOpacity>
        </Overview>
        <LeagueCarousel leagues={leagues} />
        <TopPlayers topPlayers={topPlayers} />
        <TournamentGrid tournaments={tournaments} />
      </HomeContainer>
    </SafeAreaView>
  );
};
const { width: screenWidth } = Dimensions.get("window");

const HomeContainer = styled.ScrollView({
  flex: 1,
  backgroundColor: "#00152B",
  // padding: 10,
  width: "100%",
});
const Overview = styled.View({
  flexDirection: "row",
  height: "100px",
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingRight: 15,
});
const Tabs = styled.View({
  width: "100%",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
});
const Tab = styled.TouchableOpacity(({ isSelected }) => ({
  border: "1px solid #ccc",
  padding: 10,
  borderRadius: 20,
  marginTop: 10,
  borderWidth: isSelected ? 2 : 1,
  borderStyle: "solid",
  borderColor: isSelected ? "#00A2FF" : "white",
}));

const TabText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

export default Home;
