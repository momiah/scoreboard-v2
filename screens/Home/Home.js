import React from "react";
import { Image, SafeAreaView } from "react-native";

import styled from "styled-components/native";
import { CourtChampLogo } from "../../assets";
import { Dimensions } from "react-native";
import HorizontalLeagueCarousel from "../../components/Leagues/HorizontalLeagueCarousel";
import TournamentGrid from "../../components/Tournaments/TournamentGrid";
import { tournaments } from "../../components/Tournaments/tournamentMocks";
import TopPlayers from "../../components/TopPlayersDisplay/TopPlayers";
import { topPlayers } from "../../components/TopPlayersDisplay/topPlayerMocks";
import SubHeader from "../../components/SubHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const Home = () => {
  const navigation = useNavigation();

  const handleIconPress = () => {
    console.log("Icon Pressed!");
  };

  const navigateTo = (route) => {
    if (route) {
      navigation.navigate(route);
    }
  };
  const checkUserToken = async () => {
    const token = await AsyncStorage.getItem("userToken");
    navigateTo(token ? "Leagues" : "Login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
      <HomeContainer>
        <Overview>
          <Image
            source={CourtChampLogo}
            style={{ width: 175, height: 175, resizeMode: "contain" }}
          />
        </Overview>

        <SubHeader
          title="Leagues"
          onIconPress={handleIconPress}
          actionText="Browse Leagues"
          showIcon
          navigationRoute={"Leagues"}
          checkUserToken={checkUserToken}
        />
        <HorizontalLeagueCarousel navigationRoute={"League"} />

        <SubHeader
          title="Top Players"
          onIconPress={handleIconPress}
          actionText="See All Players"
        />
        <TopPlayers topPlayers={topPlayers} />

        <SubHeader
          title="Tournaments"
          onIconPress={handleIconPress}
          actionText="Browse Tournaments"
          showIcon
        />
        <TournamentGrid tournaments={tournaments} />
      </HomeContainer>
    </SafeAreaView>
  );
};
const { width: screenWidth } = Dimensions.get("window");

const HomeContainer = styled.ScrollView({
  flex: 1,
  backgroundColor: "#00152B",
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

export default Home;
