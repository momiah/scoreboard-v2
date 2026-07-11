import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  memo,
  useState,
  useEffect,
} from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { FlatList, Dimensions, Image } from "react-native";
import styled from "styled-components/native";
import {
  useFocusEffect,
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import {
  collection,
  query,
  where,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { UserContext } from "../../context/UserContext";
import { LeagueContext } from "../../context/LeagueContext";
import {
  COMPETITION_TYPES,
  NormalizedCompetition,
  Game,
  UserProfile,
  Notification,
} from "@shared";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";
import RankSuffix from "@/components/RankSuffix";
import {
  getPlayerRankInCompetition,
  getTeamRankInCompetition,
} from "@/shared/helpers/getRankInCompetition";
import { getTime } from "../../helpers/dateTimeUtils";
import AddCompetitionModal from "@/components/Modals/AddCompetitionModal";
import CompetitionListItemSkeleton from "../../components/Skeletons/CompetitionListItemSkeleton";
import { trophies, medals } from "../../mockImages";

const { width: screenWidth } = Dimensions.get("window");
const isSmallScreen = screenWidth < 400;

const NEW_COMPETITION_WINDOW_DAYS = 3;
const EXPIRY_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

type CompetitionTypeValue =
  | typeof COMPETITION_TYPES.LEAGUE
  | typeof COMPETITION_TYPES.TOURNAMENT;

interface CompetitionWithMeta extends NormalizedCompetition {
  competitionType: CompetitionTypeValue;
  lastActivity: Date | string;
  isExpired: boolean;
}

const COLLECTIONS: {
  name: string;
  competitionType: CompetitionTypeValue;
}[] = [
  { name: "leagues", competitionType: COMPETITION_TYPES.LEAGUE },
  { name: "tournaments", competitionType: COMPETITION_TYPES.TOURNAMENT },
];

const CompetitionsScreen = memo(() => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentUser, notifications, authInitializing } =
    useContext(UserContext);
  const { leagueNavigationId, tournamentNavigationId } =
    useContext(LeagueContext);
  const [competitions, setCompetitions] = useState<CompetitionWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCompetitionVisible, setAddCompetitionVisible] = useState(false);

  const competitionMap = useRef<Map<string, CompetitionWithMeta>>(new Map());

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

  useFocusEffect(
    useCallback(() => {
      const userId = currentUser?.userId;

      if (!userId) {
        competitionMap.current.clear();
        setCompetitions([]);
        setLoading(false);
        return;
      }

      setLoading(competitionMap.current.size === 0);

      const reportedCollections = new Set<string>();

      const flush = (collectionName: string) => {
        reportedCollections.add(collectionName);
        const next = Array.from(competitionMap.current.values()).sort(
          (first, second) => {
            const getCompetitionStageOrder = (comp: CompetitionWithMeta) =>
              comp.isExpired ? 2 : comp.prizesDistributed ? 1 : 0;

            const firstStageOrder = getCompetitionStageOrder(first);
            const secondStageOrder = getCompetitionStageOrder(second);
            if (firstStageOrder !== secondStageOrder) {
              return firstStageOrder - secondStageOrder;
            }
            return getTime(second.lastActivity) - getTime(first.lastActivity);
          },
        );
        setCompetitions(next);
        if (reportedCollections.size === COLLECTIONS.length) {
          setLoading(false);
        }
      };

      const subscribe = (config: (typeof COLLECTIONS)[number]) => {
        const competitionsQuery = query(
          collection(db, config.name),
          where("participantIds", "array-contains", userId),
        );

        const handleSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
          for (const [id, comp] of competitionMap.current) {
            if (comp.competitionType === config.competitionType) {
              competitionMap.current.delete(id);
            }
          }

          snapshot.docs.forEach((doc) => {
            const raw = doc.data();

            const normalized = normalizeCompetitionData({
              rawData: { ...raw, id: doc.id },
              competitionType: config.competitionType,
            }) as NormalizedCompetition | null;
            if (!normalized) return;

            const games = normalized.games || [];
            const lastGame = games.length ? games[games.length - 1] : null;
            const activityCandidates = [
              lastGame?.reportedAt,
              lastGame?.createdAt,
              raw.fixturesGeneratedAt,
              raw.prizeDistributionDate,
              normalized.createdAt,
            ];
            const lastActivity =
              activityCandidates
                .filter(Boolean)
                .sort((first, second) => getTime(second) - getTime(first))[0] ||
              new Date();

            const isExpired =
              !!normalized.prizesDistributed &&
              !!normalized.prizeDistributionDate &&
              Date.now() >
                getTime(normalized.prizeDistributionDate) + EXPIRY_WINDOW_MS;

            competitionMap.current.set(doc.id, {
              ...normalized,
              competitionType: config.competitionType,
              lastActivity,
              isExpired,
            });
          });

          flush(config.name);
        };

        return onSnapshot(competitionsQuery, handleSnapshot, (error) => {
          console.error(`Error fetching ${config.name}:`, error);
          flush(config.name);
        });
      };

      const unsubscribers = COLLECTIONS.map(subscribe);
      return () => {
        unsubscribers.forEach((unsub) => unsub());
      };
    }, [currentUser?.userId]),
  );

  const openAddCompetition = useCallback(
    () => setAddCompetitionVisible(true),
    [],
  );
  const goToNotifications = useCallback(
    () => navigation.navigate("Notifications"),
    [navigation],
  );

  const unreadNotifications = notifications.filter(
    (notification: Notification) => notification.isRead === false,
  ).length;

  const handleCompetitionPress = useCallback(
    (competition: CompetitionWithMeta) => {
      const isLeague = competition.competitionType === COMPETITION_TYPES.LEAGUE;
      const userId = currentUser?.userId;

      const isUserInGame = (game: Game) =>
        game.team1?.player1?.userId === userId ||
        game.team1?.player2?.userId === userId ||
        game.team2?.player1?.userId === userId ||
        game.team2?.player2?.userId === userId;

      const isPendingUserApproval = (game: Game) =>
        (game.approvalStatus === "pending" ||
          game.approvalStatus === "Pending") &&
        game.reporter !== userId;

      const tab = competition.prizesDistributed
        ? "Summary"
        : isLeague
          ? "Scoreboard"
          : "Fixtures";

      if (isLeague) {
        const firstPending = (competition.games || []).find(
          (game) => isUserInGame(game) && isPendingUserApproval(game),
        );
        navigation.navigate("League", {
          leagueId: competition.id,
          tab,
          scrollToGameId: firstPending?.gameId,
        });
      } else {
        const fixtureGames = (competition.fixtures || []).flatMap(
          (fixture) => fixture.games || [],
        );
        const userGames = fixtureGames.filter(isUserInGame);
        const firstPending = userGames.find(isPendingUserApproval);
        const firstUnplayed = userGames.find((game) => !game.result);
        const targetGame = firstPending || firstUnplayed;
        navigation.navigate("Tournament", {
          tournamentId: competition.id,
          tab,
          scrollToGameId: targetGame?.gameId,
          glowColor: firstPending ? "#FFA500" : "#00A2FF",
        });
      }
    },
    [navigation, currentUser?.userId],
  );

  const renderItem = useCallback(
    ({ item }: { item: CompetitionWithMeta }) => (
      <CompetitionListItem
        currentUser={currentUser}
        competition={item}
        onPress={() => handleCompetitionPress(item)}
      />
    ),
    [handleCompetitionPress, currentUser],
  );

  if (authInitializing || (currentUser?.userId && loading)) {
    return (
      <Container>
        <CompetitionsHeader
          unreadNotifications={unreadNotifications}
          onAddPress={openAddCompetition}
          onNotificationsPress={goToNotifications}
        />
        {Array.from({ length: 8 }).map((_, index) => (
          <CompetitionListItemSkeleton key={index} />
        ))}
      </Container>
    );
  }

  if (!currentUser?.userId) {
    return (
      <Container>
        <CompetitionsHeader
          unreadNotifications={0}
          onAddPress={openAddCompetition}
          onNotificationsPress={goToNotifications}
        />
        <EmptyInner>
          <EmptyText>
            Please sign in or create an account to view your competitions
          </EmptyText>
        </EmptyInner>
      </Container>
    );
  }

  if (competitions.length === 0) {
    return (
      <Container>
        <CompetitionsHeader
          unreadNotifications={unreadNotifications}
          onAddPress={openAddCompetition}
          onNotificationsPress={goToNotifications}
        />
        <EmptyInner>
          <EmptyText>
            No competitions yet. Join or create one to get started!
          </EmptyText>
        </EmptyInner>

        {addCompetitionVisible && (
          <AddCompetitionModal
            modalVisible={addCompetitionVisible}
            setModalVisible={setAddCompetitionVisible}
            currentUser={currentUser}
          />
        )}
      </Container>
    );
  }

  return (
    <Container>
      <CompetitionsHeader
        unreadNotifications={unreadNotifications}
        onAddPress={openAddCompetition}
        onNotificationsPress={goToNotifications}
      />
      <FlatList
        data={competitions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {addCompetitionVisible && (
        <AddCompetitionModal
          modalVisible={addCompetitionVisible}
          setModalVisible={setAddCompetitionVisible}
          currentUser={currentUser}
        />
      )}
    </Container>
  );
});

