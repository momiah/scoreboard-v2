import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
  FlatList,
  Dimensions,
  StyleSheet,
} from "react-native";
import { UserContext } from "../context/UserContext";
import styled from "styled-components/native";
import CourtChampsLogo from "../assets/court-champ-logo-icon.png";
import { useRoute } from "@react-navigation/native";
import { GameContext } from "../context/GameContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimateNumber from "../components/performance/AnimateNumber";
import PerformanceStats from "../components/performance/PerformanceStats";
import MedalProgress from "../components/performance/MedalProgress";
import ResultLog from "../components/performance/ResultLog";
import MatchMedals from "../components/performance/MatchMedals";
import MedalDisplay from "../components/performance/MedalDisplay";
import { trophies } from "../mockImages";
import LeagueStatsDisplay from "../components/performance/LeagueStatDisplay";
import { sortLeaguesByEndDate } from "../functions/sortedLeaguesByEndDate";
import { getPlayerRankInLeague } from "../functions/getPlayerRankInLeague";
import Tag from "../components/Tag";
import { calculateLeagueStatus } from "../functions/calculateLeagueStatus";
import { useNavigation } from "@react-navigation/native";
import RankSuffix from "../components/RankSuffix";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedStatFontSize = screenWidth <= 400 ? 20 : 25;
const screenAdjustedMedalSize = screenWidth <= 400 ? 70 : 80;

