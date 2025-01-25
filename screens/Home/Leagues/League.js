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
  const { leagues, fetchLeagueById } = useContext(LeagueContext);
  const { checkUserRole } = useContext(UserContext);

  const [leagueDetails, setLeagueDetails] = useState(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const [selectedTab, setSelectedTab] = useState("Scoreboard");
  const [modalVisible, setModalVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);

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
    {
      component: "Team Performance",
    },
  ];
  const leagueGames = leagueDetails?.games;

  const leagueStatus = calculateLeagueStatus(leagueDetails);

  const renderComponent = () => {
    switch (selectedTab) {
      case "Summary":
        return (
          <LeagueSummary
            leagueDetails={leagueDetails}
            setLeagueDetails={setLeagueDetails}
            userRole={userRole}
          />
        );
      case "Scoreboard":
        return (
          <Scoreboard leagueGames={leagueDetails?.games} leagueId={leagueId} />
        );
      case "Player Performance":
        return (
          <PlayerPerformance
            playersData={leagueDetails?.leagueParticipants}
            leagueId={leagueId}
          />
        );
      case "Team Performance":
        return <TeamPerformance />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (leagueId) {
      fetchLeagueDetails(leagueId);
    }
  }, [leagueId]);

  const fetchLeagueDetails = async (id) => {
    const fetchedDetails = await fetchLeagueById(id);
    setLeagueDetails(fetchedDetails);
    setLoading(false);
  };

  const leaguePrompt = async () => {
    setModalVisible(true);
    console.log("Invite players");
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

  async function getUserRole() {
    const role = await checkUserRole(leagueDetails);
    console.log("User Role:", role);
    setUserRole(role);
  }

  getUserRole();

  return (
    <View style={{ flex: 1, backgroundColor: "#00152B" }}>
      <Overview>
        <LeagueImage source={court2}>
          <GradientOverlay
            colors={["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.9)"]}
            locations={[0.1, 1]}
          />
          <LeagueDetailsContainer>
            <LeagueName>{leagueDetails?.leagueName}</LeagueName>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <LeagueLocation>
                {leagueDetails?.centerName}, {leagueDetails?.location}
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
            <Tag name={leagueStatus?.status} color={leagueStatus?.color} />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row" }}>
                <Tag name={leagueDetails?.leagueType} />
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
              onPress={() => setSelectedTab(tab.component)}
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
          leagueDetails={leagueDetails}
        />
      )}

      {/* <Scoreboard mockgames={leagueDetails.games} /> */}
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
