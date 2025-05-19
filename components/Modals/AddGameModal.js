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
import { generateUniqueGameId } from "../../helpers/generateUniqueId";
import { calculatePlayerPerformance } from "../../helpers/calculatePlayerPerformance";
import AddGame from "../scoreboard/AddGame/AddGame";
import { calculateTeamPerformance } from "../../helpers/calculateTeamPerformance";

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { LeagueContext } from "../../context/LeagueContext";
import { notificationSchema, notificationTypes } from "../../schemas/schema";

const AddGameModal = ({
  modalVisible,
  setModalVisible,
  leagueId,
  leagueGames,
  leagueType,
  leagueName,
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
    retrievePlayersFromLeague,
    updatePlayers,
    updateTeams,
    retrieveTeams,
    updateUsers,
    getAllUsers,
    currentUser,
    sendNotification,
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
      const newTeam = [...prev[team]];
      newTeam[index] = player;

      return {
        ...prev,
        [team]: newTeam,
      };
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
      return;
    }

    // Check if both teams have entered scores
    if (!team1Score || !team2Score) {
      setErrorText("Please enter scores for both teams.");
      setLoading(false);
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
      numberOfApprovals: 0,
      numberOfDeclines: 0,
      approvalStatus: "pending",
    };

    const allPlayersInLeague = await retrievePlayersFromLeague(leagueId);

    const allUsers = await getAllUsers();

    const playersToUpdate = allPlayersInLeague.filter((player) =>
      newGame.result.winner.players
        .concat(newGame.result.loser.players)
        .includes(player.username)
    );

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

    const winners = newGame.result.winner.players;
    const losers = newGame.result.loser.players;

    const isUserOnWinningTeam = winners.includes(currentUser.username);
    const opponents = isUserOnWinningTeam ? losers : winners;

    const requestForOpponentApprovals = usersToUpdate.filter((user) =>
      opponents.includes(user.username)
    );

    for (const user of requestForOpponentApprovals) {
      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: user.userId,
        senderId: currentUser.userId,
        message: `${currentUser.username} has just reported a score in ${leagueName} league`,
        type: notificationTypes.ACTION.ADD_GAME.LEAGUE,

        data: {
          leagueId,
          gameId,
          playersToUpdate,
          usersToUpdate,
          // newGame,
        },
      };

      await sendNotification(payload);
    }

    // const playerPerformance = calculatePlayerPerformance(
    //   newGame,
    //   playersToUpdate,
    //   usersToUpdate
    // );

    // await updatePlayers(playerPerformance.playersToUpdate, leagueId);
    // await updateUsers(playerPerformance.usersToUpdate);

    // const teamsToUpdate = await calculateTeamPerformance(
    //   newGame,
    //   retrieveTeams,
    //   leagueId
    // );

    // await updateTeams(teamsToUpdate, leagueId);

    await addGame(newGame, gameId, leagueId);
    setSelectedPlayers({ team1: ["", ""], team2: ["", ""] });
    setTeam1Score("");
    setTeam2Score("");

    handleShowPopup("Game added and players updated successfully!");
    await fetchLeagueById(leagueId);
    setLoading(false);
    console.log("Game added successfully.");
  };

  const clearSelectedPlayers = () => {
    setModalVisible(false);
    setSelectedPlayers({
      team1: leagueType === "Singles" ? [""] : ["", ""],
      team2: leagueType === "Singles" ? [""] : ["", ""],
    });
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
          type="success"
        />
        <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <GradientOverlay colors={["#191b37", "#001d2e"]}>
            <ModalContent>
              <TouchableOpacity
                onPress={clearSelectedPlayers}
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
                leagueType={leagueType}
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
