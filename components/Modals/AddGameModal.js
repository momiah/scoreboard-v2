import React, { useState, useContext } from "react";
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
import moment from "moment";
import { AntDesign } from "@expo/vector-icons";
import { generateUniqueGameId } from "../../helpers/generateUniqueId";
import AddGame from "../scoreboard/AddGame/AddGame";

import { PlatformBlurView as BlurView } from "../../components/PlatformBlurView";
import { LinearGradient } from "expo-linear-gradient";
import { LeagueContext } from "../../context/LeagueContext";
import { notificationSchema, notificationTypes } from "../../schemas/schema";
import { validateBadmintonScores } from "../../helpers/validateBadmintonScores";
import { calculateWin } from "../../helpers/calculateWin";

const AddGameModal = ({
  modalVisible,
  setModalVisible,
  leagueId,
  leagueGames,
  leagueType,
  leagueName,
  onGameAdded,
  isBulkMode = false,
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
    getUserById,
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

  const areAllPlayersSelected = () => {
    if (leagueType === "Singles") {
      return selectedPlayers.team1[0] !== "" && selectedPlayers.team2[0] !== "";
    } else {
      return (
        selectedPlayers.team1[0] !== "" &&
        selectedPlayers.team1[1] !== "" &&
        selectedPlayers.team2[0] !== "" &&
        selectedPlayers.team2[1] !== ""
      );
    }
  };

  const areScoresEntered = () => {
    return team1Score.trim() !== "" && team2Score.trim() !== "";
  };

  const isSubmitDisabled = () => {
    return loading || !areAllPlayersSelected() || !areScoresEntered();
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");
    setModalVisible(false);
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

    if (leagueType === "Singles") {
      if (selectedPlayers.team1[0] === "" || selectedPlayers.team2[0] === "") {
        setErrorText("Please select both players.");
        setLoading(false);
        return;
      }
    } else if (leagueType === "Doubles") {
      if (
        selectedPlayers.team1[0] === "" ||
        selectedPlayers.team1[1] === "" ||
        selectedPlayers.team2[0] === "" ||
        selectedPlayers.team2[1] === ""
      ) {
        setErrorText("Please select all 4 players.");
        setLoading(false);
        return;
      }
    }

    if (isBulkMode && onGameAdded) {
      const gameData = {
        selectedPlayers,
        team1Score,
        team2Score,
      };

      const success = onGameAdded(gameData);
      if (success) {
        setSelectedPlayers({
          team1: leagueType === "Singles" ? [""] : ["", ""],
          team2: leagueType === "Singles" ? [""] : ["", ""],
        });
        setTeam1Score("");
        setTeam2Score("");
        setErrorText("");
      }
      setLoading(false);
      return;
    }

    if (!team1Score || !team2Score) {
      setErrorText("Please enter scores for both teams.");
      setLoading(false);
      return;
    }

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    const validationError = validateBadmintonScores(score1, score2);
    if (validationError) {
      setErrorText(validationError);
      setLoading(false);
      return;
    }

    const gameId = generateUniqueGameId(leagueGames);

    const team1 = {
      player1: selectedPlayers.team1[0],
      player2: leagueType === "Doubles" ? selectedPlayers.team1[1] : null,
      score: score1,
    };

    const team2 = {
      player1: selectedPlayers.team2[0],
      player2: leagueType === "Doubles" ? selectedPlayers.team2[1] : null,
      score: score2,
    };

    const result = calculateWin(team1, team2);

    const newGame = {
      gameId,
      gamescore: `${team1Score} - ${team2Score}`,
      createdAt: new Date(),
      date: moment().format("DD-MM-YYYY"),
      time: moment().format("HH:mm"),
      team1,
      team2,
      result,
      numberOfApprovals: 0,
      numberOfDeclines: 0,
      approvalStatus: "pending",
      reporter: currentUser?.username,
    };

    const playersInGame = [
      team1.player1,
      team1.player2,
      team2.player1,
      team2.player2,
    ].filter(Boolean);

    if (!playersInGame.includes(currentUser?.username)) {
      setErrorText("You must be a participant in the game to report it.");
      setLoading(false);
      return;
    }

    setErrorText("");

    const playersInLeague = await retrievePlayersFromLeague(leagueId);
    if (!playersInLeague || playersInLeague.length === 0) {
      setErrorText("No players found in the league.");
      setLoading(false);
      return;
    }

    const isCurrentUserTeam1 = [team1.player1, team1.player2].includes(
      currentUser?.username
    );

    const opponentUsernames = isCurrentUserTeam1
      ? [team2.player1, team2.player2].filter(Boolean)
      : [team1.player1, team1.player2].filter(Boolean);

    const opponentPlayers = playersInLeague.filter((player) =>
      opponentUsernames.includes(player.username)
    );

    const userIds = opponentPlayers.map((player) => player.userId);
    const requestForOpponentApprovals = await Promise.all(
      userIds.map(getUserById)
    );

    for (const user of requestForOpponentApprovals) {
      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: user.userId,
        senderId: currentUser?.userId,
        message: `${currentUser?.username} has just reported a score in ${leagueName} league`,
        type: notificationTypes.ACTION.ADD_GAME.LEAGUE,
        data: { leagueId, gameId },
      };

      await sendNotification(payload);
    }

    await addGame(newGame, gameId, leagueId);
    setSelectedPlayers({ team1: ["", ""], team2: ["", ""] });
    setTeam1Score("");
    setTeam2Score("");

    handleShowPopup(
      "Game added! Opponents must approve for stats to be updated"
    );
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

              <SubmitButton
                onPress={handleAddGame}
                disabled={isSubmitDisabled()}
                style={{
                  backgroundColor: isSubmitDisabled() ? "#666" : "#00A2FF",
                  opacity: isSubmitDisabled() ? 0.6 : 1,
                }}
              >
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
