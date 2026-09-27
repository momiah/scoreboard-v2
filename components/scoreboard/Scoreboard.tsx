import React, {
  useState,
  useContext,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { FlatList, View, ActivityIndicator, Animated } from "react-native";
import AddGameModal from "../Modals/AddGameModal";
import { getButtonConfig, getFallbackMessage } from "./scoreboardConfig";
import { TeamColumn, ScoreDisplay } from "./ScoreboardAtoms";
import GameGlow, { runGlow } from "./../GameCardGlow";
import moment from "moment";
import { LeagueContext } from "../../context/LeagueContext";
import { CollectionName, Game, ScoreboardProfile } from "@shared/types";
import { COLLECTION_NAMES, COMPETITION_TYPES } from "@shared";

interface ScoreboardProps {
  leagueGames?: Game[];
  leagueId: string;
  userRole?: string;
  leagueType: string;
  leagueOwner: { userId: string; username: string };
  leagueStartDate: string;
  leagueEndDate: string;
  leagueName: string;
  leagueParticipants?: ScoreboardProfile[];
  isJoinRequestSending?: boolean;
  scrollToGameId?: string;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  leagueGames = [],
  leagueId,
  userRole = "user",
  leagueType,
  leagueOwner,
  leagueStartDate,
  leagueEndDate,
  leagueName,
  leagueParticipants = [],
  isJoinRequestSending = false,
  scrollToGameId,
}) => {
  const { currentUser } = useContext(UserContext);
  const { requestToJoinLeague } = useContext(LeagueContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [modalVisible, setModalVisible] = useState(false);
  const [requestSend, setRequestSend] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [highlightedGameId, setHighlightedGameId] = useState<string | null>(
    null,
  );

  const currentDate = moment();
  const leagueStart = moment(leagueStartDate, "DD-MM-YYYY");
  const leagueEnd = moment(leagueEndDate, "DD-MM-YYYY");

  const hasLeagueStarted = currentDate.isSameOrAfter(leagueStart);
  const hasLeagueEnded = currentDate.isAfter(leagueEnd);
  const leagueState = hasLeagueEnded
    ? "ended"
    : hasLeagueStarted
      ? "started"
      : "not_started";

  const gamesDescending = useMemo(
    () => (leagueGames || []).filter(Boolean).reverse(),
    [leagueGames],
  );
  const gamesExist = gamesDescending.length > 0;

  const playersCount = leagueParticipants.length;
  const minRequired = 4;
  const hasMinPlayers = playersCount >= minRequired;

  const handleAddGame = useCallback(() => {
    setModalVisible(true);
  }, [leagueId]);

  const handleLogin = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  const handleRequestSend = useCallback(() => {
    setRequestSend(true);
    requestToJoinLeague({
      competitionId: leagueId,
      currentUser: currentUser?.userId,
      ownerId: leagueOwner.userId,
      collectionName: COLLECTION_NAMES.leagues as CollectionName,
    });
    setRequestSend(false);
  }, [requestToJoinLeague, leagueId, currentUser, leagueOwner]);

  const handleGamePress = useCallback(
    (game: Game) => {
      navigation.navigate("GameScreen", {
        gameId: game.gameId,
        competitionId: leagueId,
        competitionType: COMPETITION_TYPES.LEAGUE,
        competitionName: leagueName,
        gamescore: game.gamescore,
        date: game.date ?? "",
        team1: game.team1,
        team2: game.team2,
      });
    },
    [navigation, leagueId, leagueName],
  );

  const isSending = requestSend || isJoinRequestSending;

  const buttonConfig = useMemo(
    () =>
      getButtonConfig(
        userRole,
        leagueState,
        isSending,
        handleRequestSend,
        handleAddGame,
        handleLogin,
        hasMinPlayers,
        minRequired,
      ),
    [
      userRole,
      leagueState,
      isSending,
      handleRequestSend,
      handleAddGame,
      handleLogin,
      hasMinPlayers,
      minRequired,
    ],
  );

  const fallbackMessage = useMemo(
    () => getFallbackMessage(leagueState, gamesExist, userRole),
    [leagueState, gamesExist, userRole],
  );

  const uniqueDates = useMemo(() => {
    const seen = new Set<string>();
    return gamesDescending
      .map((game) => game.date)
      .filter((date): date is string => {
        if (!date || seen.has(date)) return false;
        seen.add(date);
        return true;
      });
  }, [gamesDescending]);

  const filteredGames = useMemo(() => {
    if (!selectedDate) return gamesDescending;
    return gamesDescending.filter((game) => game.date === selectedDate);
  }, [gamesDescending, selectedDate]);

  const gamesListRef = useRef<FlatList<Game>>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  const scrollIndex = useMemo(() => {
    if (!scrollToGameId) return -1;
    return filteredGames.findIndex((game) => game.gameId === scrollToGameId);
  }, [scrollToGameId, filteredGames]);

  useEffect(() => {
    if (scrollToGameId) setSelectedDate(null);
  }, [scrollToGameId]);

  useEffect(() => {
    if (scrollIndex < 0) return;
    const timer = setTimeout(() => {
      gamesListRef.current?.scrollToIndex({
        index: scrollIndex,
        animated: true,
        viewPosition: 0,
      });
      setHighlightedGameId(scrollToGameId ?? null);
      runGlow(glowAnim, () => setHighlightedGameId(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [scrollIndex]);

  return (
    <Container>
      <AddGameButton
        disabled={buttonConfig.disabled}
        onPress={buttonConfig.action}
        style={{ backgroundColor: buttonConfig.disabled ? "gray" : "#00A2FF" }}
      >
        <ButtonText>{buttonConfig.text}</ButtonText>
        {isSending && (
          <ActivityIndicator
            size="small"
            color="white"
            style={{ marginLeft: 8 }}
          />
        )}
      </AddGameButton>

      <View>
        {uniqueDates.length > 0 && (
          <FlatList
            data={["All", ...uniqueDates]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ minHeight: 40, marginBottom: 20 }}
            renderItem={({ item }) => (
              <DateItem
                onPress={() => setSelectedDate(item === "All" ? null : item)}
                isSelected={
                  (selectedDate === null && item === "All") ||
                  selectedDate === item
                }
              >
                <DateText>
                  {item === "All"
                    ? "All Games"
                    : moment(item, "DD-MM-YYYY").format("D MMM YY")}
                </DateText>
              </DateItem>
            )}
          />
        )}
      </View>

      {!gamesExist && fallbackMessage && (
        <FallbackMessage>{fallbackMessage}</FallbackMessage>
      )}

      <FlatList
        ref={gamesListRef}
        data={filteredGames}
        keyExtractor={(item) => item.gameId}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            gamesListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0,
            });
          }, 300);
        }}
        renderItem={({ item }) => {
          const isPending =
            item.approvalStatus === "pending" ||
            item.approvalStatus === "Pending";
          const isHighlighted = item.gameId === highlightedGameId;

          return (
            <CardWrapper>
              {isHighlighted && (
                <GameGlow glowAnim={glowAnim} color="#FFA500" />
              )}
              <GameContainer
                onPress={() => handleGamePress(item)}
                style={{ opacity: isPending ? 0.6 : 1 }}
              >
                <TeamColumn
                  team="left"
                  players={item.team1}
                  leagueType={leagueType}
                />
                <ScoreDisplay
                  date={item.date}
                  team1={item.team1.score}
                  team2={item.team2.score}
                  item={item}
                />
                <TeamColumn
                  team="right"
                  players={item.team2}
                  leagueType={leagueType}
                />
              </GameContainer>
            </CardWrapper>
          );
        }}
      />

      <AddGameModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        leagueId={leagueId}
        leagueGames={leagueGames}
        leagueType={leagueType}
        leagueName={leagueName}
      />
    </Container>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.View({
  flex: 1,
  padding: 10,
});

const AddGameButton = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 6,
  marginBottom: 15,
  padding: 10,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
});

const DateText = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
});

const CardWrapper = styled.View({
  position: "relative",
  marginBottom: 16,
  overflow: "visible",
});

const GameContainer = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 8,
});

const FallbackMessage = styled.Text({
  color: "#aaa",
  fontStyle: "italic",
  fontSize: 16,
  textAlign: "center",
  marginTop: 50,
});

const ButtonText = styled.Text({
  color: "white",
  fontSize: 16,
});

const DateItem = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    borderBottomColor: isSelected ? "#00A2FF" : "rgb(9, 33, 62)",
    borderBottomWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  }),
);

export default React.memo(Scoreboard);
