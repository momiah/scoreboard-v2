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
import { GameContext } from "../../context/GameContext";
import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";
import styled from "styled-components/native";
import Popup from "../popup/Popup";
import SelectPlayer from "../scoreboard/AddGame/SelectPlayer";
import moment from "moment";
import { AntDesign } from "@expo/vector-icons";
import { generateUniqueGameId } from "../../functions/generateUniqueId";
import { calculatePlayerPerformance } from "../../functions/calculatePlayerPerformance";
// import RegisterPlayer from "../scoreboard/AddGame/RegisterPlayer";
import AddGame from "../scoreboard/AddGame/AddGame";
import { calculateTeamPerformance } from "../../functions/calculateTeamPerformance";

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const AddGameModal = ({
  modalVisible,
  setModalVisible,
  leagueId,
  leagueGames,
}) => {
  const { addGame } = useContext(GameContext);
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);
  const {
    retrievePlayers,
    updatePlayers,
    updateTeams,
    retrieveTeams,
    getAllUsers,
    updateUsers,
  } = useContext(UserContext);
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

    const allPlayers = await retrievePlayers(leagueId);
    const allUsers = await getAllUsers();

    // console.log("allUsers", JSON.stringify(allUsers, null, 2));

    const playersToUpdate = allPlayers.filter((player) =>
      newGame.result.winner.players
        .concat(newGame.result.loser.players)
        .includes(player.id)
    );

    // console.log("playersToUpdate", JSON.stringify(playersToUpdate, null, 2));

    const getUsersFromPlayersToUpdate = (allUsers, playersToUpdate) => {
      // Extract the userIds from the playersToUpdate array
      const playerUserIds = playersToUpdate.map((player) => player.userId);

      // Filter allUsers to include only those users whose userId is in the playersToUpdate list
      return allUsers.filter((user) => playerUserIds.includes(user.userId));
    };

    const usersToUpdate = getUsersFromPlayersToUpdate(
      allUsers,
      playersToUpdate
    );

    const playerPerformance = calculatePlayerPerformance(
      newGame,
      playersToUpdate,
      usersToUpdate
    );

    await updatePlayers(playerPerformance.playersToUpdate, leagueId);
    await updateUsers(playerPerformance.usersToUpdate);

    // const allTeams = await retrieveTeams(leagueId);

    const teamsToUpdate = await calculateTeamPerformance(
      newGame,
      retrieveTeams,
      leagueId
    );

    await updateTeams(teamsToUpdate, leagueId);

    await addGame(newGame, gameId, leagueId);
    setSelectedPlayers({ team1: ["", ""], team2: ["", ""] });
    setTeam1Score("");
    setTeam2Score("");

    handleShowPopup("Game added and players updated successfully!");

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
          <GradientOverlay colors={["#191b37", "#001d2e"]}>
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
          </GradientOverlay>
        </ModalContainer>
      </Modal>
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const ModalContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)", // Translucent dark blue
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "center",
});
const GradientOverlay = styled(LinearGradient)({
  padding: 2,
  borderRadius: 12,
  opacity: 0.9,
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

export default AddGameModal;
