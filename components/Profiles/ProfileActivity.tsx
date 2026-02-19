import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from "react";
import { View, FlatList, InteractionManager, Dimensions } from "react-native";
import { processCompetitions } from "../../helpers/processCompetitions";
import { calculateCompetitionStatus } from "../../helpers/calculateCompetitionStatus";
import { sortLeaguesByEndDate } from "../../helpers/sortedLeaguesByEndDate";
import { normalizeCompetitionData } from "../../helpers/normalizeCompetitionData";
import Tag from "../Tag";
import RankSuffix from "../RankSuffix";
import { UserContext } from "../../context/UserContext";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";
import { UserProfile } from "../../types/player";
import {
  League,
  Tournament,
  NormalizedCompetition,
} from "../../types/competition";
import { COMPETITION_TYPES } from "../../schemas/schema";
import ProfileActivitySkeleton from "../Skeletons/ProfileActivitySkeleton";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedStatFontSize = screenWidth <= 400 ? 20 : 25;

type CompetitionType =
  (typeof COMPETITION_TYPES)[keyof typeof COMPETITION_TYPES];

interface ProfileActivityProps {
  profile: UserProfile;
}

interface ProcessedCompetition extends NormalizedCompetition {
  wins?: number;
  userRank?: number;
}

const TABS = [
  { key: COMPETITION_TYPES.LEAGUE, label: "Leagues" },
  { key: COMPETITION_TYPES.TOURNAMENT, label: "Tournaments" },
] as const;