CompetitionsScreen.displayName = "CompetitionsScreen";

interface CompetitionsHeaderProps {
  unreadNotifications: number;
  onAddPress: () => void;
  onNotificationsPress: () => void;
}

const CompetitionsHeader = memo<CompetitionsHeaderProps>(
  ({ unreadNotifications, onAddPress, onNotificationsPress }) => (
    <HeaderRow>
      <Header>
        <AddButton onPress={onAddPress}>
          <Ionicons name="add" size={isSmallScreen ? 18 : 22} color="white" />
        </AddButton>
        <HeaderText>Competitions</HeaderText>
      </Header>
      <NotificationButton onPress={onNotificationsPress}>
        <Ionicons name="notifications-outline" size={24} color="white" />
        {unreadNotifications > 0 && (
          <NotificationBadge>
            <NotificationBadgeText>
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </NotificationBadgeText>
          </NotificationBadge>
        )}
      </NotificationButton>
    </HeaderRow>
  ),
);

CompetitionsHeader.displayName = "CompetitionsHeader";

interface CompetitionTypeIconProps {
  isLeague: boolean;
  type: string;
}

const CompetitionTypeIcon = memo<CompetitionTypeIconProps>(
  ({ isLeague, type }) => {
    const isDoubles = type === "Doubles";

    return (
      <MetaIconRow>
        <Image
          source={isLeague ? trophies[4] : medals[4]}
          style={{
            width: isLeague ? 14 : 18,
            height: isLeague ? 14 : 18,
            tintColor: isLeague ? "#FFA500" : "#0099f0",
          }}
          resizeMode="contain"
        />
        <Ionicons
          name={isDoubles ? "people-outline" : "person-outline"}
          size={18}
          color="#8899aa"
        />
      </MetaIconRow>
    );
  },
);

