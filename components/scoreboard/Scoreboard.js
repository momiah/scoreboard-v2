import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  StyleSheet,
} from "react-native";
import styled from "styled-components/native";
import AddPlayer from "./AddPlayer";
// import { retrieveGames } from "../../services/retrieveGame";
import { generateUniqueGameId } from "../../functions/generateUniqueId";
import moment from "moment";
import Popup from "../popup/Popup";
import { GameContext } from "../../context/GameContext";

const calculateWin = (team1, team2) => {
  if (team1.score > team2.score) {
    return {
      winner: {
        team: "Team 1",
        players: [team1.player1, team1.player2],
        score: team1.score,
      },
      loser: {
        team: "Team 2",
        players: [team2.player1, team2.player2],
        score: team2.score,
      },
    };
  } else {
    return {
      winner: {
        team: "Team 2",
        players: [team2.player1, team2.player2],
        score: team2.score,
      },
      loser: {
        team: "Team 1",
        players: [team1.player1, team1.player2],
        score: team1.score,
      },
    };
  }
};

// Define the Scoreboard component
const Scoreboard = () => {
  const {
    games,
    setGames,
    addGame,
    retrieveGames,
    deleteGameById,
    refreshing,
    setRefreshing,
    deleteGameContainer,
    setDeleteGameContainer,
    deleteGameId,
    setDeleteGameId,
  } = useContext(GameContext);

  const [newestGameId, setNewestGameId] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  useEffect(() => {
    // Logic to fetch and set newestGameId
    if (games.length > 0) {
      setNewestGameId(games[0].gameId);
    }
  }, [games]);

  const [selectedPlayers, setSelectedPlayers] = useState({
    team1: ["", ""],
    team2: ["", ""],
  });
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    } catch (error) {
      console.error("Error refreshing games:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectPlayer = (team, index, player) => {
    setSelectedPlayers((prev) => {
      const isPlayerSelected = Object.values(prev).flat().includes(player);
      if (isPlayerSelected) {
        console.log(`${player} is already selected.`);
        return prev;
      }

      const newTeam = [...prev[team]];
      newTeam[index] = player;
      return { ...prev, [team]: newTeam };
    });
  };

  const handleScoreChange = (setScore) => (text) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText.length <= 2) {
      setScore(numericText);
    }
  };

  const handleAddGame = async () => {
    // Check if both teams have selected players
    if (
      selectedPlayers.team1.every((player) => player === "") ||
      selectedPlayers.team2.every((player) => player === "")
    ) {
      handleShowPopup("Please select players for both teams.");
      return;
    }

    // Check if both teams have entered scores
    if (!team1Score || !team2Score) {
      handleShowPopup("Please enter scores for both teams.");
      return;
    }

    const gameId = generateUniqueGameId(games);
    const newGame = {
      gameId: gameId,
      gamescore: `${team1Score} - ${team2Score}`,
      date: moment().format("DD-MM-YYYY"),
      team1: {
        player1: selectedPlayers.team1[0],
        player2: selectedPlayers.team1[1],
        score: parseInt(team1Score) || 0,
      },
      team2: {
        player1: selectedPlayers.team2[0],
        player2: selectedPlayers.team2[1],
        score: parseInt(team2Score) || 0,
      },
      get result() {
        return calculateWin(this.team1, this.team2);
      },
    };

    await addGame(newGame, gameId);
    setSelectedPlayers({ team1: ["", ""], team2: ["", ""] });
    setTeam1Score("");
    setTeam2Score("");
    setModalVisible(false);
  };

  const openDeleteGameContainer = (gameId) => {
    setDeleteGameId(gameId);
    setDeleteGameContainer(true);
  };

  const closeDeleteGameContainer = () => {
    setDeleteGameId(null);
    setDeleteGameContainer(false);
  };

  const handleShowPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");
  };

  return (
    <Container>
      <AddGameButton onPress={() => setModalVisible(true)}>
        <Text>Add Game</Text>
      </AddGameButton>

      <FlatList
        data={games}
        keyExtractor={(item) => item.gameId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <>
            {newestGameId === item.gameId ? (
              <GameContainer
                onPress={() => openDeleteGameContainer(item.gameId)}
              >
                {deleteGameContainer && deleteGameId === item.gameId && (
                  <DeleteGameContainer>
                    <DeleteGameButton
                      onPress={() => deleteGameById(item.gameId, setGames)}
                    >
                      <DeleteGameButtonText>Delete Game</DeleteGameButtonText>
                    </DeleteGameButton>
                    <DeleteGameButton onPress={closeDeleteGameContainer}>
                      <DeleteGameButtonText>Cancel</DeleteGameButtonText>
                    </DeleteGameButton>
                  </DeleteGameContainer>
                )}
                <TeamContainer>
                  <Team>{item.team1.player1}</Team>
                  <Team>{item.team1.player2}</Team>
                </TeamContainer>

                <ResultsContainer>
                  <Date>{item.date}</Date>
                  <ScoreContainer>
                    <Score>{item.team1.score} - </Score>
                    <Score>{item.team2.score}</Score>
                  </ScoreContainer>
                </ResultsContainer>

                <TeamContainer>
                  <Team>{item.team2.player1}</Team>
                  <Team>{item.team2.player2}</Team>
                </TeamContainer>
              </GameContainer>
            ) : (
              <NonDeletableGameContainer>
                <TeamContainer>
                  <Team>{item.team1.player1}</Team>
                  <Team>{item.team1.player2}</Team>
                </TeamContainer>

                <ResultsContainer>
                  <Date>{item.date}</Date>
                  <ScoreContainer>
                    <Score>{item.team1.score} - </Score>
                    <Score>{item.team2.score}</Score>
                  </ScoreContainer>
                </ResultsContainer>

                <TeamContainer>
                  <Team>{item.team2.player1}</Team>
                  <Team>{item.team2.player2}</Team>
                </TeamContainer>
              </NonDeletableGameContainer>
            )}
          </>
        )}
      />

      {modalVisible && (
        <View>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(false);
              setSelectedPlayers({ team1: ["", ""], team2: ["", ""] });
              setTeam1Score("");
              setTeam2Score("");
            }}
          >
            <Popup
              visible={showPopup}
              message={popupMessage}
              onClose={handleClosePopup}
            />
            <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <ModalContent>
                <GameContainer>
                  <TeamContainer>
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team1", 0, player)
                      }
                      selectedPlayers={selectedPlayers}
                    />
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team1", 1, player)
                      }
                      selectedPlayers={selectedPlayers}
                    />
                  </TeamContainer>

                  <ResultsContainer>
                    <Text>{moment().format("DD-MM-YYYY")}</Text>
                    <ScoreContainer style={{ width: 100 }}>
                      <ScoreInput
                        keyboardType="numeric"
                        placeholder="0"
                        value={team1Score}
                        onChangeText={handleScoreChange(setTeam1Score)}
                      />
                      <Text style={{ fontSize: 30 }}>-</Text>
                      <ScoreInput
                        keyboardType="numeric"
                        placeholder="0"
                        value={team2Score}
                        onChangeText={handleScoreChange(setTeam2Score)}
                      />
                    </ScoreContainer>
                  </ResultsContainer>

                  <TeamContainer>
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team2", 0, player)
                      }
                      selectedPlayers={selectedPlayers}
                    />
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team2", 1, player)
                      }
                      selectedPlayers={selectedPlayers}
                    />
                  </TeamContainer>

                  <ScoreContainer></ScoreContainer>
                </GameContainer>

                <ButtonContainer>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.button}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddGame}>
                    <Text style={styles.button}>Submit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => console.log("Register Player")}
                  >
                    <Text style={styles.button}>Register Player</Text>
                  </TouchableOpacity>
                </ButtonContainer>
              </ModalContent>
            </ModalContainer>
          </Modal>
        </View>
      )}
    </Container>
  );
};