const ProfileActivity: React.FC<ProfileActivityProps> = ({ profile }) => {
  const { getLeaguesForUser, getTournamentsForUser } = useContext(UserContext);

  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [leagueRankData, setLeagueRankData] = useState<ProcessedCompetition[]>(
    [],
  );
  const [tournamentRankData, setTournamentRankData] = useState<
    ProcessedCompetition[]
  >([]);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CompetitionType>(
    COMPETITION_TYPES.LEAGUE,
  );

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const navigateTo = useCallback(
    (id: string, type: CompetitionType) => {
      if (type === COMPETITION_TYPES.LEAGUE) {
        navigation.navigate("League", { leagueId: id });
      } else {
        navigation.navigate("Tournament", { tournamentId: id });
      }
    },
    [navigation],
  );

  // Single useEffect to fetch competitions based on active tab
  useEffect(() => {
    const fetchCompetitions = async () => {
      const userId = profile?.userId;
      if (!userId) return;

      const isLeagueTab = activeTab === COMPETITION_TYPES.LEAGUE;
      const setLoading = isLeagueTab
        ? setLeaguesLoading
        : setTournamentsLoading;
      const setCompetitions = isLeagueTab ? setUserLeagues : setUserTournaments;
      const getCompetitions = isLeagueTab
        ? getLeaguesForUser
        : getTournamentsForUser;

      try {
        setLoading(true);
        const competitions = await getCompetitions(userId);
        setCompetitions(competitions);
      } catch (error) {
        console.error(
          `Error fetching ${isLeagueTab ? "leagues" : "tournaments"}:`,
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, [profile?.userId, activeTab, getLeaguesForUser, getTournamentsForUser]);

  // Single processing useEffect based on active tab
  useEffect(() => {
    let task: ReturnType<
      typeof InteractionManager.runAfterInteractions
    > | null = null;

    const isLeagueTab = activeTab === COMPETITION_TYPES.LEAGUE;
    const rawCompetitions = isLeagueTab ? userLeagues : userTournaments;

    if (rawCompetitions.length > 0 && profile) {
      const setLoading = isLeagueTab
        ? setLeaguesLoading
        : setTournamentsLoading;
      const setRankData = isLeagueTab
        ? setLeagueRankData
        : setTournamentRankData;

      setLoading(true);

      const process = () => {
        // Normalize competitions
        const normalized = rawCompetitions.map((competition) =>
          normalizeCompetitionData({
            rawData: competition,
            competitionType: activeTab,
          }),
        ) as NormalizedCompetition[];

        // Process normalized competitions
        processCompetitions({
          competitions: normalized,
          setRankData,
          setRankLoading: setLoading,
          profile,
          competitionType: activeTab,
        });
      };

      if (rawCompetitions.length > 50) {
        task = InteractionManager.runAfterInteractions(process);
      } else {
        process();
      }
    }

    return () => {
      if (task) task.cancel();
    };
  }, [activeTab, userLeagues, userTournaments, profile]);

  const sortedLeagues = useMemo(
    () => sortLeaguesByEndDate(leagueRankData),
    [leagueRankData],
  );

  const sortedTournaments = useMemo(
    () => sortLeaguesByEndDate(tournamentRankData),
    [tournamentRankData],
  );

  const renderLeagueItem = useCallback(
    ({ item }: { item: ProcessedCompetition }) => {
      const status = calculateCompetitionStatus(item);
      const isOwner = item.owner?.userId === profile?.userId;
      const isAdmin =
        !isOwner &&
        item.admins?.some((admin) => admin.userId === profile?.userId);

      return (
        <CompetitionItem
          key={item.id}
          onPress={() => navigateTo(item.id, COMPETITION_TYPES.LEAGUE)}
        >
          <RoleBadgeContainer>
            {isOwner ? (
              <Tag
                name="Owner"
                color="rgb(3, 16, 31)"
                iconColor="#FFD700"
                iconSize={10}
                fontSize={8}
                icon="star-outline"
                iconPosition="right"
                bold
              />
            ) : isAdmin ? (
              <Tag
                name="Admin"
                color="#16181B"
                iconColor="#00A2FF"
                iconSize={10}
                fontSize={8}
                icon="checkmark-circle-outline"
                iconPosition="right"
                bold
              />
            ) : null}
          </RoleBadgeContainer>

          <InfoContainer>
            <CompetitionName>{item.name}</CompetitionName>
            <CourtName>{item.location?.courtName}</CourtName>
            <TagRow>
              <Tag name={status?.status} color={status?.color} />
              <Tag name={item.type} />
            </TagRow>
          </InfoContainer>

          <TableCell>
            <StatTitle>Wins</StatTitle>
            <Stat>{item.wins}</Stat>
          </TableCell>
          <TableCell>
            <StatTitle>Rank</StatTitle>
            <Stat>
              <RankSuffix
                number={item.userRank ?? 0}
                numberStyle={{
                  fontSize: screenAdjustedStatFontSize,
                  color: "white",
                  fontWeight: "bold",
                }}
                suffixStyle={{
                  color: "rgba(255,255,255,0.7)",
                }}
                style={[]}
              />
            </Stat>
          </TableCell>
        </CompetitionItem>
      );
    },
    [profile?.userId, navigateTo],
  );

  const renderTournamentItem = useCallback(
    ({ item }: { item: ProcessedCompetition }) => {
      const status = calculateCompetitionStatus(item);
      const isOwner = item.owner?.userId === profile?.userId;
      const isAdmin =
        !isOwner &&
        item.admins?.some((admin) => admin.userId === profile?.userId);

      return (
        <CompetitionItem
          key={item.id}
          onPress={() => navigateTo(item.id, COMPETITION_TYPES.TOURNAMENT)}
        >
          <RoleBadgeContainer>
            {isOwner ? (
              <Tag
                name="Owner"
                color="rgb(3, 16, 31)"
                iconColor="#FFD700"
                iconSize={10}
                fontSize={8}
                icon="star-outline"
                iconPosition="right"
                bold
              />
            ) : isAdmin ? (
              <Tag
                name="Admin"
                color="#16181B"
                iconColor="#00A2FF"
                iconSize={10}
                fontSize={8}
                icon="checkmark-circle-outline"
                iconPosition="right"
                bold
              />
            ) : null}
          </RoleBadgeContainer>

          <InfoContainer>
            <CompetitionName>{item.name}</CompetitionName>
            <CourtName>{item.location?.courtName}</CourtName>
            <TagRow>
              <Tag name={status?.status} color={status?.color} />
              <Tag name={item.type} />
            </TagRow>
          </InfoContainer>

          <TableCell>
            <StatTitle>Wins</StatTitle>
            <Stat>{item.wins}</Stat>
          </TableCell>
          <TableCell>
            <StatTitle>Rank</StatTitle>
            <Stat>
              <RankSuffix
                number={item.userRank ?? 0}
                numberStyle={{
                  fontSize: screenAdjustedStatFontSize,
                  color: "white",
                }}
                suffixStyle={{
                  color: "rgba(255,255,255,0.7)",
                }}
                style={[]}
              />
            </Stat>
          </TableCell>
        </CompetitionItem>
      );
    },
    [profile?.userId, navigateTo],
  );

  const renderContent = useMemo(() => {
    const isLeagueTab = activeTab === COMPETITION_TYPES.LEAGUE;
    const loading = isLeagueTab ? leaguesLoading : tournamentsLoading;

    if (loading) {
      return <ProfileActivitySkeleton itemCount={4} />;
    }

    if (isLeagueTab) {
      const emptyMessage =
        "Here you can find all of the leagues you are participating in. Please create or join a league for details 🏟️";
      return sortedLeagues.length > 0 ? (
        <FlatList
          data={sortedLeagues}
          renderItem={renderLeagueItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <NoActivityText>{emptyMessage}</NoActivityText>
      );
    } else {
      const emptyMessage =
        "Here you can find all of the tournaments you are participating in. Please create or join a tournament for details 🏆";
      return sortedTournaments.length > 0 ? (
        <FlatList
          data={sortedTournaments}
          renderItem={renderTournamentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <NoActivityText>{emptyMessage}</NoActivityText>
      );
    }
  }, [
    activeTab,
    leaguesLoading,
    tournamentsLoading,
    sortedLeagues,
    sortedTournaments,
    renderLeagueItem,
    renderTournamentItem,
  ]);

  return (
    <Container>
      <TabContainer>
        {TABS.map((tab) => (
          <TabItem
            key={tab.key}
            isActive={activeTab === tab.key}
            onPress={() => setActiveTab(tab.key)}
          >
            <TabText isActive={activeTab === tab.key}>{tab.label}</TabText>
          </TabItem>
        ))}
      </TabContainer>
      {renderContent}
    </Container>
  );
};

export default React.memo(ProfileActivity);

const Container = styled.View({
  flex: 1,
});

const TabContainer = styled.View({
  flexDirection: "row",
  marginBottom: 20,
  paddingTop: 10,
});

const TabItem = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    flex: 1,
    borderBottomColor: isActive ? "#00A2FF" : "rgb(9, 33, 62)",
    borderBottomWidth: 2,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  }),
);

const TabText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    fontSize: 14,
    fontWeight: "bold",
    color: isActive ? "#ffffffff" : "#aaa",
  }),
);

const CompetitionItem = styled.TouchableOpacity({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  padding: screenWidth <= 400 ? 12 : 17,
  borderRadius: 8,
  marginBottom: 10,
  flexDirection: "row",
  justifyContent: "space-between",
});

const RoleBadgeContainer = styled.View({
  position: "absolute",
  top: 0,
  right: 0,
});

const InfoContainer = styled.View({
  padding: 5,
  width: "60%",
});

const CompetitionName = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
  marginBottom: 4,
});

const CourtName = styled.Text({
  color: "#ccc",
  fontSize: 12,
  marginBottom: 15,
});

const TagRow = styled.View({
  flexDirection: "row",
  gap: 10,
});

const Stat = styled.Text({
  fontSize: screenAdjustedStatFontSize,
  fontWeight: "bold",
  color: "white",
});

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

const NoActivityText = styled.Text({
  color: "#aaa",
  fontStyle: "italic",
  fontSize: 16,
  textAlign: "center",
  marginTop: 50,
});
