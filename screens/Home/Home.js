import React from "react";
import { Image, SafeAreaView } from "react-native";

import styled from "styled-components/native";
import { CourtChampLogo } from "../../assets";
import { Dimensions } from "react-native";
import LeagueCarousel from "../../components/Leagues/LeagueCarousel";
import TournamentGrid from "../../components/Tournaments/TournamentGrid";
import { leagues } from "../../components/Leagues/leagueMocks";
import { tournaments } from "../../components/Tournaments/tournamentMocks";
import TopPlayers from "../../components/TopPlayersDisplay/TopPlayers";
import { topPlayers } from "../../components/TopPlayersDisplay/topPlayerMocks";
import SubHeader from "../../components/SubHeader";

const Home = () => {
  const handleIconPress = () => {
    console.log("Icon Pressed!");
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
        />
        <LeagueCarousel leagues={leagues} />

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