CompetitionTypeIcon.displayName = "CompetitionTypeIcon";

// ── List item
interface CompetitionListItemProps {
  competition: CompetitionWithMeta;
  onPress: () => void;
  currentUser: UserProfile | null;
}

const CompetitionListItem = memo<CompetitionListItemProps>(
  ({ competition, onPress, currentUser }) => {
    const userId = currentUser?.userId;
    const isLeague = competition.competitionType === COMPETITION_TYPES.LEAGUE;
    const location = competition.location?.city || "N/A";

    const { userRank, wins } = useMemo(() => {
      if (!userId) return { userRank: 0, wins: 0 };

      const isDoublesTournament =
        competition.competitionType === COMPETITION_TYPES.TOURNAMENT &&
        competition.type === "Doubles";

      if (isDoublesTournament) {
        const team = (competition.teams || []).find((teamItem) =>
          teamItem.teamKey?.includes(userId),
        );
        return {
          userRank: getTeamRankInCompetition(competition.teams, userId),
          wins: team?.numberOfWins ?? 0,
        };
      }

      const participant = competition.participants?.find(
        (member) => member.userId === userId,
      );
      return {
        userRank: getPlayerRankInCompetition(competition.participants, userId),
        wins: participant?.numberOfWins ?? 0,
      };
    }, [
      competition.participants,
      competition.teams,
      competition.type,
      competition.competitionType,
      userId,
    ]);

    const gamesCompleted = useMemo(() => {
      const isUserInGame = (game: Game) =>
        game.team1?.player1?.userId === userId ||
        game.team1?.player2?.userId === userId ||
        game.team2?.player1?.userId === userId ||
        game.team2?.player2?.userId === userId;

      if (isLeague) {
        const userGames = (competition.games || []).filter(isUserInGame);
        const completed = userGames.filter(
          (game) => game.approvalStatus === "approved",
        ).length;
        return `${completed}`;
      }

      const userGames = (competition.fixtures || [])
        .flatMap((fixture) => fixture.games || [])
        .filter(isUserInGame);
      const completed = userGames.filter(
        (game) => game.approvalStatus === "approved",
      ).length;

      return `${completed}/${userGames.length}`;
    }, [isLeague, competition.games, competition.fixtures, userId]);

    const pendingApprovalCount = useMemo(() => {
      const isUserInGame = (game: Game) =>
        game.team1?.player1?.userId === userId ||
        game.team1?.player2?.userId === userId ||
        game.team2?.player1?.userId === userId ||
        game.team2?.player2?.userId === userId;

      return (competition.games || []).reduce((count, game) => {
        const isPending =
          game.approvalStatus === "pending" ||
          game.approvalStatus === "Pending";
        return isUserInGame(game) && isPending ? count + 1 : count;
      }, 0);
    }, [competition.games, userId]);

    const activityMessage = useMemo(() => {
      if (competition.prizesDistributed) {
        const placementImage =
          userRank >= 1 && userRank <= 4
            ? (isLeague ? trophies : medals)[userRank - 1]
            : null;
        return { type: "prizesDistributed" as const, placementImage };
      }

      if (pendingApprovalCount > 0) {
        return {
          type: "text" as const,
          text: `${pendingApprovalCount} ${pendingApprovalCount === 1 ? "game" : "games"} awaiting approval`,
          color: "#FFA500",
        };
      }

      const playedGames = isLeague
        ? (competition.games || []).filter(
            (game) => game.approvalStatus === "approved",
          )
        : (competition.fixtures || [])
            .flatMap((fixture) => fixture.games || [])
            .filter((game) => game.result);

      if (
        !isLeague &&
        competition.fixturesGenerated &&
        playedGames.length === 0
      ) {
        return {
          type: "text" as const,
          text: "Fixtures generated",
          color: "#00a700ff",
        };
      }

      const createdRecently =
        getTime(competition.createdAt) >
        Date.now() - 1000 * 60 * 60 * 24 * NEW_COMPETITION_WINDOW_DAYS;
      if (
        playedGames.length === 0 &&
        !competition.fixturesGenerated &&
        createdRecently
      ) {
        return {
          type: "text" as const,
          text: isLeague ? "New league" : "New tournament",
          color: "#8899aa",
        };
      }

      return null;
    }, [
      competition.prizesDistributed,
      pendingApprovalCount,
      competition.games,
      competition.fixtures,
      competition.fixturesGenerated,
      competition.createdAt,
      isLeague,
      userRank,
    ]);

    return (
      <ListItemContainer
        onPress={onPress}
        style={{ opacity: competition.isExpired ? 0.5 : 1 }}
      >
        <RowContainer>
          <LeftColumn>
            <CompetitionAvatar>
              {competition.image ? (
                <AvatarImage
                  source={{ uri: competition.image }}
                  resizeMode="cover"
                />
              ) : (
                <AvatarFallback>
                  <Image
                    source={isLeague ? trophies[4] : medals[4]}
                    style={{
                      width: isLeague ? 22 : 25,
                      height: isLeague ? 22 : 25,
                      tintColor: isLeague ? "#FFA500" : "#0099f0",
                    }}
                    resizeMode="contain"
                  />
                </AvatarFallback>
              )}
            </CompetitionAvatar>
          </LeftColumn>

          <ContentColumn>
            {/* Row 1: info (left) + stats (right) */}
            <TopRow>
              <CompetitionInfo>
                <NameRow>
                  <CompetitionName numberOfLines={1}>
                    {competition.name}
                  </CompetitionName>
                </NameRow>
                <CompetitionLocation>{location}</CompetitionLocation>
              </CompetitionInfo>

              <StatsRow>
                <StatBlock>
                  <StatLabel>Wins</StatLabel>
                  <StatValue>{wins}</StatValue>
                </StatBlock>
                <StatBlock>
                  <StatLabel>Rank</StatLabel>
                  <StatValue>
                    <RankSuffix
                      number={userRank}
                      numberStyle={{
                        fontSize: isSmallScreen ? 22 : 27,
                        color: "white",
                        fontWeight: "bold",
                      }}
                      suffixStyle={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: isSmallScreen ? 12 : 14,
                      }}
                      style={[]}
                    />
                  </StatValue>
                </StatBlock>
              </StatsRow>
            </TopRow>

            {/* Row 2: completed (left) + activity (right) */}
            <MetaRow>
              <MetaLeft>
                <Ionicons
                  name={
                    competition.type === "Doubles"
                      ? "people-outline"
                      : "person-outline"
                  }
                  size={14}
                  color="#8899aa"
                />
                <GamesCompletedText>{`${gamesCompleted} Games Completed`}</GamesCompletedText>
              </MetaLeft>
              {activityMessage?.type === "prizesDistributed" ? (
                <PrizesRow>
                  {activityMessage.placementImage && (
                    <Image
                      source={activityMessage.placementImage}
                      style={{ width: 15, height: 15 }}
                      resizeMode="contain"
                    />
                  )}
                  <Ionicons name="checkmark-circle" size={15} color="green" />
                </PrizesRow>
              ) : activityMessage ? (
                <ActivityMessageText style={{ color: activityMessage.color }}>
                  {activityMessage.text}
                </ActivityMessageText>
              ) : null}
            </MetaRow>
          </ContentColumn>
        </RowContainer>
      </ListItemContainer>
    );
  },
);

