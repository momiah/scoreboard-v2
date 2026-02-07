import React, { useState, useContext } from "react";
import { Modal, ActivityIndicator, Alert, Dimensions } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import moment from "moment";
import { validateBadmintonScores } from "../../helpers/validateBadmintonScores";
import AddGame from "../scoreboard/AddGame/AddGame";
import { GameTeam, Game, GameResult, PresetPlayers } from "../../types/game";
import { UserProfile } from "@/types/player";
import { calculateWin } from "../../helpers/calculateWin";
import { UserContext } from "@/context/UserContext";
import { notificationSchema, notificationTypes } from "@/schemas/schema";
import { formatDisplayName } from "@/helpers/formatDisplayName";
import { LeagueContext } from "@/context/LeagueContext";

const { width: screenWidth } = Dimensions.get("window");

type AddTournamentGameModalProps = {
  visible: boolean;
  game: Game | null;
  tournamentType: string;
  onClose: () => void;
  onGameUpdated?: (updatedGame: Game) => void;
  currentUser: UserProfile | null;
  tournamentName: string;
  tournamentId: string;
};

const AddTournamentGameModal = ({
  visible,
  game,
  tournamentType,
  onClose,
  onGameUpdated,
  currentUser,
  tournamentName,
  tournamentId,
}: AddTournamentGameModalProps) => {
  const { getUserById, sendNotification } = useContext(UserContext);
  const { updateTournamentGame } = useContext(LeagueContext);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const isCurrentUserInGame = () => {
    if (!game) return false;

    const checkTeam = (team?: GameTeam | null) => {
      if (!team) return false;
      return (
        team.player1?.userId === currentUser?.userId ||
        team.player2?.userId === currentUser?.userId
      );
    };

    return checkTeam(game.team1) || checkTeam(game.team2);
  };

  const canCurrentUserReport = isCurrentUserInGame();

  const areScoresEntered = () => {
    return team1Score.trim() !== "" && team2Score.trim() !== "";
  };

  const handleSubmit = async () => {
    // Ensure we have a game before proceeding to satisfy TypeScript's null checks
    if (!game) {
      setErrorText("No game selected.");
      return;
    }

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

    const team1: GameTeam = {
      player1: game?.team1?.player1 ?? null,
      player2: game?.team1?.player2 ?? null,
      score: score1,
    };

    const team2: GameTeam = {
      player1: game?.team2?.player1 ?? null,
      player2: game?.team2?.player2 ?? null,
      score: score2,
    };

    const result = calculateWin(team1, team2, tournamentType) as GameResult;

    // Prepare game result data
    const gameResult: Game = {
      gameId: game.gameId,
      gamescore: `${score1}-${score2}`,
      date: moment().format("DD-MM-YYYY"),
      reportedAt: new Date(),
      reportedTime: moment().format("HH:mm"),
      team1,
      team2,
      result,
      numberOfApprovals: 0,
      numberOfDeclines: 0,
      approvalStatus: "Pending",
      reporter: currentUser?.userId || "",
      court: game?.court,
      gameNumber: game?.gameNumber,
      createdAt: game?.createdAt,
      createdTime: game?.createdTime,
    };

    const isCurrentUserTeam1 = [
      team1.player1?.userId,
      team1.player2?.userId,
    ].includes(currentUser?.userId);

    const opponentUserIds = isCurrentUserTeam1
      ? [team2.player1?.userId, team2.player2?.userId].filter(Boolean)
      : [team1.player1?.userId, team1.player2?.userId].filter(Boolean);

    const requestForOpponentApprovals = (await Promise.all(
      opponentUserIds.map(getUserById)
    )) as Array<{ userId: string; [key: string]: unknown }>;

    for (const user of requestForOpponentApprovals) {
      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: user.userId,
        senderId: currentUser?.userId,
        message: `${formatDisplayName(
          currentUser
        )} has just reported a score in ${tournamentName} tournament`,
        type: notificationTypes.ACTION.ADD_GAME.TOURNAMENT,
        data: { tournamentId, gameId: game.gameId },
      };

      await sendNotification(payload);
    }

    // Update the game using context method
    await updateTournamentGame({
      tournamentId,
      gameId: game.gameId,
      gameResult,
    });
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
            // @ts-expect-error - allow passing preset players despite a narrower prop type in AddGame
            presetPlayers={{
              team1: game?.team1,
              team2: game?.team2,
            }}
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
