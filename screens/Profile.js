import React, { useContext, useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { UserContext } from "../context/UserContext";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import CourtChampsLogo from "../assets/court-champ-logo-icon.png";
import { Dimensions } from "react-native";
import MedalDisplay from "../components/performance/MedalDisplay";

import { GameContext } from "../context/GameContext";

const Profile = () => {
  const [selectedTab, setSelectedTab] = useState("Scoreboard");
  const { medalNames } = useContext(GameContext);
  const [playerProfile, setPlayerProfile] = useState(null);
  const { calculateParticipantTotals } = useContext(UserContext);

  useEffect(() => {
    const fetchProfile = async () => {
      const totals = await calculateParticipantTotals();
      setPlayerProfile(totals);
    };
    fetchProfile();
  }, [calculateParticipantTotals]);

  const tabs = [
    {
      component: "Profile",
    },
    {
      component: "Performance",
    },
    {
      component: "Game Log",
    },
  ];

  const renderComponent = () => {
    switch (selectedTab) {
      case "Summary":
        return <Text>Performance</Text>;
      case "Scoreboard":
        return <Text>Log</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "rgb(3,16,31)" }}>
      <Overview>
        <PlayerDetail>
          <Avatar source={CourtChampsLogo} />
          <View style={{ gap: 2 }}>
            <PlayerName>Player</PlayerName>
            <Text
              style={{
                color: "#aaa",
                fontSize: screenWidth <= 400 ? 12 : 14,
              }}
            >
              Member since June
            </Text>
            <Text
              style={{
                color: "#aaa",
                fontSize: screenWidth <= 400 ? 12 : 14,
              }}
            >
              Last Active Today
            </Text>
            <Text
              style={{
                color: "#aaa",
                fontSize: screenWidth <= 400 ? 12 : 14,
              }}
            >
              Global Rank: #1
            </Text>
            <Text
              style={{
                color: "#aaa",
                fontSize: screenWidth <= 400 ? 12 : 14,
                padding: 5,
                backgroundColor: "rgb(40, 40, 40)",
                borderRadius: 5,
                border: "1px solid rgb(255, 255, 255)",
                alignSelf: "flex-start",
              }}
            >
              3600 XP
            </Text>
          </View>
        </PlayerDetail>
        <MedalContainer>
          <MedalDisplay xp={300} size={75} />
          <Text style={{ color: "white", marginTop: 10, fontSize: 12 }}>
            {medalNames(300)}
          </Text>
        </MedalContainer>
      </Overview>
      <TabsContainer>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.component}
              onPress={() => {
                setSelectedTab(tab.component);
              }}
              isSelected={selectedTab === tab.component}
            >
              <TabText>{tab.component}</TabText>
            </Tab>
          ))}
        </ScrollView>
      </TabsContainer>

      {renderComponent()}
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const Overview = styled.View({
  padding: 20,
  flexDirection: "row",
  // height: 180,
  width: "100%",
  justifyContent: "space-between",
  alignItems: "center",
});

const TabsContainer = styled.View({
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  paddingTop: 25,
  paddingBottom: 10,
});

const Tab = styled.TouchableOpacity(({ isSelected }) => ({
  marginHorizontal: 5, // Add spacing between tabs
  paddingHorizontal: 50, // Add padding inside the tabs
  paddingVertical: 10,
  borderRadius: 20,
  borderWidth: isSelected ? 2 : 1,
  borderColor: isSelected ? "#00A2FF" : "white",
}));

const TabText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

const Avatar = styled.Image({
  width: 70,
  height: 70,
  borderRadius: 35,
  borderWidth: 2,
  borderColor: "#00A2FF",
  marginBottom: 5,
});
const PlayerDetail = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  // borderBottomColor: "#262626",
  // borderBottomWidth: 1,
});

const MedalContainer = styled.View({
  flexDirection: "column",
  alignItems: "center",
});

const PlayerName = styled.Text({
  fontSize: 25,
  color: "white",
  fontWeight: "bold",
});

export default Profile;
