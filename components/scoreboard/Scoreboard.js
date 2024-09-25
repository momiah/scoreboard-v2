import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  TextInput,
  StyleSheet,
} from "react-native";
import styled from "styled-components/native";
import AddPlayer from "./AddPlayer";
import { generateUniqueGameId } from "../../functions/generateUniqueId";
import moment from "moment";
import Popup from "../popup/Popup";
import { GameContext } from "../../context/GameContext";
import { AntDesign } from "@expo/vector-icons";
import { Dimensions } from "react-native";
import { getPlayersToUpdate } from "../../functions/getPlayersToUpdate";

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

const Scoreboard = () => {
  const {
    games,
    setGames,
    addGame,
    showPopup,
    setShowPopup,
    handleShowPopup,
    popupMessage,
    setPopupMessage,
    registerPlayer,
    fetchPlayers,
    player,
    retrievePlayers,
    setPlayer,
    updatePlayers,
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
  const [previousPlayerRecord, setPreviousPlayerRecord] = useState([]);

  useEffect(() => {
    // Logic to fetch and set newestGameId
    if (games.length > 0) {
      setNewestGameId(games[0].gameId);
    }
    fetchPlayers();
  }, [games]);

  // console.log(
  //   "previousPlayerRecord",
  //   JSON.stringify(previousPlayerRecord, null, 2)
  // );

  // console.log("number of previous player records", previousPlayerRecord.length);

  //////////////////////////
  //UPDATE - CURRENTLY ABLE TO DELETE A GAME AND REVERT PLAYER STATS BACK TO PREVIOUS STATE BUT WILL
  // NEED TO ADD FUNCTIONALITY TO DELETE FURTHER BACK THAN JUST THE PREVIOUS GAME AND UPDATE PLAYER STATS ACCORDINGLY
  //////////////////////////
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

  // const getPlayersToUpdate = async (game) => {
  //   const allPlayers = await retrievePlayers(); // Fetch all players

  //   // Filter out players that are in the winning and losing teams
  //   const playersToUpdate = allPlayers.filter((player) =>
  //     game.result.winner.players
  //       .concat(game.result.loser.players)
  //       .includes(player.id)
  //   );

  //   const previousRecord = JSON.parse(JSON.stringify(playersToUpdate));
  //   setPreviousPlayerRecord([...previousPlayerRecord, previousRecord]);

  //   // Function to update player stats
  //   const updatePlayerStats = (player, isWinner) => {
  //     player.newPlayer.numberOfGamesPlayed += 1;

  //     if (isWinner) {
  //       player.newPlayer.numberOfWins += 1;
  //     } else {
  //       player.newPlayer.numberOfLosses += 1;
  //     }

  //     // Calculate win percentage if needed
  //     player.newPlayer.winPercentage =
  //       (player.newPlayer.numberOfWins / player.newPlayer.numberOfGamesPlayed) *
  //       100;

  //     return player;
  //   };

  //   // Update stats for winning players
  //   game.result.winner.players.forEach((winnerId) => {
  //     const player = playersToUpdate.find((p) => p.id === winnerId);
  //     if (player) {
  //       updatePlayerStats(player, true); // true indicates the player is a winner
  //     }
  //   });

  //   // Update stats for losing players
  //   game.result.loser.players.forEach((loserId) => {
  //     const player = playersToUpdate.find((p) => p.id === loserId);
  //     if (player) {
  //       updatePlayerStats(player, false);
  //     }
  //   });

  //   return playersToUpdate;
  // };

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

    const playersToUpdate = await getPlayersToUpdate(
      newGame,
      // retrievePlayers,
      setPreviousPlayerRecord,
      previousPlayerRecord
    );
    await updatePlayers(playersToUpdate);

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

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");
  };

  const handleAddGameButton = () => {
    fetchPlayers();
    setModalVisible(true);
  };

  const settingPlayer = (newPlayer) => {
    setPlayer(newPlayer);
  };

  // const revertPreviousGamePlayerRecord = async (previousPlayerRecord) => {
  //   await updatePlayers(previousPlayerRecord[0]);
  // };

  return (
    <Container>
      <AddGameButton onPress={() => handleAddGameButton()}>
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
                      borderType={"topLeft"}
                    />
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team1", 1, player)
                      }
                      selectedPlayers={selectedPlayers}
                      borderType={"bottomLeft"}
                    />
                  </TeamContainer>

                  <ResultsContainer>
                    <Text style={{ color: "white" }}>
                      {moment().format("DD-MM-YYYY")}
                    </Text>
                    <ScoreContainer
                      style={{ width: screenWidth <= 400 ? 80 : 100 }}
                    >
                      <ScoreInput
                        keyboardType="numeric"
                        placeholder="0"
                        value={team1Score}
                        onChangeText={handleScoreChange(setTeam1Score)}
                      />
                      <Text style={{ fontSize: 30, color: "#00A2FF" }}>-</Text>
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
                      borderType={"topRight"}
                    />
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team2", 1, player)
                      }
                      selectedPlayers={selectedPlayers}
                      borderType={"bottomRight"}
                    />
                  </TeamContainer>
                </GameContainer>

                <PlayerInputContainer>
                  <PlayerInput
                    onChangeText={(newPlayer) => settingPlayer(newPlayer)}
                    value={player}
                    placeholder="register player"
                    placeholderTextColor="#00A2FF"
                  />
                  <RegisterPlayerButton onPress={() => registerPlayer(player)}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "white",
                      }}
                    >
                      Register Player
                    </Text>
                  </RegisterPlayerButton>
                </PlayerInputContainer>

                <ButtonContainer>
                  <AntDesign
                    onPress={() => setModalVisible(false)}
                    name="closecircleo"
                    size={30}
                    color="red"
                  />

                  <SubmitButton onPress={handleAddGame}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: "white",
                      }}
                    >
                      Submit
                    </Text>
                  </SubmitButton>
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
const { width: screenWidth } = Dimensions.get("window");

const AddGameButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 24,
  fontWeight: "bold",
  marginBottom: 15,
  marginTop: 15,
  padding: 10,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 20,
  paddingRight: 5,
  paddingLeft: 5,
});

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

const ModalContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#00152B",
});

const ModalContent = styled.View({
  backgroundColor: "#00152B",
  padding: 20,
  borderRadius: 10,
});

const NonDeletableGameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  backgroundColor: "#001123",
  border: "1px solid #262626",
  borderRadius: 8,
});

const PlayerInput = styled.TextInput({
  fontSize: 15,
  padding: 15,
  borderRadius: 8,
  color: "#00A2FF",
  backgroundColor: "#001123",
  flex: 1,
  borderTopLeftRadius: 8,
  borderBottomLeftRadius: 8,
});

const PlayerInputContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#001123",
  borderRadius: 8,
  padding: 5,
});

const RegisterPlayerButton = styled.TouchableOpacity({
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 8,
  width: 130,
  backgroundColor: "#00A2FF",
  marginLeft: 5,
  borderTopRightRadius: 8,
  borderBottomRightRadius: 8,
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

const ScoreInput = styled.TextInput({
  fontSize: 30,
  fontWeight: "bold",
  margin: "0 5px",
  textAlign: "center",
  color: "#00A2FF",
});

const SubmitButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 8,
  width: screenWidth <= 400 ? 250 : 300,
  backgroundColor: "#00A2FF",
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
