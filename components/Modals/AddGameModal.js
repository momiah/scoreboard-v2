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

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { LeagueContext } from "../../context/LeagueContext";
import { notificationSchema, notificationTypes } from "../../schemas/schema";
import { validateBadmintonScores } from "../../helpers/validateBadmintonScores";

const AddGameModal = ({
  modalVisible,
  setModalVisible,
  leagueId,
  leagueGames,
  leagueType,
  leagueName,
   onGameAdded, // New prop for bulk mode
  isBulkMode = false, // New prop to indicate bulk mode
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

    if (isBulkMode && onGameAdded) {
      const gameData = {
        selectedPlayers,
        team1Score,
        team2Score,
      };
      
      const success = onGameAdded(gameData);
      if (success) {
        // Reset form
        setSelectedPlayers({ 
          team1: leagueType === "Singles" ? [""] : ["", ""], 
          team2: leagueType === "Singles" ? [""] : ["", ""] 
        });
        setTeam1Score("");
        setTeam2Score("");
        setErrorText("");
      }
      setLoading(false);
      return;
    }

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

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    // Use helper for validation
    const validationError = validateBadmintonScores(score1, score2);
    if (validationError) {
      setErrorText(validationError);
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

    // Extract all players participating in this specific game
    const playersInGame = [
      newGame.team1.player1,
      newGame.team1.player2,
      newGame.team2.player1,
      newGame.team2.player2,
    ].filter(Boolean); // Remove null values

    // Verify current user is actually playing in this game
    if (!playersInGame.includes(currentUser?.username)) {
      setErrorText("You must be a participant in the game to report it.");
      setLoading(false);
      return;
    }
    setErrorText("");

    // Get league players and convert to user objects, but only for game participants
    const playersInLeague = await retrievePlayersFromLeague(leagueId);
    if (!playersInLeague || playersInLeague.length === 0) {
      setErrorText("No players found in the league.");
      setLoading(false);
      return;
    }

    // Determine which team the current user is on
    const isCurrentUserTeam1 = [
      newGame.team1.player1,
      newGame.team1.player2,
    ].includes(currentUser?.username);

    // Get opponents (players from the opposing team only)
    const opponentUsernames = isCurrentUserTeam1
      ? [newGame.team2.player1, newGame.team2.player2].filter(Boolean)
      : [newGame.team1.player1, newGame.team1.player2].filter(Boolean);

    // Filter league players to only the opponents
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

        data: {
          leagueId,
          gameId,
        },
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

              <SubmitButton onPress={handleAddGame} disabled={loading}>
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
