import React, { useContext, useState } from "react";
import { View, Text, Touchable, TouchableOpacity } from "react-native";
import Scoreboard from "./scoreboard/Scoreboard";
import PlayerPerformance from "./PlayerPerformance";
import TeamPerformance from "./TeamPerformance";
import styled from "styled-components/native";

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
  return (
    <HomeContainer>
      <Overview></Overview>
      <Tabs>
        {tabs.map((tab) => (
          <Tab
            key={tab.component}
            onPress={() => setSelectedTab(tab.component)}
          >
            <Text>{tab.component}</Text>
          </Tab>
        ))}
      </Tabs>
      {renderComponent()}
    </HomeContainer>
  );
};

const HomeContainer = styled.View({
  flex: 1,
  padding: 10,
  width: "100%",
});
const Overview = styled.View({
  border: "1px solid red",
  height: "100px",
  width: "100%",
});
const Tabs = styled.View({
  width: "100%",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});
const Tab = styled.TouchableOpacity({
  border: "1px solid #ccc",
  padding: 10,
  borderRadius: 20,
  marginTop: 20,
  // height: "100px",
});

export default Home;
