import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { Text, FlatList } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";

import { Dimensions } from "react-native";

import AddGameModal from "../Modals/AddGameModal";
import { getButtonConfig, getFallbackMessage } from "./scoreboardConfig";

import moment from "moment";

const Scoreboard = ({
  leagueGames = [],
  leagueId,
  userRole = "user",
  leagueType,
  leagueStartDate,
  leagueEndDate,
}) => {
  const { fetchPlayers } = useContext(UserContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestSend, setRequestSend] = useState(false);
  const navigation = useNavigation();

  // Date calculations with validation
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

  // Memoized game data with null check
  const reversedGames = useMemo(
    () => (leagueGames || []).filter(Boolean).reverse(),
    [leagueGames]
  );

  const gamesExist = reversedGames.length > 0;

  // Button click handlers
  const handleAddGame = useCallback(() => {
    fetchPlayers(leagueId);
    setModalVisible(true);
  }, [fetchPlayers, leagueId]);

  const handleLogin = useCallback(() => {
    navigation.navigate("Login");
  }, [navigation]);

  const buttonConfig = useMemo(
    () =>
      getButtonConfig(
        userRole,
        leagueState,
        requestSend,
        handleAddGame,
        handleLogin
      ),
    [userRole, leagueState, requestSend, handleAddGame, handleLogin]
  );

  const fallbackMessage = useMemo(
    () => getFallbackMessage(leagueState, gamesExist, userRole),
    [leagueState, gamesExist, userRole]
  );

  return (
    <Container>
      <AddGameButton
        disabled={buttonConfig.disabled}
        onPress={buttonConfig.action}
        style={{ backgroundColor: buttonConfig.disabled ? "gray" : "#00A2FF" }}
      >
        <ButtonText>{buttonConfig.text}</ButtonText>
      </AddGameButton>

      {!gamesExist && fallbackMessage && (
        <FallbackMessage>{fallbackMessage}</FallbackMessage>
      )}

      <FlatList
        data={reversedGames}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <GameContainer>
            <TeamColumn
              team="left"
              players={item.team1}
              leagueType={leagueType}
            />
            <ScoreDisplay
              date={item.date}
              team1={item.team1.score}
              team2={item.team2.score}
            />
            <TeamColumn
              team="right"
              players={item.team2}
              leagueType={leagueType}
            />
          </GameContainer>
        )}
      />

      <AddGameModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        leagueId={leagueId}
        leagueGames={leagueGames}
        leagueType={leagueType}
      />
    </Container>
  );
};

// Sub-components for better readability
const TeamColumn = ({ team, players = {}, leagueType }) => (
  <TeamContainer>
    <PlayerCell position={team} player={players?.player1} />
    {leagueType === "Doubles" && (
      <PlayerCell position={team} player={players?.player2} />
    )}
  </TeamContainer>
);

const PlayerCell = ({ position, player }) => (
  <TeamTextContainer position={position}>
    <TeamText position={position}>{player}</TeamText>
  </TeamTextContainer>
);

const ScoreDisplay = ({ date, team1, team2 }) => (
  <ResultsContainer>
    <DateText>{date}</DateText>
    <ScoreContainer>
      <Score>
        {team1} - {team2}
      </Score>
    </ScoreContainer>
  </ResultsContainer>
);
// Define styles
const { width: screenWidth } = Dimensions.get("window");

const Container = styled.View({
  flex: 1,
  padding: 10,
});
const AddGameButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 24,
  fontWeight: "bold",
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

const ResultsContainer = styled.View({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  paddingBottom: 30,
});

const Score = styled.Text({
  fontSize: 28,
  fontWeight: "bold",
  color: "#00A2FF",
});

const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  marginTop: screenWidth <= 400 ? 20 : null,
});

const TeamText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 15 : 16,
  textAlign: (props) => (props.position === "right" ? "right" : "left"),
});

const TeamContainer = styled.View({
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});

const TeamTextContainer = styled.View({
  display: "flex",
  flexDirection: "column",
  padding: 15,
  paddingLeft: 20,
  paddingRight: 20,
  width: screenWidth <= 400 ? 125 : 140,
});

const FallbackMessage = styled.Text({
  color: "#696969",
  fontStyle: "italic",
  fontSize: 16,
  textAlign: "center",
  marginTop: 50,
});

const ButtonText = styled.Text({
  color: "white",
  fontSize: 16,
});

const DateText = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
});

export default React.memo(Scoreboard);