// Define styles
const Container = styled.View({
  flex: 1,
  padding: 5,
  backgroundColor: "#fff",
});

const AddGameButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 24,
  fontWeight: "bold",
  marginBottom: 15,
  marginTop: 15,
  padding: 10,
  backgroundColor: "#BBDCFF",
  border: "1px solid #ccc",
});

const GameContainer = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
});
const NonDeletableGameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
});

const DeleteGameContainer = styled.View({
  flex: 1,
  flexDirection: "row",
  backgroundColor: "rgba(0, 0, 0, 0.4 )",
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 50px",
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
  backgroundColor: "#BBDCFF",
  border: "1px solid #ccc",
});

const DeleteGameButtonText = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const TeamContainer = styled.View({
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});

const ResultsContainer = styled.View({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  paddingBottom: 30,
});

const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
});

const Score = styled.Text({
  fontSize: 30,
  fontWeight: "bold",
});
const ScoreInput = styled.TextInput({
  fontSize: 30,
  fontWeight: "bold",
  margin: "0 5px",
  textAlign: "center",
});

const Date = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
});

const Team = styled.Text({
  display: "flex",
  border: "1px solid #ccc",
  flexDirection: "column",
  fontSize: 16,
  padding: 15,
  paddingLeft: 30,
  paddingRight: 30,
  borderRadius: 20,
  width: 130,
});

const ModalContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "white",
});

const ModalContent = styled.View({
  backgroundColor: "#fff",
  padding: 20,
  borderRadius: 10,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-around",
  marginTop: 20,
});

const styles = StyleSheet.create({
  button: {
    padding: 10,
    backgroundColor: "#BBDCFF",
    borderRadius: 5,
  },
});

export default Scoreboard;
