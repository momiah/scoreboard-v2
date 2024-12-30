import React, { useState, useEffect, useContext } from "react";
import { Image, SafeAreaView, View, Text } from "react-native";
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
import { LeagueContext } from "../../context/LeagueContext";
import { Switch } from "react-native";
import { UserContext } from "../../context/UserContext";

const Home = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const { setShowMockData, showMockData } = useContext(LeagueContext);
  const {  Logout } = useContext(UserContext);

  useEffect(() => {
    const fetchUserToken = async () => {
      const token = await AsyncStorage.getItem("userToken");
      setUserToken(token);
    };
    Logout()

    fetchUserToken();
  }, []);

  const navigateTo = (route) => {
    if (route) {
      navigation.navigate(route);
    }
  };

  const checkUserToken = async () => {
    const token = await AsyncStorage.getItem("userToken");

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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 27,
          }}
        >
          <Text style={{ color: "white" }}>Set Mock Data </Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={showMockData ? "#00152B" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => setShowMockData(!showMockData)}
            value={showMockData}
            style={{
              transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
            }}
          />
        </View>

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
