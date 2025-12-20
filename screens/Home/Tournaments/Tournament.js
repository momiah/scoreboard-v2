import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Linking,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { COMPETITION_TYPES } from "../../../schemas/schema";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import LeagueSummary from "../../../components/Summary/LeagueSummary";
import Scoreboard from "../../../components/scoreboard/Scoreboard";
import PlayerPerformance from "../../../components/performance/Player/PlayerPerformance";
import TeamPerformance from "../../../components/performance/Team/TeamPerformance";
import Tag from "../../../components/Tag";
import InvitePlayerModel from "../../../components/Modals/InvitePlayerModal";
import UserRoleTag from "../../../components/UserRoleTag";

import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import { calculateCompetitionStatus } from "../../../helpers/calculateCompetitionStatus";
import Fixtures from "../../../components/Tournaments/Fixtures/Fixtures";

import { ccDefaultImage } from "../../../mockImages/index";
import ChatRoom from "../../../components/ChatRoom/ChatRoom";

const openMap = (location) => {
  const query = `${location.courtName}, ${location.address}, ${location.city} ${location.postCode}, ${location.country}`;
  const encoded = encodeURIComponent(query);
  const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  Linking.openURL(url).catch((err) =>
    console.error("Error opening Google Maps web:", err)
  );
};

