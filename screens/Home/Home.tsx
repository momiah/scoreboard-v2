import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Image,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Platform,
  Linking,
  FlatList,
  ViewToken,
  ActivityIndicator,
  ViewabilityConfig,
  RefreshControl,
} from "react-native";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../assets";
import HorizontalLeagueCarousel from "../../components/Leagues/HorizontalLeagueCarousel";
import TournamentGrid from "../../components/Tournaments/TournamentGrid";
import TopPlayers from "../../components/TopPlayersDisplay/TopPlayers";
import SubHeader from "../../components/SubHeader";
import GameVideoCard from "../../components/Feed/GameVideoCard";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import {
  HorizontalLeagueCarouselSkeleton,
  TopPlayersSkeleton,
  TournamentGridSkeleton,
} from "../../components/Skeletons/HomeSkeleton";
import { handleSocialPress } from "../../helpers/handleSocialPress";
import Ionicons from "@expo/vector-icons/Ionicons";
import { socialMediaPlatforms, ICON_MAP } from "@shared";
import AddLeagueModal from "../../components/Modals/AddLeagueModal";
import AddTournamentModal from "../../components/Modals/AddTournamentModal";
import {
  GameVideo,
  League,
  NormalizedCompetition,
  Tournament,
} from "@shared/types";
import { getLocalFirstCompetitions } from "@/helpers/getLocalFirstCompetitions";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";
import { useGameVideoFeed } from "@/hooks/useGameVideoFeed";
import { useLikeVideo } from "@/hooks/useLikeVideo";
import { useFocusEffect } from "@react-navigation/native";

// ─── Video Feed Config ────────────────────────────────────────────────────────

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 80,
};

// ─── Component ────────────────────────────────────────────────────────────────

