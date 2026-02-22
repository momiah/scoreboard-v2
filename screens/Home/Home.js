import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Linking,
} from "react-native";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../assets";

import HorizontalLeagueCarousel from "../../components/Leagues/HorizontalLeagueCarousel";
import TournamentGrid from "../../components/Tournaments/TournamentGrid";

import TopPlayers from "../../components/TopPlayersDisplay/TopPlayers";
import SubHeader from "../../components/SubHeader";

import { useNavigation } from "@react-navigation/native";
import { LeagueContext } from "../../context/LeagueContext";

import { UserContext } from "../../context/UserContext";
import {
  HorizontalLeagueCarouselSkeleton,
  TopPlayersSkeleton,
  TournamentGridSkeleton,
} from "../../components/Skeletons/HomeSkeleton";
import { handleSocialPress } from "../../helpers/handleSocialPress";
import Ionicons from "@expo/vector-icons/Ionicons";
import { socialMediaPlatforms, ICON_MAP } from "../../schemas/schema";
import AddLeagueModal from "../../components/Modals/AddLeagueModal";
import AddTournamentModal from "../../components/Modals/AddTournamentModal";

const Home = () => {
  const navigation = useNavigation();

  const {
    fetchUpcomingLeagues,
    upcomingLeagues,
    fetchUpcomingTournaments,
    upcomingTournaments,
    leagueNavigationId,
    tournamentNavigationId,
  } = useContext(LeagueContext);
  const { getAllUsers, rankSorting, currentUser } = useContext(UserContext);

  const [sortedUsers, setSortedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [addLeagueModalVisible, setAddLeagueModalVisible] = useState(false);
  const [addTournamentModalVisible, setAddTournamentModalVisible] =
    useState(false);

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseEndDate = (dateStr) => {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getLocalFirstCompetitions = ({
    competitions,
    ownerKey,
    participantsKey,
    checkEndDate = false,
    limit = 5,
  }) => {
    const active = competitions.filter((competition) => {
      if (competition?.privacy !== "Public") return false;
      if (checkEndDate) {
        const endDate = parseEndDate(competition?.endDate);
        if (endDate && endDate < today) return false;
      }
      if (!currentUser) return true;
      const userIsOwner =
        competition?.[ownerKey]?.userId === currentUser?.userId;
      const isParticipant = (competition?.[participantsKey] ?? []).some(
        (p) => p?.userId === currentUser?.userId,
      );
      return !userIsOwner && !isParticipant;
    });

    const local = active.filter(
      (c) => c.countryCode === currentUser?.location?.countryCode,
    );
    const global = active.filter(
      (c) => c.countryCode !== currentUser?.location?.countryCode,
    );

    return [...local, ...global].slice(0, limit);
  };

  const publicLeagues = getLocalFirstCompetitions({
    competitions: upcomingLeagues,
    ownerKey: "leagueOwner",
    participantsKey: "leagueParticipants",
    checkEndDate: true,
  });

  const publicTournaments = getLocalFirstCompetitions({
    competitions: upcomingTournaments,
    ownerKey: "tournamentOwner",
    participantsKey: "tournamentParticipants",
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
      <HomeContainer
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchUsers();
              fetchUpcomingLeagues();
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
          actionText="Browse Leagues"
          navigationRoute={"Leagues"}
        />
        {loading ? (
          <HorizontalLeagueCarouselSkeleton />
        ) : publicLeagues.length > 0 ? (
          <HorizontalLeagueCarousel
            navigationRoute={"League"}
            leagues={publicLeagues}
          />
        ) : (
          <CompetitionPlaceholder
            message="No upcoming leagues in your area. Create one for your community!"
            onPress={() => setAddLeagueModalVisible(true)}
          />
        )}
        <SubHeader
          title="Top Players"
          actionText="See All Players"
          navigationRoute={"AllPlayers"}
        />

        {loading ? (
          <TopPlayersSkeleton />
        ) : (
          <TopPlayers topPlayers={topPlayers} fetchUsers={fetchUsers} />
        )}

        <SubHeader
          title="Upcoming Tournaments"
          actionText="Browse Tournaments"
          navigationRoute={"Tournaments"}
        />
        {loading ? (
          <TournamentGridSkeleton />
        ) : publicTournaments.length > 0 ? (
          <TournamentGrid
            tournaments={publicTournaments}
            navigationRoute={"Tournament"}
          />
        ) : (
          <CompetitionPlaceholder
            message="No upcoming tournaments in your area. Create one for your community!"
            onPress={() => setAddTournamentModalVisible(true)}
          />
        )}

        {addLeagueModalVisible && (
          <AddLeagueModal
            modalVisible={addLeagueModalVisible}
            setModalVisible={setAddLeagueModalVisible}
          />
        )}
        {addTournamentModalVisible && (
          <AddTournamentModal
            modalVisible={addTournamentModalVisible}
            setModalVisible={setAddTournamentModalVisible}
          />
        )}
      </HomeContainer>
    </SafeAreaView>
  );
};

const CompetitionPlaceholder = ({ message, onPress }) => (
  <CarouselPlaceholder onPress={onPress}>
    <Ionicons name="add-circle-outline" size={40} color="#00A2FF" />
    <PlaceholderText>{message}</PlaceholderText>
  </CarouselPlaceholder>
);

const CarouselPlaceholder = styled.TouchableOpacity({
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#0A1F33",
  borderRadius: 10,
  height: 200,
  width: "100%",
  marginVertical: 10,
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderStyle: "dashed",
  gap: 10,
});

const PlaceholderText = styled.Text({
  color: "#aaa",
  fontSize: 14,
  fontStyle: "italic",
  textAlign: "center",
  paddingHorizontal: 30,
});

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
