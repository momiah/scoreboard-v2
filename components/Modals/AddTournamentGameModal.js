import React, { useState } from "react";
import { Modal, ActivityIndicator, Alert, Dimensions } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import moment from "moment";
import { validateBadmintonScores } from "../../helpers/validateBadmintonScores";
import AddGame from "../scoreboard/AddGame/AddGame";

const { width: screenWidth } = Dimensions.get("window");

const AddTournamentGameModal = ({
  visible,
  game,
  tournamentType,
  onClose,
  onGameUpdated,
  currentUser,
}) => {
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const isCurrentUserInGame = () => {
    const isInTeam1 = game?.team1?.players?.some(
      (player) => player.userId === currentUser.userId
    );
    const isInTeam2 = game?.team2?.players?.some(
      (player) => player.userId === currentUser.userId
    );
    return isInTeam1 || isInTeam2;
  };

  const canCurrentUserReport = isCurrentUserInGame();

  const handleScoreChange = (setScore) => (text) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText.length <= 2) {
      setScore(numericText);
    }
    setErrorText(""); // Clear error when user types
  };

  const areScoresEntered = () => {
    return team1Score.trim() !== "" && team2Score.trim() !== "";
  };

  const handleSubmit = async () => {
    if (!areScoresEntered()) {
      setErrorText("Please enter scores for both teams.");
      return;
    }

    const score1 = parseInt(team1Score);
    const score2 = parseInt(team2Score);

    const validationError = validateBadmintonScores(score1, score2);
    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setLoading(true);

    // Prepare game result data
    const gameResult = {
      gameId: game?.gameId,
      gameNumber: game?.gameNumber,
      court: game?.court,
      team1Score: score1,
      team2Score: score2,
      team1: game?.team1,
      team2: game?.team2,
      result: {
        team1Score: score1,
        team2Score: score2,
        winner: score1 > score2 ? "team1" : "team2",
      },
      reportedAt: new Date(),
      reportedTime: moment().format("HH:mm"),
    };

    console.log("Tournament Game Result:", gameResult);

    // Call onGameUpdated for now
    if (onGameUpdated) {
      console.log("Calling onGameUpdated with:", gameResult);
      onGameUpdated(gameResult);
    }

    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      setTeam1Score("");
      setTeam2Score("");
      setErrorText("");
      onClose();
      Alert.alert("Success", "Game result submitted successfully!");
    }, 1000);
  };

  const handleClose = () => {
    setTeam1Score("");
    setTeam2Score("");
    setErrorText("");
    onClose();
  };

  if (!game) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <ModalContainer>
        <ModalContent>
          <CloseButton onPress={handleClose}>
            <AntDesign name="closecircleo" size={30} color="red" />
          </CloseButton>

          <AddGame
            team1Score={team1Score}
            setTeam1Score={setTeam1Score}
            team2Score={team2Score}
            setTeam2Score={setTeam2Score}
            selectedPlayers={{}} // Empty since we're using presetPlayers
            setSelectedPlayers={() => {}} // Not used in readonly mode
            leagueType={tournamentType}
            isReadOnly={true}
            presetPlayers={{
              team1: game?.team1,
              team2: game?.team2,
            }}
            handleScoreChange={handleScoreChange} // Pass the score change handler
          />

          {errorText && <ErrorText>{errorText}</ErrorText>}
          {!canCurrentUserReport && (
            <ErrorText>
              Only participants of this game can report the result.
            </ErrorText>
          )}
          <SubmitButton
            onPress={handleSubmit}
            disabled={loading || !areScoresEntered() || !canCurrentUserReport}
            style={{
              backgroundColor:
                loading || !areScoresEntered() || !canCurrentUserReport
                  ? "#666"
                  : "#00A2FF",
              opacity:
                loading || !areScoresEntered() || !canCurrentUserReport
                  ? 0.6
                  : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <SubmitText>Submit</SubmitText>
            )}
          </SubmitButton>
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

// Styled Components
const ModalContainer = styled(BlurView).attrs({
  intensity: 80,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "center",
});

const CloseButton = styled.TouchableOpacity({
  alignSelf: "flex-end",
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 10,
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
  textAlign: "center",
  marginBottom: 16,
  fontStyle: "italic",
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

const SubmitText = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
});

export default AddTournamentGameModal;
