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
import { TopPlayersSkeleton } from "../../components/Skeletons/HomeSkeleton";
import { handleSocialPress } from "../../helpers/handleSocialPress";
import Ionicons from "@expo/vector-icons/Ionicons";
import { socialMediaPlatforms, ICON_MAP } from "@shared";
import AddLeagueModal from "../../components/Modals/AddLeagueModal";
import AddTournamentModal from "../../components/Modals/AddTournamentModal";
import HomeLeagueSection from "../../components/Home/HomeLeagueSection";
import HomeTournamentSection from "../../components/Home/HomeTournamentSection";
import HomeClubsSection from "../../components/Home/HomeClubsSection";
import { GameVideo } from "@shared/types";
import { useGameVideoFeed } from "@/hooks/useGameVideoFeed";
import { useLikeVideo } from "@/hooks/useLikeVideo";
import { useFocusEffect } from "@react-navigation/native";
// import { addPlayerToCompetition } from "@/devFunctions/addPlayerToCompetition";
// ─── Video Feed Config ────────────────────────────────────────────────────────

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 80,
};

// ─── Component ────────────────────────────────────────────────────────────────

const Home = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const {
    fetchUpcomingLeagues,
    fetchUpcomingTournaments,
    fetchUpcomingClubs,
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
  const {
    videos,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchVideos,
    fetchMoreVideos,
  } = useGameVideoFeed();

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
      videos.map((v) => [`${v.gameId}_${v.postedBy.userId}`, v.likedBy ?? []]),
    );
    initLikedVideos(likedByMap, currentUser.userId);
  }, [videos, currentUser]);

  const renderVideo = useCallback(
    ({ item }: { item: GameVideo }) => (
      <GameVideoCard
        video={item}
        isActive={item.gameId === activeVideoId && isScreenFocused}
        onLike={(docId) => handleLike(docId, currentUser?.userId ?? "")}
        isLiked={likedVideoIds.has(`${item.gameId}_${item.postedBy.userId}`)}
        initiallyLiked={
          item.likedBy?.includes(currentUser?.userId ?? "") ?? false
        }
        onVideoDeleted={() => fetchVideos()}
        currentUserId={currentUser?.userId}
      />
    ),
    [activeVideoId, likedVideoIds, handleLike, isScreenFocused, currentUser],
  );

  // ─── Home Data ───────────────────────────────────────────────────────────────

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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
    fetchUpcomingLeagues();
    fetchUpcomingTournaments();
    fetchUpcomingClubs();
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

        {/* <TouchableOpacity
          onPress={() =>
            addPlayerToCompetition({
              userId: "VXk56Lk6eITWa5aEuysyBfEVjXo2",
              competitionId: "WNB-Week-7-24-06-2026-NLKYD",
              notificationId: "nTwtgfOi9UyjbRkkcMiX",
              collectionName: "tournaments",
            })
          }
        >
          <Text style={{ color: "white" }}>Add Player</Text>
        </TouchableOpacity> */}

        {currentUser ? (
          <Text style={{ color: "white", marginVertical: 10 }}>
            Hello, {currentUser?.firstName}
          </Text>
        ) : (
          <TouchableOpacity onPress={() => navigateTo("Login")}>
            <Text style={{ color: "white" }}>Sign In</Text>
          </TouchableOpacity>
        )}

        <HomeLeagueSection
          loading={loading}
          onCreatePress={() => setAddLeagueModalVisible(true)}
        />

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

        <HomeTournamentSection
          loading={loading}
          onCreatePress={() => setAddTournamentModalVisible(true)}
        />

        <HomeClubsSection />

        <SubHeader title="Game Videos" />
      </HeaderContainer>
    ),
    [loading, currentUser, topPlayers],
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
      <FlatList
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => `${item.gameId}_${item.postedBy.userId}`}
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
          isLoading ? (
            <>
              <GameVideoCard
                isLoading
                isActive={false}
                onLike={() => {}}
                isLiked={false}
                initiallyLiked={false}
              />
              <GameVideoCard
                isLoading
                isActive={false}
                onLike={() => {}}
                isLiked={false}
                initiallyLiked={false}
              />
            </>
          ) : (
            <EmptyContainer>
              <EmptyText>
                No game videos yet. Be the first to upload one!
              </EmptyText>
            </EmptyContainer>
          )
        }
        style={{ backgroundColor: "rgb(3, 16, 31)" }}
      />

      {addLeagueModalVisible && (
        <AddLeagueModal
          modalVisible={addLeagueModalVisible}
          setModalVisible={setAddLeagueModalVisible}
          onSuccess={(leagueId: string) => {
            fetchUpcomingLeagues();
            navigation.navigate("League", { leagueId });
          }}
        />
      )}
      {addTournamentModalVisible && (
        <AddTournamentModal
          modalVisible={addTournamentModalVisible}
          setModalVisible={setAddTournamentModalVisible}
          onSuccess={(tournamentId: string) => {
            fetchUpcomingTournaments();
            navigation.navigate("Tournament", {
              tournamentId,
            });
          }}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const HeaderContainer = styled.View({
  paddingHorizontal: 20,
  backgroundColor: "rgb(3, 16, 31)",
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