const Tournament = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { tournamentId, tab } = route.params;

  const { fetchCompetitionById, tournamentById, requestToJoinLeague } =
    useContext(LeagueContext);
  const { checkUserRole, currentUser } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(tab || "Summary");
  const [invitePlayerModalVisible, setInvitePlayerModalVisible] =
    useState(false);
  const [userRole, setUserRole] = useState(null);
  const [tournamentNotFound, setTournamentNotFound] = useState(false);
  const [isJoinRequestSending, setIsJoinRequestSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (tournamentId) {
        try {
          const fetchedTournament = await fetchCompetitionById({
            competitionId: tournamentId,
            competitionType: COMPETITION_TYPES.TOURNAMENT,
          });
          if (!fetchedTournament) {
            setTournamentNotFound(true);
          } else {
            setTournamentNotFound(false);
            await getUserRole(fetchedTournament);
          }
        } catch (error) {
          console.error("Error fetching league data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [tournamentId, currentUser]);

  const getUserRole = async (tournamentData) => {
    try {
      const role = await checkUserRole({
        competitionData: tournamentData,
        competitionType: COMPETITION_TYPES.TOURNAMENT,
      });
      setUserRole(role);
    } catch (error) {
      console.error("Error getting user role:", error);
      setUserRole("hide");
    }
  };

  const handleNavigate = () => {
    navigation.navigate("LeagueSettings", { tournamentId, tournamentById });
  };

  const handleOpenInviteModal = () => {
    setInvitePlayerModalVisible(true);
  };

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  const handleRequestToJoin = async () => {
    try {
      setIsJoinRequestSending(true);
      await requestToJoinLeague(
        tournamentId,
        currentUser?.userId,
        tournamentById?.leagueOwner?.userId,
        currentUser?.username
      );
      const refetchedTournament = await fetchCompetitionById({
        competitionId: tournamentId,
        competitionType: COMPETITION_TYPES.TOURNAMENT,
      });
      await getUserRole(refetchedTournament);
    } catch (error) {
      console.error("Error sending join request:", error);
    } finally {
      // Once backend marks requestPending, role shifts and both CTAs disable anyway.
      setIsJoinRequestSending(false);
    }
  };

  const handleTabPress = async (tabName) => {
    setSelectedTab(tabName);
    try {
      const refetchedTournament = await fetchCompetitionById({
        competitionId: tournamentId,
        competitionType: COMPETITION_TYPES.TOURNAMENT,
      });
      await getUserRole(refetchedTournament);
    } catch (error) {
      console.error("Tab refresh error:", error);
    }
  };

  const tabs = [
    { component: "Chat Room" },
    { component: "Summary" },
    { component: "Scoreboard" },
    { component: "Player Performance" },
    { component: "Fixtures" },
    ...(tournamentById?.tournamentType !== "Singles"
      ? [{ component: "Team Performance" }]
      : []),
  ];

  const tournamentStatus = calculateCompetitionStatus(tournamentById);
  const {
    tournamentParticipants,
    tournamentTeams,
    tournamentName,
    tournamentImage,
    location,
    startDate,
    endDate,
    tournamentType,
    maxPlayers,
    games,
  } = tournamentById || {};

  const numberOfPlayers = `${tournamentParticipants?.length} / ${maxPlayers}`;

  const renderComponent = () => {
    switch (selectedTab) {
      case "Chat Room":
        return (
          <ChatRoom
            competitionId={tournamentId}
            userRole={userRole}
            competitionParticipants={tournamentParticipants}
            competitionName={tournamentName}
            endDate={endDate}
            competitionType={COMPETITION_TYPES.TOURNAMENT}
          />
        );
      case "Summary":
        return (
          <LeagueSummary
            competitionDetails={tournamentById}
            userRole={userRole}
            startDate={startDate}
            endDate={endDate}
            competitionType={COMPETITION_TYPES.TOURNAMENT}
          />
        );
      case "Fixtures":
        return <Fixtures tournament={tournamentById} userRole={userRole} />;
      case "Scoreboard":
        return (
          <Scoreboard
            leagueGames={games || []}
            leagueType={tournamentType}
            leagueId={tournamentId}
            userRole={userRole}
            leagueStartDate={startDate}
            leagueEndDate={endDate}
            leagueOwner={tournamentById?.tournamentOwner}
            leagueName={tournamentName}
            leagueParticipants={tournamentParticipants || []}
            maxPlayers={maxPlayers}
            isJoinRequestSending={isJoinRequestSending}
          />
        );
      case "Player Performance":
        return <PlayerPerformance playersData={tournamentParticipants} />;
      case "Team Performance":
        return <TeamPerformance leagueTeams={tournamentTeams} />;
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

  if (!tournamentById || tournamentNotFound) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgb(3, 16, 31)",
        }}
      >
        <Text style={{ color: "#aaa", textAlign: "center" }}>
          Tournament not found.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#00152B" }}>
      <Overview>
        <LeagueImage
          source={tournamentImage ? { uri: tournamentImage } : ccDefaultImage}
        >
          <GradientOverlay
            colors={["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.7)"]}
            locations={[0.1, 1]}
          />
          <LeagueDetailsContainer>
            {userRole === "admin" && (
              <EditButton onPress={handleNavigate}>
                <Ionicons name="menu" size={25} color="white" />
              </EditButton>
            )}

            <View
              style={{
                padding: 5,
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                borderRadius: 5,
                alignSelf: "flex-start",
              }}
            >
              <LeagueName>{tournamentName}</LeagueName>
            </View>

            {location ? (
              <Address onPress={() => openMap(location)}>
                <LeagueLocation>
                  {location.courtName}, {location.city}
                </LeagueLocation>
                <Ionicons name="open-outline" size={20} color="#00A2FF" />
              </Address>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", gap: 5 }}>
                <Tag
                  name={tournamentStatus?.status}
                  color={tournamentStatus?.color}
                />
                <Tag
                  name={numberOfPlayers}
                  color={"rgba(0, 0, 0, 0.7)"}
                  iconColor={"#00A2FF"}
                  iconSize={15}
                  icon={"person"}
                  iconPosition={"right"}
                  bold
                />
              </View>
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
                <Tag name={tournamentType} />
                <Tag name="TROPHY" />
              </View>

              <UserRoleTag
                userRole={userRole}
                onInvitePress={handleOpenInviteModal}
                onLoginPress={handleLogin}
                onRequestJoinPress={handleRequestToJoin}
                isJoining={isJoinRequestSending}
              />
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
          horizontal
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

      {invitePlayerModalVisible && (
        <InvitePlayerModel
          modalVisible={invitePlayerModalVisible}
          setModalVisible={setInvitePlayerModalVisible}
          leagueDetails={tournamentById}
        />
      )}
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const Overview = styled.View({
  flexDirection: "row",
  height: 200,
  width: "100%",
  justifyContent: "center",
  alignItems: "flex-start",
  position: "relative",
});

const LeagueImage = styled.ImageBackground.attrs({
  imageStyle: {
    resizeMode: "cover",
  },
})({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end",
  alignItems: "center",
});

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: -60,
});

const LeagueDetailsContainer = styled.View({
  width: "100%",
  height: "100%",
  paddingLeft: 15,
  paddingRight: 15,
  justifyContent: "center",
});

const LeagueName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

const Address = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 15,
  gap: 5,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
  alignSelf: "flex-start",
});

const LeagueLocation = styled.Text({
  fontSize: 13,
  padding: 5,
  color: "white",
});

const EditButton = styled.TouchableOpacity({
  borderRadius: 5,
  alignSelf: "flex-end",
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
  marginHorizontal: 5,
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 20,
  borderWidth: isSelected ? 2 : 1,
  borderColor: isSelected ? "#00A2FF" : "white",
}));

const TabText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

export default Tournament;