CompetitionListItem.displayName = "CompetitionListItem";
const CompetitionName = styled.Text({
  fontSize: isSmallScreen ? 14 : 17,
  fontWeight: "600",
  color: "white",
  flexShrink: 1,
});

const CompetitionLocation = styled.Text({
  fontSize: isSmallScreen ? 11 : 12,
  color: "#8899aa",
});

const StatLabel = styled.Text({
  fontSize: isSmallScreen ? 10 : 11,
  color: "#8899aa",
});

const StatValue = styled.Text({
  fontSize: isSmallScreen ? 22 : 27,
  fontWeight: "bold",
  color: "white",
});

const GamesCompletedText = styled.Text({
  fontSize: isSmallScreen ? 10 : 12,
  color: "#8899aa",
});

const ActivityMessageText = styled.Text({
  fontSize: isSmallScreen ? 10 : 12,
  flexShrink: 0,
});

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
});

const EmptyInner = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
});

const EmptyText = styled.Text({
  fontSize: 14,
  color: "#aaa",
  textAlign: "center",
});

const ListItemContainer = styled.TouchableOpacity({
  flexDirection: "column",
  padding: 15,
  backgroundColor: "rgb(3, 16, 31)",
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
});

const TopRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
});

const CompetitionInfo = styled.View({
  flexDirection: "column",
  flex: 1,
  marginRight: 10,
});