const Home = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const {
    fetchUpcomingLeagues,
    upcomingLeagues,
    fetchUpcomingTournaments,
    upcomingTournaments,
    leagueNavigationId,
    tournamentNavigationId,
  } = useContext(LeagueContext);
  const { getTopUsers, currentUser } = useContext(UserContext);

  // ─── Home State ─────────────────────────────────────────────────────────────
  const [sortedUsers, setSortedUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  // const [selectedVideo, setSelectedVideo] = useState<GameVideo | null>(null);
  const [addLeagueModalVisible, setAddLeagueModalVisible] = useState(false);
  const [addTournamentModalVisible, setAddTournamentModalVisible] =
    useState(false);

  // ─── Video Feed State ────────────────────────────────────────────────────────
  const { likedVideoIds, handleLike, initLikedVideos } = useLikeVideo();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const { videos, isLoadingMore, hasMore, fetchVideos, fetchMoreVideos } =
    useGameVideoFeed();

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveVideoId(viewableItems[0].item.gameId);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        setIsScreenFocused(true);
      }, 1000); // wait for navigation animation to complete

      return () => {
        clearTimeout(timeout);
        setIsScreenFocused(false);
      };
    }, []),
  );
  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig: VIEWABILITY_CONFIG, onViewableItemsChanged },
  ]);

  useEffect(() => {
    if (!currentUser || videos.length === 0) return;
    const likedByMap = Object.fromEntries(
      videos.map((v) => [v.gameId, v.likedBy ?? []]),
    );
    initLikedVideos(likedByMap, currentUser.userId);
  }, [videos, currentUser]);

  const renderVideo = useCallback(
    ({ item }: { item: GameVideo }) => (
      <GameVideoCard
        video={item}
        isActive={item.gameId === activeVideoId && isScreenFocused}
        onLike={(gameId) => handleLike(gameId, currentUser?.userId ?? "")}
        isLiked={likedVideoIds.has(item.gameId)}
        initiallyLiked={
          item.likedBy?.includes(currentUser?.userId ?? "") ?? false
        }
      />
    ),
    [activeVideoId, likedVideoIds, handleLike, isScreenFocused, currentUser],
  );

  // ─── Home Data ───────────────────────────────────────────────────────────────

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
      const top = await getTopUsers(5);
      setSortedUsers(top);
    } catch (error) {
      console.error("Failed to fetch top users:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchVideos();
  }, []);

  const navigateTo = (route: keyof ParamListBase): void => {
    if (route) navigation.navigate(route);
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

  const publicLeagues = getLocalFirstCompetitions({
    competitions: (upcomingLeagues ?? []).map((league: League) =>
      normalizeCompetitionData({ rawData: league, competitionType: "league" }),
    ) as NormalizedCompetition[],
    checkEndDate: true,
    currentUser,
  });

  const publicTournaments = getLocalFirstCompetitions({
    competitions: (upcomingTournaments ?? []).map((tournament: Tournament) =>
      normalizeCompetitionData({
        rawData: tournament,
        competitionType: "tournament",
      }),
    ) as NormalizedCompetition[],
    currentUser,
  });

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
    fetchUpcomingLeagues();
    fetchUpcomingTournaments();
    fetchVideos();
  };

  // ─── Header (all non-video content) ─────────────────────────────────────────

  const HomeHeader = useMemo(
    () => (
      <HeaderContainer>
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
                <Ionicons
                  name={ICON_MAP[platform as keyof typeof ICON_MAP]}
                  size={25}
                  color="#00A2FF"
                />
              </SocialButton>
            ))}
          </SocialRow>
        </Overview>

        {currentUser ? (
          <Text style={{ color: "white", marginVertical: 10 }}>
            Hello, {currentUser?.firstName}
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
            onPress={() =>
              currentUser ? setAddLeagueModalVisible(true) : navigateTo("Login")
            }
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
          <TopPlayers topPlayers={topPlayers} />
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
            onPress={() =>
              currentUser
                ? setAddTournamentModalVisible(true)
                : navigateTo("Login")
            }
          />
        )}

        <SubHeader title="Game Videos" />
      </HeaderContainer>
    ),
    [loading, publicLeagues, publicTournaments, currentUser, topPlayers],
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.gameId}
        ListHeaderComponent={HomeHeader}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        onEndReached={hasMore ? fetchMoreVideos : undefined}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="white"
            colors={["white"]}
            progressBackgroundColor="#00A2FF"
          />
        }
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              size="small"
              color="#00A2FF"
              style={{ paddingVertical: 16 }}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyContainer>
            <EmptyText>
              No game videos yet. Be the first to upload one!
            </EmptyText>
          </EmptyContainer>
        }
        style={{ backgroundColor: "rgb(3, 16, 31)" }}
      />

      {addLeagueModalVisible && (
        <AddLeagueModal
          modalVisible={addLeagueModalVisible}
          setModalVisible={setAddLeagueModalVisible}
          onSuccess={() => fetchUpcomingLeagues()}
        />
      )}
      {addTournamentModalVisible && (
        <AddTournamentModal
          modalVisible={addTournamentModalVisible}
          setModalVisible={setAddTournamentModalVisible}
          onSuccess={() => fetchUpcomingTournaments()}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Sub Components ───────────────────────────────────────────────────────────

const CompetitionPlaceholder = ({
  message,
  onPress,
}: {
  message: string;
  onPress: () => void;
}) => (
  <CarouselPlaceholder onPress={onPress}>
    <Ionicons name="add-circle-outline" size={40} color="#00A2FF" />
    <PlaceholderText>{message}</PlaceholderText>
  </CarouselPlaceholder>
);

// ─── Styled Components ────────────────────────────────────────────────────────

const HeaderContainer = styled.View({
  paddingHorizontal: 20,
  backgroundColor: "rgb(3, 16, 31)",
});

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

const EmptyContainer = styled.View({
  paddingVertical: 32,
  paddingHorizontal: 16,
  alignItems: "center",
});

const EmptyText = styled.Text({
  color: "#555",
  fontSize: 13,
  textAlign: "center",
});

export default Home;
