import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Image,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Linking,
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
import { LeagueContext } from "../../context/LeagueContext";
import { Switch } from "react-native";
import { UserContext } from "../../context/UserContext";
import { AntDesign } from "@expo/vector-icons";
import {
  HorizontalLeagueCarouselSkeleton,
  TopPlayersSkeleton,
} from "../../components/Skeletons/HomeSkeleton";
import { handleSocialPress } from "../../helpers/handleSocialPress";
import Ionicons from "@expo/vector-icons/Ionicons";
import { socialMediaPlatforms, ICON_MAP } from "../../schemas/schema";
import AddTournamentModal from "../../components/Modals/AddTournamentModal";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedFontSize = screenWidth < 450 ? 13 : 16; // Adjust font size based on screen width
const platformPaddingTop = Platform.OS === "ios" ? 0 : 20; // Adjust padding for iOS

const Home = () => {
  const navigation = useNavigation();
  const [userToken, setUserToken] = useState(null);
  const {
    fetchUpcomingLeagues,
    upcomingLeagues,
    fetchUpcomingTournaments,
    upcomingTournaments,
    leagueNavigationId,
    tournamentNavigationId,
  } = useContext(LeagueContext);
  const { getAllUsers, rankSorting, currentUser, getLeaguesForUser } =
    useContext(UserContext);

  const [userLeagues, setUserLeagues] = useState([]);
  const [sortedUsers, setSortedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (leagueNavigationId) {
      navigation.navigate("League", { leagueId: leagueNavigationId });
    }
  }, [leagueNavigationId]);

  useEffect(() => {
    if (tournamentNavigationId) {
      navigation.navigate("Tournament", {
        tournamentId: tournamentNavigationId,
      });
    }
  }, [tournamentNavigationId]);

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

  const fetchUserLeagues = async () => {
    const userId = currentUser?.userId;
    if (!userId) return;

    try {
      const leagues = await getLeaguesForUser(userId);
      setUserLeagues(leagues);
    } catch (error) {
      console.error("Error fetching leagues:", error);
    }
  };

  useEffect(() => {
    fetchUserLeagues();
  }, [currentUser?.userId]);

  const navigateTo = (route) => {
    if (route) {
      navigation.navigate(route);
    }
  };

  const goToWebsite = () => {
    const url = "https://courtchamps.com/";
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url).catch((err) =>
        console.error("Failed to open URL:", err),
      );
    }
  };

  const topPlayers = useMemo(() => sortedUsers.slice(0, 5), [sortedUsers]);

  const publicLeagues = upcomingLeagues.filter((league) => {
    // Must be public
    if (league.privacy !== "Public") return false;

    // Exclude leagues where user is already a participant

    if (!currentUser) return true; // If not logged in, show all public leagues

    const userIsParticipant = league.leagueParticipants?.filter(
      (participant) => participant.userId === currentUser?.userId,
    );

    return userIsParticipant?.length === 0;
  });

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#00152B",
      }}
    >
      <HomeContainer
        contentContainerStyle={{
          paddingTop: platformPaddingTop,
          paddingBottom: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchUsers();
              fetchUpcomingLeagues();
              fetchUserLeagues();
              fetchUpcomingTournaments();
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
                {Platform.OS === "ios" ? (
                  <Ionicons
                    name={ICON_MAP[platform]}
                    size={25}
                    color="#00A2FF"
                  />
                ) : (
                  <>
                    <Text
                      style={{
                        color: "#00A2FF",
                        fontSize: screenAdjustedFontSize,
                      }}
                    >
                      {platform}
                    </Text>
                  </>
                )}
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
          actionText="Browse Leagues"
          navigationRoute={"Leagues"}
        />

        {loading ? (
          <HorizontalLeagueCarouselSkeleton />
        ) : (
          <HorizontalLeagueCarousel
            navigationRoute={"League"}
            leagues={publicLeagues}
          />
        )}

        <SubHeader
          title="Top Players"
          actionText="See All Players"
          navigationRoute={"AllPlayers"}
        />

        {loading ? (
          <TopPlayersSkeleton topPlayers={topPlayers} />
        ) : (
          <TopPlayers topPlayers={topPlayers} fetchUsers={fetchUsers} />
        )}
        {/* 
        <View style={{ height: 30 }} /> */}

        <SubHeader
          title="Tournaments"
          actionText="Browse Tournaments"
          navigationRoute={"Tournaments"}
        />

        <TournamentGrid
          tournaments={upcomingTournaments}
          navigationRoute={"Tournament"}
        />
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
  // marginTop: 10,
});

const SocialRow = styled.View({
  flexDirection: "row",
  gap: 10,
});

const SocialButton = styled(TouchableOpacity)({
  padding: 5,
});

export default Home;