const Profile = () => {
  const route = useRoute();
  const { getUserById, getGlobalRank, getLeaguesForUser } =
    useContext(UserContext);
  const { medalNames } = useContext(GameContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Profile");
  const [globalRank, setGlobalRank] = useState(null);
  const [userLeagues, setUserLeagues] = useState([]);
  const [rankData, setRankData] = useState([]);
  const [rankLoading, setRankLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigation = useNavigation();

  const navigateTo = (leagueId) => {
    navigation.navigate("League", { leagueId });
  };

  // User ID management
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id =
          route.params?.userId || (await AsyncStorage.getItem("userId"));
        setUserId(id);
      } catch (error) {
        console.error("Error fetching user ID:", error);
        setLoading(false);
      }
    };

    fetchUserId();
  }, [route.params]);

  // Profile data fetching with cleanup
  useEffect(() => {
    const abortController = new AbortController();

    const fetchProfile = async () => {
      if (!userId) return;

      try {
        const userProfile = await getUserById(userId, {
          signal: abortController.signal,
        });
        setProfile(userProfile);
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching profile:", error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    return () => abortController.abort();
  }, [userId, getUserById]);

  // Global rank fetching
  useEffect(() => {
    const fetchRank = async () => {
      if (profile?.userId) {
        try {
          const rank = await getGlobalRank(profile.userId);
          setGlobalRank(rank);
        } catch (error) {
          console.error("Error fetching global rank:", error);
        }
      }
    };

    fetchRank();
  }, [profile, getGlobalRank]);

  // Leagues data fetching
  useEffect(() => {
    const abortController = new AbortController();

    const fetchLeagues = async () => {
      if (!userId) return;

      try {
        const leagues = await getLeaguesForUser(userId, {
          signal: abortController.signal,
        });
        setUserLeagues(leagues);
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Error fetching leagues:", error);
        }
      }
    };

    fetchLeagues();
    return () => abortController.abort();
  }, [userId, getLeaguesForUser]);

  // Process league rankings
  useEffect(() => {
    if (sortedLeagues.length > 0 && profile) {
      setRankLoading(true);
      const task = InteractionManager.runAfterInteractions(() => {
        const processed = sortedLeagues.map((league) => {
          const rank = getPlayerRankInLeague(league, profile.userId);
          const participant = league.leagueParticipants?.find(
            (p) => p.userId === profile.userId
          );
          const wins = participant ? participant.numberOfWins : 0;
          return { ...league, userRank: rank, wins };
        });
        setRankData(processed);
        setRankLoading(false);
      });
      return () => task.cancel();
    }
  }, [sortedLeagues, profile]);

  const sortedLeagues = useMemo(
    () => sortLeaguesByEndDate(userLeagues),
    [userLeagues]
  );

  const profileDetail = profile?.profileDetail;
  const leagueStats = profileDetail?.leagueStats;

  const statData = useMemo(() => {
    const wins = profileDetail?.numberOfWins || 0;
    const losses = profileDetail?.numberOfLosses || 0;

    return [
      {
        statTitle: "Wins",
        stat: (
          <AnimateNumber number={wins} fontSize={screenAdjustedStatFontSize} />
        ),
      },
      {
        statTitle: "Losses",
        stat: (
          <AnimateNumber
            number={losses}
            fontSize={screenAdjustedStatFontSize}
          />
        ),
      },
      {
        statTitle: "Win Ratio",
        stat: (
          <Stat>{losses ? (wins / losses).toFixed(2) : wins.toFixed(2)}</Stat>
        ),
      },
      {
        statTitle: "Highest Streak",
        stat: (
          <AnimateNumber
            number={profileDetail?.highestWinStreak || 0}
            fontSize={screenAdjustedStatFontSize}
          />
        ),
      },
    ];
  }, [profileDetail]);

  const tabs = useMemo(
    () => [
      { component: "Profile" },
      { component: "Performance" },
      { component: "Activity" },
    ],
    []
  );

  const renderLeagueItem = useCallback(({ item }) => {
    const leagueStatus = calculateLeagueStatus(item);
    return (
      <LeagueItem key={item.id} onPress={() => navigateTo(item.id)}>
        <View
          style={{
            padding: 5,

            width: "60%",
          }}
        >
          <Text style={styles.leagueName}>{item.leagueName}</Text>
          <Text style={styles.leagueDates}>{item.location}</Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Tag name={leagueStatus?.status} color={leagueStatus?.color} />
            <Tag name={item.leagueType} />
          </View>
        </View>

        <TableCell>
          <StatTitle>Wins</StatTitle>
          <Stat>{item.wins}</Stat>
        </TableCell>
        <TableCell>
          <StatTitle>Rank</StatTitle>
          <Stat>
            <RankSuffix
              number={item.userRank}
              numberStyle={{
                fontSize: screenAdjustedStatFontSize,
                color: "white",
              }}
              suffixStyle={{
                color: "rgba(255,255,255,0.7)",
              }}
            />
          </Stat>
        </TableCell>
      </LeagueItem>
    );
  }, []);

  const renderProfileContent = useCallback(
    () => (
      <View style={{ gap: 5, paddingTop: 10 }}>
        <SectionTitle>Name</SectionTitle>
        <SectionContent>
          {profile?.firstName} {profile?.lastName}
        </SectionContent>
        <Divider />
        <SectionTitle>Location</SectionTitle>
        <SectionContent>
          {profile?.location || "Location not provided"}
        </SectionContent>
        <Divider />
        <SectionTitle>Hand Preference</SectionTitle>
        <SectionContent>
          {profile?.handPreference || "Not provided"}
        </SectionContent>
        <Divider />
        <SectionTitle>Bio</SectionTitle>
        <SectionContent>{profile?.bio || "Bio not provided"}</SectionContent>
        <Divider />
        <SectionTitle>Contact</SectionTitle>
        <SectionContent>
          {profile?.email || "Email not provided"}
        </SectionContent>
        <Divider />
        <SectionTitle>Member Since</SectionTitle>
        <SectionContent>
          {profileDetail?.memberSince || "Date not available"}
        </SectionContent>
      </View>
    ),
    [profile, profileDetail]
  );

  const renderPerformanceContent = useCallback(
    () => (
      <>
        <MedalProgress
          xp={profileDetail?.XP}
          prevGameXp={profileDetail?.prevGameXP}
        />
        <MatchMedals
          demonWin={profileDetail?.demonWin}
          winStreak3={profileDetail?.winStreak3}
          winStreak5={profileDetail?.winStreak5}
          winStreak7={profileDetail?.winStreak7}
        />
        <Divider />
        <LeagueStatsDisplay leagueStats={leagueStats} />
        <PerformanceStats statData={statData} selectedPlayer={profileDetail} />
      </>
    ),
    [profileDetail, leagueStats, statData]
  );

  const renderActivityContent = useMemo(() => {
    if (rankLoading) {
      return <ActivityIndicator color="#fff" size="large" />;
    }

    return (
      <FlatList
        data={rankData}
        renderItem={renderLeagueItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No leagues found.</Text>
        }
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={10}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  }, [rankLoading, rankData, renderLeagueItem]);

  const renderComponent = useCallback(() => {
    switch (selectedTab) {
      case "Profile":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            {renderProfileContent()}
          </ScrollView>
        );
      case "Performance":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            {renderPerformanceContent()}
          </ScrollView>
        );
      case "Activity":
        return renderActivityContent;
      default:
        return null;
    }
  }, [
    selectedTab,
    renderProfileContent,
    renderPerformanceContent,
    renderActivityContent,
  ]);

  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator color="#fff" size="large" />
      </LoadingContainer>
    );
  }

  if (!profile) {
    return (
      <LoadingContainer>
        <Text style={styles.errorText}>Profile not found.</Text>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Overview>
        <PlayerDetail>
          <Avatar source={CourtChampsLogo} />
          <DetailColumn>
            <PlayerName>{profile?.username}</PlayerName>
            <DetailText>Member since June</DetailText>
            <DetailText>Last Active Today</DetailText>
            <DetailText>Global Rank: #{globalRank}</DetailText>
            <XpBadge>
              <XpText>{profileDetail?.XP?.toFixed(0)} XP</XpText>
            </XpBadge>
          </DetailColumn>
        </PlayerDetail>
        <MedalContainer>
          <MedalDisplay xp={profileDetail?.XP} size={screenAdjustedMedalSize} />
          <MedalName>{medalNames(profileDetail?.XP)}</MedalName>
        </MedalContainer>
      </Overview>

      <TabsContainer>
        {tabs.map((tab) => (
          <Tab
            key={tab.component}
            onPress={() => setSelectedTab(tab.component)}
            isSelected={selectedTab === tab.component}
          >
            <TabText>{tab.component}</TabText>
          </Tab>
        ))}
      </TabsContainer>

      <ProfileContent>{renderComponent()}</ProfileContent>
    </Container>
  );
};