const StatsRow = styled.View({
  flexDirection: "row",
  gap: 16,
  alignItems: "flex-start",
});

const MetaRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginTop: 5,
});

const MetaLeft = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
});

const NameRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const PrizesRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  // gap: 2,
});

const AVATAR_SIZE = isSmallScreen ? 44 : 52;
const MetaIconRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
});

const LeftColumn = styled.View({
  width: AVATAR_SIZE,
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
});

const CompetitionAvatar = styled.View({
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  borderRadius: AVATAR_SIZE / 2,
  marginRight: 12,
  overflow: "hidden",
  backgroundColor: "rgb(9, 33, 62)",
  justifyContent: "center",
  alignItems: "center",
});

const AvatarImage = styled.Image({
  width: "100%",
  height: "100%",
});

const AvatarFallback = styled.View({
  width: "100%",
  height: "100%",
  justifyContent: "center",
  alignItems: "center",
});

const RowContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  width: "100%",
  gap: 12,
});

const ContentColumn = styled.View({
  flex: 1,
  flexDirection: "column",
});

const HeaderRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 20,
  marginBottom: 10,
  paddingHorizontal: 20,
});

const HeaderText = styled.Text({
  fontSize: isSmallScreen ? 20 : 24,
  fontWeight: "bold",
  color: "white",
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
});

const AddButton = styled.TouchableOpacity({
  width: isSmallScreen ? 30 : 34,
  height: isSmallScreen ? 30 : 34,
  borderRadius: 17,
  borderWidth: 3,
  borderColor: "#00A2FF",
  justifyContent: "center",
  alignItems: "center",
});

const NotificationButton = styled.TouchableOpacity({
  padding: 4,
});

const NotificationBadge = styled.View({
  position: "absolute",
  top: -2,
  right: -4,
  backgroundColor: "red",
  borderRadius: 9,
  minWidth: 18,
  height: 18,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 4,
});

const NotificationBadgeText = styled.Text({
  color: "white",
  fontSize: 10,
  fontWeight: "bold",
});

const StatBlock = styled.View({
  alignItems: "center",
});

export default CompetitionsScreen;
