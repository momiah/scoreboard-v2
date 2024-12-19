import React, { useState, useEffect, useContext } from "react";
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
import AddLeagueModel from "../../components/scoreboard/AddLeague/AddLeagueModel";
import { GameContext } from "../../context/GameContext";

const Home = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const { setShowMockData, showMockData } = useContext(GameContext);

  useEffect(() => {
    const fetchUserToken = async () => {
      const token = await AsyncStorage.getItem("userToken");
      setUserToken(token);
      console.log("token", token);
    };

    fetchUserToken();
  }, []);

  const navigateTo = (route) => {
    if (route) {
      navigation.navigate(route);
    }
  };

  const checkUserToken = async () => {
    const token = await AsyncStorage.getItem("userToken");
    console.log("token", token);
    if (token) {
      setModalVisible(true);
    } else {
      navigateTo("Login");
    }
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

        {/* Set mocks */}
        <SubHeader
          title="Set Mocks"
          onIconPress={() => setShowMockData(!showMockData)}
          showIcon
          iconName="settings"
        />

        <SubHeader
          title="Leagues"
          onIconPress={checkUserToken}
          actionText="Browse Leagues"
          showIcon
          navigationRoute={"Leagues"}
        />
        <HorizontalLeagueCarousel navigationRoute={"League"} />

        <SubHeader
          title="Top Players"
          onIconPress={() => navigateTo("Players")}
          actionText="See All Players"
        />
        <TopPlayers topPlayers={topPlayers} />

        <SubHeader
          title="Tournaments"
          onIconPress={() => navigateTo("Players")}
          actionText="Browse Tournaments"
          showIcon
        />
        <TournamentGrid tournaments={tournaments} />

        {modalVisible && (
          <AddLeagueModel
            modalVisible={modalVisible}
            setModalVisible={setModalVisible}
          />
        )}
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
