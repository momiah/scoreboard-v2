import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Image,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
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

  const topPlayers = useMemo(() => sortedUsers.slice(0, 5), [sortedUsers]);

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
          <Image
            source={CourtChampLogo}
            style={{ width: 150, height: 150, resizeMode: "contain" }}
          />
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
          <Text style={{ color: "white" }}>
            Hello, {currentUser.firstName}{" "}
          </Text>
        ) : (
          <TouchableOpacity onPress={() => navigateTo("Login")}>
            <Text style={{ color: "white" }}>Sign In</Text>
          </TouchableOpacity>
        )}

        <SubHeader
          title="Leagues"
          onIconPress={addLeague}
          actionText="Browse Leagues"
          showIcon
          navigationRoute={"Leagues"}
        />

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

const { width: screenWidth } = Dimensions.get("window");

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
