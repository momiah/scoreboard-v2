import React, { useState, useEffect, useContext } from "react";
import { Text, FlatList, RefreshControl } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../context/GameContext";

import { Dimensions } from "react-native";

import { LeagueContext } from "../../context/LeagueContext";

const Scoreboard = ({ leagueGames, leagueId }) => {
  const {
    // games, from the previous version of the component
    setGames,

    deleteGameById,
    refreshing,
    setRefreshing,
    deleteGameContainer,
    setDeleteGameContainer,
    deleteGameId,
    setDeleteGameId,
  } = useContext(GameContext);

  const { fetchLeagueById, leagueById } = useContext(LeagueContext);

  const [newestGameId, setNewestGameId] = useState("");
  // const [previousPlayerRecord, setPreviousPlayerRecord] = useState([]);

  useEffect(() => {
    if (leagueGames.length > 0) {
      setNewestGameId(leagueGames[0].gameId);
    }
    fetchPlayers(leagueId);
  }, [leagueGames]);

  useEffect(() => {
    if (leagueId) {
      fetchLeagueById(leagueId);
    }
  }, [leagueId, modalVisible]);

  //////////////////////////
  //UPDATE - CURRENTLY ABLE TO DELETE A GAME AND REVERT PLAYER STATS BACK TO PREVIOUS STATE BUT WILL
  // NEED TO ADD FUNCTIONALITY TO DELETE FURTHER BACK THAN JUST THE PREVIOUS GAME AND UPDATE PLAYER STATS ACCORDINGLY
  //////////////////////////

  // const handleRefresh = async () => {
  //   setRefreshing(true);

  //   try {
  //     const retrievedGames = await retrieveGames();
  //     setGames(retrievedGames);
  //   } catch (error) {
  //     console.error("Error refreshing games:", error);
  //   } finally {
  //     setRefreshing(false);
  //   }
  // };

  const openDeleteGameContainer = (gameId) => {
    setDeleteGameId(gameId);
    setDeleteGameContainer(true);
  };

  const closeDeleteGameContainer = () => {
    setDeleteGameId(null);
    setDeleteGameContainer(false);
  };

  return (
    <Container>
      <FlatList
        data={leagueById ? leagueById.games.reverse() : []}
        keyExtractor={(item, index) => index}
        // refreshControl={
        //   <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        // }
        renderItem={({ item }) => (
          <>
            {newestGameId === item.gameId ? (
              <GameContainer
                onPress={() => openDeleteGameContainer(item.gameId)}
              >
                {deleteGameContainer && deleteGameId === item.gameId && (
                  <DeleteGameContainer>
                    <DeleteGameButton
                      style={{ backgroundColor: "red" }}
                      onPress={() => {
                        deleteGameById(item.gameId, setGames);
                        // revertPreviousGamePlayerRecord(previousPlayerRecord);
                      }}
                    >
                      <DeleteGameButtonText>Delete Game</DeleteGameButtonText>
                    </DeleteGameButton>
                    <DeleteGameButton onPress={closeDeleteGameContainer}>
                      <DeleteGameButtonText>Cancel</DeleteGameButtonText>
                    </DeleteGameButton>
                  </DeleteGameContainer>
                )}

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
            ) : (
              <NonDeletableGameContainer>
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
              </NonDeletableGameContainer>
            )}
          </>
        )}
      />
    </Container>
  );
};

// Define styles
const { width: screenWidth } = Dimensions.get("window");

const Container = styled.View({
  flex: 1,
  padding: 10,
  backgroundColor: "#00152B",
});

const Date = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
});

const DeleteGameButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 24,
  fontWeight: "bold",
  marginBottom: 15,
  marginTop: 15,
  padding: 10,
  width: 140,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
});

const DeleteGameButtonText = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const DeleteGameContainer = styled.View({
  flex: 1,
  flexDirection: "row",
  backgroundColor: "rgba(0, 0, 0, 0.7 )",
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  justifyContent: "space-between",
  alignItems: "center",
  padding: screenWidth <= 400 ? "0 40px" : "0 50px",
  gap: screenWidth <= 400 ? 10 : null,
});

const GameContainer = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  border: "1px solid #262626",
  borderRadius: 8,
  height: screenWidth <= 400 ? 100 : null,
  backgroundColor: "#001123",
});

const NonDeletableGameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  backgroundColor: "#001123",
  border: "1px solid #262626",
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

export default Scoreboard;
