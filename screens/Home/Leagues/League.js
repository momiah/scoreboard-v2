import React, { useEffect, useState, useContext } from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import { generatedLeagues } from "../../../components/Leagues/leagueMocks";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../../assets";
import { LinearGradient } from "expo-linear-gradient";
import Scoreboard from "../../../components/scoreboard/Scoreboard";
import PlayerPerformance from "../../../components/performance/Player/PlayerPerformance";
import TeamPerformance from "../../../components/performance/Team/TeamPerformance";
import Ionicons from "@expo/vector-icons/Ionicons";
import Tag from "../../../components/Tag";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../../context/LeagueContext";
import InvitePlayerModel from "../../../components/Models/InvitePlayerModel";
import { UserContext } from "../../../context/UserContext";

const League = () => {
  const route = useRoute();
  const { leagueId } = route.params;
  const { leagues } = useContext(LeagueContext);
  const { checkUserRole } = useContext(UserContext);

  const [leagueDetails, setLeagueDetails] = useState(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const [selectedTab, setSelectedTab] = useState("Scoreboard");
  const [modalVisible, setModalVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);

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

  const playersData = leagueDetails?.leagueParticipants;
  const leagueGames = leagueDetails?.games;

  const renderComponent = () => {
    switch (selectedTab) {
      case "Scoreboard":
        return <Scoreboard leagueGames={leagueGames} leagueId={leagueId} />;
      case "Player Performance":
        return (
          <PlayerPerformance playersData={playersData} leagueId={leagueId} />
        );
      case "Team Performance":
        return <TeamPerformance />;
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchLeagueDetails(leagueId);
  }, [leagueId]);

  const fetchLeagueDetails = (id) => {
    const fetchedDetails = leagues.find((league) => league.id === id);
    setLeagueDetails(fetchedDetails);
    setLoading(false); // Set loading to false once data is fetched
  };

  const leaguePrompt = async () => {
    setModalVisible(true);
    console.log("Invite players");
    // const token = await AsyncStorage.getItem("userToken");

    // if (token) {
    //   setModalVisible(true);
    // } else {
    //   navigateTo("Login");
    // }
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


  console.log(leagueDetails,'leagueDetails')

  async function getUserRole() {
    const role = await checkUserRole(leagueDetails);
    console.log('User Role:', role); 
    setUserRole(role)// Outputs "admin", "participant", or "invite user"
}

getUserRole();

  // console.log(userRole,'userRoleuserRole')

  return (
    <View style={{ flex: 1, backgroundColor: "#00152B" }}>
      <Overview>
        <LeagueImage source={leagueDetails.image}>
          <GradientOverlay
            colors={["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.9)"]}
            locations={[0.1, 1]}
          />
          <LeagueDetailsContainer>
            <LeagueName>{leagueDetails.leagueName}</LeagueName>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <LeagueLocation>
                {leagueDetails.centerName}, {leagueDetails.location}
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
            <Tag
              name={leagueDetails.leagueStatus.status}
              color={leagueDetails.leagueStatus.color}
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row" }}>
                <Tag name={leagueDetails.leagueType} />
                <Tag name={leagueDetails.prizeType} />
              </View>
              {/* Should be changed to Action button for users
                  If part of the league = "Participant"
                  If league admin = "Invite Players"
              */}
              {userRole === 'participant' &&
              <Tag
                name={"Participant"}
                color="#16181B"
                iconColor="green"
                iconSize={15}
                icon={"checkmark-circle-outline"}
                iconPosition={"right"}
                bold
              />}
               {userRole === 'admin' &&
              <Tag
                name={"Invite Players"}
                color="#00A2FF"
                icon={"paper-plane-sharp"}
                onPress={leaguePrompt}
                bold
              />}
            </View>
          </LeagueDetailsContainer>
        </LeagueImage>
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
  height: 175,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
});

const LeagueImage = styled.ImageBackground({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end", // Positions text at the bottom
  alignItems: "flex-start",
});

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
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
  paddingTop: 35,
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

export default League;
