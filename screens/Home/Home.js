import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Image,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../assets";
import { Dimensions } from "react-native";
import HorizontalLeagueCarousel from "../../components/Leagues/HorizontalLeagueCarousel";
import TournamentGrid from "../../components/Tournaments/TournamentGrid";
import { tournaments } from "../../components/Tournaments/tournamentMocks";
import TopPlayers from "../../components/TopPlayersDisplay/TopPlayers";
import SubHeader from "../../components/SubHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import AddLeagueModel from "../../components/Modals/AddLeagueModal";
import { LeagueContext } from "../../context/LeagueContext";
import { Switch } from "react-native";
import { UserContext } from "../../context/UserContext";
import {
  HorizontalLeagueCarouselSkeleton,
  TopPlayersSkeleton,
} from "../../components/Skeletons/HomeSkeleton";
import { handleSocialPress } from "../../helpers/handleSocialPress";
import Ionicons from "@expo/vector-icons/Ionicons";
import { socialMediaPlatforms, ICON_MAP } from "../../schemas/schema";
import { resetLeagueParticipantStats } from "../../devFunctions/resetLeagueParticipantStats";
import { resetUsersProfileDetails } from "../../devFunctions/resetUsersProfileDetails";
import {
  bulkAddApprovedGames,
  leagueGames,
} from "../../devFunctions/bulkAddApprovedGames";

const Home = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const { fetchUpcomingLeagues } = useContext(LeagueContext);
  const { getAllUsers, rankSorting, currentUser } = useContext(UserContext);

  const [sortedUsers, setSortedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserToken = async () => {
      const token = await AsyncStorage.getItem("userToken");
      setUserToken(token);
    };
    fetchUserToken();
  }, []);

  const fetchUsers = async () => {
    try {
      if (!refreshing) setLoading(true);
      const users = await getAllUsers();
      const sorted = rankSorting(users).map((user, index) => ({
        ...user,
        globalRank: index + 1,
      }));
      setSortedUsers(sorted);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const navigateTo = (route) => {
    if (route) {
      navigation.navigate(route);
    }
  };

  const addLeague = async () => {
    if (userToken && currentUser) {
      setModalVisible(true);
    } else {
      navigateTo("Login");
    }
  };

  const goToWebsite = () => {
    const url = "https://courtchamps.com/";
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url).catch((err) =>
        console.error("Failed to open URL:", err)
      );
    }
  };

  const topPlayers = useMemo(() => sortedUsers.slice(0, 5), [sortedUsers]);

  const usersToReset = [
    "Hussain",
    "AnisZaman", // Anis,
    "Bokul",
    "Yasin",
    "ProLikeMo", //Mohsin
    "MaxHoque", // Max,
    "Babu",
    "R4YY4NH", // Rayyan,
    "Gesh",
    "Komal", // Doc
    "Saiful",
    "Raqeeb",
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
      <HomeContainer
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchUsers();
              fetchUpcomingLeagues();
            }}
            tintColor="white" // iOS
            colors={["white"]} // Android
            progressBackgroundColor="#00A2FF"
          />
        }
      >
        <Overview>
          <TouchableOpacity onPress={goToWebsite}>
            <Image
              source={CourtChampLogo}
              style={{ width: 150, height: 150, resizeMode: "contain" }}
            />
          </TouchableOpacity>
          <SocialRow>
            {socialMediaPlatforms?.map((platform) => (
              <SocialButton
                key={platform}
                onPress={() => handleSocialPress(platform)}
              >
                <Ionicons name={ICON_MAP[platform]} size={25} color="#00A2FF" />
              </SocialButton>
            ))}
          </SocialRow>
        </Overview>

        {currentUser ? (
          <Text style={{ color: "white", marginVertical: 10 }}>
            Hello, {currentUser?.firstName}{" "}
          </Text>
        ) : (
          <TouchableOpacity onPress={() => navigateTo("Login")}>
            <Text style={{ color: "white" }}>Sign In</Text>
          </TouchableOpacity>
        )}

        <SubHeader
          title="Upcoming Leagues"
          onIconPress={addLeague}
          actionText="Browse Leagues"
          showIcon
          navigationRoute={"Leagues"}
        />

        {/* <SubHeader
          title="Reset User Profile Details"
          onIconPress={() => resetUsersProfileDetails(usersToReset)}
          showIcon
          iconName="refresh"
        />

        <SubHeader
          title="Reset League Participant Stats"
          onIconPress={() =>
            resetLeagueParticipantStats(
              usersToReset,
              "Enfield-Doubles-16-06-2025-WPD51"
            )
          }
          showIcon
          iconName="refresh"
        />

        <SubHeader
          title="Bulk Add League Games"
          onIconPress={() =>
            bulkAddApprovedGames(
              leagueGames,
              "Enfield-Doubles-16-06-2025-WPD51"
            )
          }
          showIcon
          iconName="add"
        /> */}

        {loading ? (
          <HorizontalLeagueCarouselSkeleton />
        ) : (
          <HorizontalLeagueCarousel navigationRoute={"League"} />
        )}

        <SubHeader
          title="Top Players"
          actionText="See All Players"
          navigationRoute={"AllPlayers"}
        />
        {loading ? (
          <TopPlayersSkeleton topPlayers={topPlayers} />
        ) : (
          <>
            <TopPlayers topPlayers={topPlayers} fetchUsers={fetchUsers} />
          </>
        )}

        {/* <SubHeader
          title="Tournaments"
          onIconPress={() => navigateTo("Players")}
          actionText="Browse Tournaments"
          showIcon
        />
        <TournamentGrid tournaments={tournaments} /> */}

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

const HomeContainer = styled.ScrollView({
  flex: 1,
  backgroundColor: " rgb(3, 16, 31)",
  width: "100%",
  paddingHorizontal: 20,
});
const Overview = styled.View({
  flexDirection: "row",
  height: "100px",
  width: "100%",
  justifyContent: "space-between",
  alignItems: "center",
  paddingRight: 15,
  marginTop: 10,
});

const SocialRow = styled.View({
  flexDirection: "row",
  gap: 10,
});

const SocialButton = styled(TouchableOpacity)({
  padding: 5,
});

export default Home;

{
  /* Set mocks */
}
{
  /* <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            // paddingLeft: 27,
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
        </View> */
}