// Styled components
const Container = styled.View`
  flex: 1;
  background-color: rgb(3, 16, 31);
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: rgb(3, 16, 31);
`;

const Overview = styled.View`
  padding: 20px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const PlayerDetail = styled.View`
  flex-direction: row;
  gap: 20px;
  flex: 1;
`;

const DetailColumn = styled.View`
  flex: 1;
  gap: 2px;
`;

const Avatar = styled.Image`
  width: 70px;
  height: 70px;
  border-radius: 35px;
  border-width: 2px;
  border-color: #00a2ff;
`;

const PlayerName = styled.Text`
  font-size: 25px;
  color: white;
  font-weight: bold;
`;

const DetailText = styled.Text`
  color: #aaa;
  font-size: ${screenWidth <= 400 ? 12 : 14}px;
`;

const XpBadge = styled.View`
  padding: 5px;
  background-color: rgb(40, 40, 40);
  border-radius: 5px;
  border: 1px solid white;
  align-self: flex-start;
  margin-top: 5px;
`;

const XpText = styled.Text`
  color: #aaa;
  font-size: ${screenWidth <= 400 ? 12 : 14}px;
`;

const MedalContainer = styled.View`
  align-items: center;
`;

const MedalName = styled.Text`
  color: white;
  margin-top: 10px;
  font-size: 12px;
`;

const TabsContainer = styled.View`
  flex-direction: row;
  padding: 10px;
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
`;

const Tab = styled.TouchableOpacity`
  flex: 1;
  padding: 10px;
  border-radius: 20px;
  border-width: ${({ isSelected }) => (isSelected ? 2 : 1)}px;
  border-color: ${({ isSelected }) => (isSelected ? "#00A2FF" : "white")};
  margin-horizontal: 5px;
  align-items: center;
  justify-content: center;
`;

const TabText = styled.Text`
  color: white;
  font-size: ${screenWidth <= 400 ? 12 : 14}px;
`;

const ProfileContent = styled.View`
  flex: 1;
  padding-horizontal: 20px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: #262626;
  margin-vertical: 10px;
`;

const SectionTitle = styled.Text`
  color: white;
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 5px;
`;

const SectionContent = styled.Text`
  color: white;
  font-size: 14px;
`;

const LeagueItem = styled.TouchableOpacity`
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgb(26, 28, 54);
  padding: ${screenWidth <= 400 ? 10 : 15}px;
  border-radius: 8px;
  margin-bottom: 10px;
  flex-direction: row;
  justify-content: space-between;
`;

const Stat = styled.Text`
  font-size: ${screenAdjustedStatFontSize}px;
  font-weight: bold;
  color: white;
`;

const StatTitle = styled.Text({
  fontSize: 12,
  color: "#aaa",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
});

// StyleSheet for optimized rendering
const styles = StyleSheet.create({
  leagueName: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  leagueDates: {
    color: "#ccc",
    fontSize: 12,
    marginBottom: 15,
  },
  leagueStatus: {
    color: "#0f0",
    fontSize: 12,
    marginVertical: 4,
  },
  leagueWins: {
    color: "white",
    fontSize: 14,
  },
  leagueRank: {
    color: "gold",
    fontSize: 14,
  },
  emptyText: {
    color: "white",
    textAlign: "center",
    marginTop: 20,
  },
  errorText: {
    color: "white",
    fontSize: 18,
  },
  tabContent: {
    paddingBottom: 40,
  },
});

export default React.memo(Profile);
