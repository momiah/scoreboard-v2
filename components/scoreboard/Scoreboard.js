import React, { useState, useEffect, useContext } from "react";
import { Text, FlatList } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";

import { Dimensions } from "react-native";

import AddGameModal from "../Modals/AddGameModal";
import { LeagueContext } from "../../context/LeagueContext";
import moment from "moment";

const Scoreboard = ({
  leagueGames,
  leagueId,
  userRole,
  leagueType,
  leagueStartDate,
}) => {
  const { fetchPlayers } = useContext(UserContext);
  const { fetchLeagueById, leagueById } = useContext(LeagueContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestSend, setRequestSend] = useState(false);

  // useEffect(() => {
  //   if (leagueId) {
  //     fetchLeagueById(leagueId);
  //   }
  // }, [leagueId, modalVisible]);

  // const leagueType = leagueById?.leagueType;

  const handleAddGameButton = () => {
    fetchPlayers(leagueId);
    setModalVisible(true);
  };

  let reversedGames = [];
  if (leagueGames.length > 0) {
    for (let i = leagueGames.length - 1; i >= 0; i--) {
      reversedGames.push(leagueGames[i]);
    }
  }

  const startDate = moment(leagueStartDate, "DD-MM-YYYY");
  const todaysDate = moment();

  const hasLeagueStarted = todaysDate.isSameOrAfter(startDate);

  console.log("user role", userRole);

  // const reverseGames =leagueById.games.reverse()
  return (
    <Container>
      {/* Participant or Admin Actions */}
      {/* {userRole !== "user" && userRole !== "hide" && (
        <>
          {!hasLeagueStarted ? (
            <AddGameButton
              style={{
                backgroundColor: !hasLeagueStarted ? "gray" : "#00A2FF",
              }}
            >
              <Text>League has not started yet</Text>
            </AddGameButton>
          ) : ( */}
      <AddGameButton onPress={handleAddGameButton}>
        <Text>Add Game</Text>
      </AddGameButton>
      {/* )}
        </>
      )} */}

      {/* Regular User Actions */}
      {userRole === "user" && (
        <AddGameButton
          disabled={requestSend}
          style={{ backgroundColor: requestSend ? "gray" : "#00A2FF" }}
          onPress={() => setRequestSend(true)}
        >
          <Text>
            {requestSend ? "Request sent successfully" : "Join League"}
          </Text>
        </AddGameButton>
      )}
      {hasLeagueStarted &&
        userRole !== "user" &&
        reversedGames.length === 0 && (
          <FallbackMessage>Add a game to see scores 🚀</FallbackMessage>
        )}

      {!hasLeagueStarted && reversedGames.length === 0 && (
        <FallbackMessage>League has not started yet</FallbackMessage>
      )}
      <FlatList
        data={reversedGames}
        keyExtractor={(item, index) => index}
        renderItem={({ item }) => (
          <>
            <GameContainer>
              <TeamContainer>
                <TeamTextContainer style={{ borderTopLeftRadius: 8 }}>
                  <Team>{item.team1.player1}</Team>
                </TeamTextContainer>
                <TeamTextContainer style={{ borderBottomLeftRadius: 8 }}>
                  <Team>{item.team1.player2}</Team>
                </TeamTextContainer>
              </TeamContainer>

              <ResultsContainer>
                <Date>{item.date}</Date>
                <ScoreContainer>
                  <Score>{item.team1.score} - </Score>
                  <Score>{item.team2.score}</Score>
                </ScoreContainer>
              </ResultsContainer>

              <TeamContainer>
                <TeamTextContainer style={{ borderTopRightRadius: 8 }}>
                  <Team style={{ textAlign: "right" }}>
                    {item.team2.player1}
                  </Team>
                </TeamTextContainer>
                <TeamTextContainer style={{ borderBottomRightRadius: 8 }}>
                  <Team style={{ textAlign: "right" }}>
                    {item.team2.player2}
                  </Team>
                </TeamTextContainer>
              </TeamContainer>
            </GameContainer>
          </>
        )}
      />
      {modalVisible && (
        <AddGameModal
          modalVisible
          setModalVisible={setModalVisible}
          leagueId={leagueId}
          leagueGames={leagueGames}
          gameType={leagueType}
        />
      )}
    </Container>
  );
};

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
  fontSize: 30,
  fontWeight: "bold",
  color: "#00A2FF",
});

const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  marginTop: screenWidth <= 400 ? 20 : null,
});

const Team = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 15 : 16,
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

export default Scoreboard;
