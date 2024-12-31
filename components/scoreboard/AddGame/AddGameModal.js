import React, { useState, useEffect, useContext } from "react";
import {
  Modal,
  TextInput,
  Button,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { GameContext } from "../../../context/GameContext";
import { UserContext } from "../../../context/UserContext";
import { PopupContext } from "../../../context/PopupContext";
import styled from "styled-components/native";
import Popup from "../../popup/Popup";
import SelectPlayer from "./SelectPlayer";
import moment from "moment";
import { AntDesign } from "@expo/vector-icons";
import { generateUniqueGameId } from "../../../functions/generateUniqueId";
import { getPlayersToUpdate } from "../../../functions/getPlayersToUpdate";
import RegisterPlayer from "./RegisterPlayer";
import AddGame from "./AddGame";

const AddGameModal = ({
  modalVisible,
  setModalVisible,
  leagueId,
  leagueGames,
}) => {
  const { games, addGame } = useContext(GameContext);
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);
  const { retrievePlayers, updatePlayers } = useContext(UserContext);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState({
    team1: ["", ""],
    team2: ["", ""],
  });

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");

    setModalVisible(false);
  };

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
    console.log("Adding game...");
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

    const gameId = generateUniqueGameId(leagueGames);
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
      retrievePlayers,
      leagueId
      // setPreviousPlayerRecord,
      // previousPlayerRecord
    );
    await updatePlayers(playersToUpdate, leagueId);

    await addGame(newGame, gameId, leagueId);
    setSelectedPlayers({ team1: ["", ""], team2: ["", ""] });
    setTeam1Score("");
    setTeam2Score("");

    handleShowPopup("Game added and players updated successfully!");
    console.log("Closing modal", modalVisible);
    console.log("Game added successfully.");
  };

  return (
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
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                alignSelf: "flex-end",
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
              }}
            >
              <AntDesign name="closecircleo" size={30} color="red" />
            </TouchableOpacity>

            <AddGame
              team1Score={team1Score}
              setTeam1Score={setTeam1Score}
              team2Score={team2Score}
              setTeam2Score={setTeam2Score}
              selectedPlayers={selectedPlayers}
              handleSelectPlayer={handleSelectPlayer}
            />

            <ButtonContainer>
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
  );
};

const { width: screenWidth } = Dimensions.get("window");

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
  width: screenWidth - 20,
});

const ButtonContainer = styled.View({
  alignItems: "center",
  marginTop: 20,
  marginBottom: 20,
  paddingRight: 5,
  paddingLeft: 5,
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

const GameContainer = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  border: "1px solid #262626",
  borderRadius: 8,
  height: screenWidth <= 400 ? 100 : null,
  backgroundColor: "#001123",
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
  marginTop: screenWidth <= 400 ? 20 : null,
});

const ScoreInput = styled.TextInput({
  fontSize: 30,
  fontWeight: "bold",
  margin: "0 5px",
  textAlign: "center",
  color: "#00A2FF",
});

export default AddGameModal;
