import React, { useContext, useState } from "react";
import {
  View,
  Text,
  Touchable,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from "react-native";
import Scoreboard from "../../components/scoreboard/Scoreboard";
import PlayerPerformance from "../../components/performance/Player/PlayerPerformance";
import TeamPerformance from "../../components/performance/Team/TeamPerformance";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../assets";
import { Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";

const Home = () => {
  const [selectedTab, setSelectedTab] = useState("Scoreboard");

  const tabs = [
    {
      component: "Scoreboard",
    },
    {
      component: "Player Performance",
    },
    {
      component: "Team Performance",
    },
  ];

  const renderComponent = () => {
    switch (selectedTab) {
      case "Scoreboard":
        return <Scoreboard />;
      case "Player Performance":
        return <PlayerPerformance />;
      case "Team Performance":
        return <TeamPerformance />;
      default:
        return null;
    }
  };
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
        <Tabs>
          {tabs.map((tab) => (
            <Tab
              key={tab.component}
              onPress={() => setSelectedTab(tab.component)}
              isSelected={selectedTab === tab.component}
            >
              <TabText>{tab.component}</TabText>
            </Tab>
          ))}
        </Tabs>
        {renderComponent()}
      </HomeContainer>
    </SafeAreaView>
  );
};
const { width: screenWidth } = Dimensions.get("window");

const HomeContainer = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
  // padding: 10,
  width: "100%",
});
const Overview = styled.View({
  // border: "1px solid red",
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
