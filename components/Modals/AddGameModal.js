import React, { useState, useEffect, useContext } from "react";
import {
  Modal,
  TextInput,
  Button,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
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
import { LeagueContext } from "../../context/LeagueContext";

const AddGameModal = ({
  modalVisible,
  setModalVisible,
  leagueId,
  leagueGames,
  leagueType = "Singles",
}) => {
  const { addGame } = useContext(GameContext);
  const { fetchLeagueById } = useContext(LeagueContext);
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
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState({
    team1: leagueType === "Singles" ? [""] : ["", ""],
    team2: leagueType === "Singles" ? [""] : ["", ""],
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
          players:
            leagueType === "Singles"
              ? [team1.player1]
              : [team1.player1, team1.player2],
          score: team1.score,
        },
        loser: {
          team: "Team 2",
          players:
            leagueType === "Singles"
              ? [team2.player1]
              : [team2.player1, team2.player2],
          score: team2.score,
        },
      };
    } else {
      return {
        winner: {
          team: "Team 2",
          players:
            leagueType === "Singles"
              ? [team2.player1]
              : [team2.player1, team2.player2],
          score: team2.score,
        },
        loser: {
          team: "Team 1",
          players:
            leagueType === "Singles"
              ? [team1.player1]
              : [team1.player1, team1.player2],
          score: team1.score,
        },
      };
    }
  };

  const handleSelectPlayer = (team, index, player) => {
    setSelectedPlayers((prev) => {
      const isPlayerSelected = Object.values(prev).flat().includes(player);
      if (isPlayerSelected) return prev;

      const newTeam = [...prev[team]];
      if (index >= newTeam.length) return prev; // Prevent index overflow
      newTeam[index] = player;
      return { ...prev, [team]: newTeam };
    });
  };

  const handleAddGame = async () => {
    setLoading(true);
    // Check if both teams have selected players
    if (
      selectedPlayers.team1.every((player) => player === "") ||
      selectedPlayers.team2.every((player) => player === "")
    ) {
      setErrorText("Please select players for both teams.");
      setLoading(false);
      // handleShowPopup("Please select players for both teams.");
      return;
    }

    // Check if both teams have entered scores
    if (!team1Score || !team2Score) {
      setErrorText("Please enter scores for both teams.");
      setLoading(false);
      // handleShowPopup("Please enter scores for both teams.");
      return;
    }

    const gameId = generateUniqueGameId(leagueGames);

    const newGame = {
      gameId,
      gamescore: `${team1Score} - ${team2Score}`,
      date: moment().format("DD-MM-YYYY"),
      team1: {
        player1: selectedPlayers.team1[0],
        player2: leagueType === "Doubles" ? selectedPlayers.team1[1] : null,
        score: parseInt(team1Score) || 0,
      },
      team2: {
        player1: selectedPlayers.team2[0],
        player2: leagueType === "Doubles" ? selectedPlayers.team2[1] : null,
        score: parseInt(team2Score) || 0,
      },
      get result() {
        return calculateWin(this.team1, this.team2, this.leagueType);
      },
    };

    console.log("newGame", JSON.stringify(newGame, null, 2));

    const allPlayers = await retrievePlayers(leagueId);
    const allUsers = await getAllUsers();

    // console.log("allUsers", JSON.stringify(allUsers, null, 2));

    const playersToUpdate = allPlayers.filter((player) =>
      newGame.result.winner.players
        .concat(newGame.result.loser.players)
        .includes(player.id)
    );

    console.log("playersToUpdate", JSON.stringify(playersToUpdate, null, 2));

    // console.log("playersToUpdate", JSON.stringify(playersToUpdate, null, 2));

    //TODO - Instead of using allUsers, use the usersToUpdate array to update only the users that need to be updated
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
    await fetchLeagueById(leagueId);
    setLoading(false);
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
              {errorText && <ErrorText>{errorText}</ErrorText>}

              <SubmitButton onPress={handleAddGame}>
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "white",
                    }}
                  >
                    Submit
                  </Text>
                )}
              </SubmitButton>
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

const SubmitButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  marginTop: 20,
  borderRadius: 8,
  width: screenWidth <= 400 ? 250 : 300,
  backgroundColor: "#00A2FF",
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 10,
  fontStyle: "italic",
});

export default AddGameModal;
