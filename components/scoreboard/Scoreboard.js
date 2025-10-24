// components/scoreboard/Scoreboard.tsx
import React, { useState, useContext, useMemo, useCallback } from "react";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import { FlatList, View, ActivityIndicator } from "react-native";
import AddGameModal from "../Modals/AddGameModal";
import { getButtonConfig, getFallbackMessage } from "./scoreboardConfig";
import { TeamColumn, ScoreDisplay } from "./ScoreboardAtoms";
import moment from "moment";
import { LeagueContext } from "../../context/LeagueContext";

const Scoreboard = ({
  leagueGames = [],
  leagueId,
  userRole = "user",
  leagueType,
  leagueOwner,
  leagueStartDate,
  leagueEndDate,
  leagueName,
  leagueParticipants = [],
  maxPlayers = 8,
  // 🔹 New optional flag – no handler passed
  isJoinRequestSending = false,
}) => {
  const { fetchPlayers, currentUser } = useContext(UserContext);
  const { requestToJoinLeague } = useContext(LeagueContext);

  const [modalVisible, setModalVisible] = useState(false);
  const [requestSend, setRequestSend] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const navigation = useNavigation();

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
    [leagueGames]
  );
  const gamesExist = gamesDescending.length > 0;

  const playersCount = leagueParticipants.length;
  const minRequired = 4;
  const hasMinPlayers = playersCount >= minRequired;

  const handleAddGame = useCallback(() => {
    fetchPlayers(leagueId);
    setModalVisible(true);
  }, [fetchPlayers, leagueId]);

  const handleLogin = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  const handleRequestSend = useCallback(() => {
    // ✅ Keep your original local flow
    setRequestSend(true);
    requestToJoinLeague(
      leagueId,
      currentUser?.userId,
      leagueOwner.userId,
      currentUser?.username
    );
    setRequestSend(false);
  }, [requestToJoinLeague, leagueId, currentUser, leagueOwner]);

  // 🔹 Merge local + external (header press) flags
  const isSending = requestSend || isJoinRequestSending;

  const buttonConfig = useMemo(
    () =>
      getButtonConfig(
        userRole,
        leagueState,
        isSending, // <- only this changes
        handleRequestSend,
        handleAddGame,
        handleLogin,
        hasMinPlayers,
        minRequired
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
    ]
  );

  const fallbackMessage = useMemo(
    () => getFallbackMessage(leagueState, gamesExist, userRole),
    [leagueState, gamesExist, userRole]
  );

  const uniqueDates = useMemo(() => {
    const seen = new Set();
    return gamesDescending
      .map((game) => game.date)
      .filter((date) => {
        if (seen.has(date)) return false;
        seen.add(date);
        return true;
      });
  }, [gamesDescending]);

  const filteredGames = useMemo(() => {
    if (!selectedDate) return gamesDescending;
    return gamesDescending.filter((game) => game.date === selectedDate);
  }, [gamesDescending, selectedDate]);

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
            contentContainerStyle={{
              minHeight: 40,
              marginBottom: 20,
            }}
            renderItem={({ item }) => (
              <DateItem
                onPress={() => setSelectedDate(item === "All" ? null : item)}
                item={item}
                selectedDate={selectedDate}
              >
                <Date>
                  {item === "All"
                    ? "All Games"
                    : moment(item, "DD-MM-YYYY").format("D MMM YY")}
                </Date>
              </DateItem>
            )}
          />
        )}
      </View>

      {!gamesExist && fallbackMessage && (
        <FallbackMessage>{fallbackMessage}</FallbackMessage>
      )}

      <FlatList
        data={filteredGames}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          const Game =
            item.approvalStatus === "pending"
              ? PendingApprovalContainer
              : GameContainer;

          return (
            <Game>
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
            </Game>
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

const Date = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
});

const GameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  backgroundColor: "#001123",
  border: "1px solid rgb(9, 33, 62)",
  borderRadius: 8,
});
const PendingApprovalContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  backgroundColor: "#001123",
  border: "1px solid rgb(9, 33, 62)",
  borderRadius: 8,
  opacity: 0.6,
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

const DateItem = styled.TouchableOpacity(({ item, selectedDate }) => ({
  borderBottomColor:
    (selectedDate === null && item === "All") || selectedDate === item
      ? "#00A2FF"
      : "rgb(9, 33, 62)",
  borderBottomWidth: 2,
  paddingHorizontal: 10,
  paddingVertical: 8,
  marginRight: 10,
  justifyContent: "center",
  alignItems: "center",
}));

export default React.memo(Scoreboard);
