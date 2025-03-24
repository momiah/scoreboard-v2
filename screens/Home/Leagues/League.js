import React, { useEffect, useState, useContext } from "react";
import { View, Text, Image, ActivityIndicator, ScrollView } from "react-native";
import { useRoute } from "@react-navigation/native";
import { generatedLeagues } from "../../../components/Leagues/leagueMocks";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../../assets";
import { LinearGradient } from "expo-linear-gradient";
import LeagueSummary from "../../../components/Summary/LeagueSummary";
import Scoreboard from "../../../components/scoreboard/Scoreboard";
import PlayerPerformance from "../../../components/performance/Player/PlayerPerformance";
import TeamPerformance from "../../../components/performance/Team/TeamPerformance";
import Ionicons from "@expo/vector-icons/Ionicons";
import Tag from "../../../components/Tag";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../../context/LeagueContext";
import InvitePlayerModel from "../../../components/Modals/InvitePlayerModal";
import { UserContext } from "../../../context/UserContext";
import { court2 } from "../../../mockImages";
import { calculateLeagueStatus } from "../../../functions/calculateLeagueStatus";

const League = () => {
  const route = useRoute();
  const { leagueId } = route.params;
  const { fetchLeagueById, leagueById } = useContext(LeagueContext);
  const { checkUserRole } = useContext(UserContext);

  const [loading, setLoading] = useState(true); // Track loading state
  const [selectedTab, setSelectedTab] = useState("Scoreboard");
  const [modalVisible, setModalVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (leagueId) {
        try {
          const fetchedDetails = await fetchLeagueById(leagueId);
          await getUserRole(fetchedDetails);
        } catch (error) {
          console.error("Error fetching league data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [leagueId]);

  const getUserRole = async (leagueData) => {
    try {
      const role = await checkUserRole(leagueData);
      setUserRole(role);
    } catch (error) {
      console.error("Error getting user role:", error);
      setUserRole("hide");
    }
  };

  const leaguePrompt = async () => {
    setModalVisible(true);
  };

  const handleTabPress = async (tabName) => {
    setSelectedTab(tabName);
    try {
      const freshData = await fetchLeagueById(leagueId);
      await getUserRole(freshData);
    } catch (error) {
      console.error("Tab refresh error:", error);
    }
  };

  const tabs = [
    {
      component: "Summary",
    },
    {
      component: "Scoreboard",
    },
    {
      component: "Player Performance",
    },
    ...(leagueById?.leagueType !== "Singles"
      ? [
          {
            component: "Team Performance",
          },
        ]
      : []),
  ];

  const leagueGames = leagueById?.games;
  const leagueType = leagueById?.leagueType;
  const startDate = leagueById?.startDate;
  const endDate = leagueById?.endDate;

  const maxPlayers = leagueById?.maxPlayers;
  const leagueParticipantsLength = leagueById?.leagueParticipants.length;
  const participants = leagueById?.leagueParticipants;
  const teams = leagueById?.leagueTeams;

  const leagueStatus = calculateLeagueStatus(leagueById);

  const renderComponent = () => {
    switch (selectedTab) {
      case "Summary":
        return (
          <LeagueSummary
            leagueDetails={leagueById}
            userRole={userRole}
            startDate={startDate}
            endDate={endDate}
          />
        );
      case "Scoreboard":
        return (
          <Scoreboard
            leagueGames={leagueGames || []}
            leagueType={leagueType}
            leagueId={leagueId}
            userRole={userRole}
            leagueStartDate={startDate}
            leagueEndDate={endDate}
          />
        );
      case "Player Performance":
        return <PlayerPerformance playersData={participants} />;
      case "Team Performance":
        return <TeamPerformance leagueTeams={teams} />;
      default:
        return null;
    }
  };

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
        <LeagueImage source={court2}>
          <GradientOverlay
            colors={["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.9)"]}
            locations={[0.1, 1]}
          />
          <LeagueDetailsContainer>
            <NumberOfPlayers>
              <Text
                style={{
                  color: "white",
                  fontSize: 12,
                }}
              >
                {leagueParticipantsLength} / {maxPlayers}
              </Text>
              <Ionicons name="person" size={15} color={"#00A2FF"} />
            </NumberOfPlayers>

            <LeagueName>{leagueById?.leagueName}</LeagueName>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <LeagueLocation>
                {leagueById?.centerName}, {leagueById?.location}
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Tag name={leagueStatus?.status} color={leagueStatus?.color} />
              {userRole === "admin" && (
                <Tag
                  name={"Admin"}
                  color="#16181B"
                  iconColor="#00A2FF"
                  iconSize={15}
                  icon={"checkmark-circle-outline"}
                  iconPosition={"right"}
                  bold
                />
              )}
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 5,
              }}
            >
              <View style={{ flexDirection: "row", gap: 5 }}>
                <Tag name={leagueType} />
                <Tag name="TROPHY" />
              </View>

              {userRole === "participant" && (
                <Tag
                  name={"Participant"}
                  color="#16181B"
                  iconColor="green"
                  iconSize={15}
                  icon={"checkmark-circle-outline"}
                  iconPosition={"right"}
                  bold
                />
              )}
              {userRole === "admin" && (
                <Tag
                  name={"Invite Players"}
                  color="#00A2FF"
                  icon={"paper-plane-sharp"}
                  onPress={leaguePrompt}
                  bold
                />
              )}
            </View>
          </LeagueDetailsContainer>
        </LeagueImage>
      </Overview>
      <TabsContainer>
        <GradientOverlay
          colors={["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.4)"]}
          locations={[0.1, 1]}
          style={{ bottom: -560 }}
        />
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10 }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.component}
              onPress={() => handleTabPress(tab.component)}
              isSelected={selectedTab === tab.component}
            >
              <TabText>{tab.component}</TabText>
            </Tab>
          ))}
        </ScrollView>
      </TabsContainer>

      {renderComponent()}

      {modalVisible && (
        <InvitePlayerModel
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          leagueDetails={leagueById}
        />
      )}
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const Overview = styled.View({
  flexDirection: "row",
  height: 180,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
});
const NumberOfPlayers = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  padding: 5,
  borderRadius: 5,
  position: "absolute",
  right: 15,
  top: 15,
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
});

const LeagueImage = styled.ImageBackground({
  width: "100%",
  height: "110%",
  justifyContent: "flex-end", // Positions text at the bottom
  alignItems: "flex-start",
});

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: -60,
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
  paddingTop: 45,
});

const TabsContainer = styled.View({
  width: "100%",
  backgroundColor: "#00152B",
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  paddingTop: 25,
  paddingBottom: 10,
});

const Tab = styled.TouchableOpacity(({ isSelected }) => ({
  marginHorizontal: 5, // Add spacing between tabs
  paddingHorizontal: 20, // Add padding inside the tabs
  paddingVertical: 10,
  borderRadius: 20,
  borderWidth: isSelected ? 2 : 1,
  borderColor: isSelected ? "#00A2FF" : "white",
}));

const TabText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

export default League;

{
  /* <View style={{ flexDirection: "column", gap: 5 }}>
<Tag
  name={"Admin"}
  color="#16181B"
  iconColor="#00A2FF"
  iconSize={15}
  icon={"checkmark-circle-outline"}
  iconPosition={"right"}
  bold
/>
<Tag
  name={"Invite Players"}
  color="#00A2FF"
  icon={"paper-plane-sharp"}
  onPress={leaguePrompt}
  bold
/>
</View> */
}
