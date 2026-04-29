import React, { useState, useContext } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { GameContext } from "../../context/GameContext";
import { UserContext } from "../../context/UserContext";
import styled from "styled-components/native";
import moment from "moment";
import { AntDesign } from "@expo/vector-icons";
import { generateUniqueGameId } from "../../helpers/generateUniqueId";
import AddGameDetails from "../scoreboard/AddGame/AddGameDetails";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { LeagueContext } from "../../context/LeagueContext";
import {
  notificationSchema,
  notificationTypes,
  COLLECTION_NAMES,
  COMPETITION_TYPES,
} from "@shared";
import { validateBadmintonScores } from "../../helpers/validateBadmintonScores";
import { calculateWin } from "../../helpers/calculateWin";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import SubmittedGameModal from "./SubmittedGameModal";
import {
  GameTeam,
  Game,
  GameResult,
  Player,
  CollectionName,
  Teams,
} from "@shared/types";

type AddGameModalProps = {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  leagueId: string;
  leagueGames: Game[];
  leagueType: string;
  leagueName: string;
  onGameAdded?: (gameData: {
    selectedPlayers: {
      team1: (Player | null)[];
      team2: (Player | null)[];
    };
    team1Score: string;
    team2Score: string;
  }) => boolean;
  isBulkMode?: boolean;
  onGameUpdated?: () => void;
};

const AddGameModal = ({
  modalVisible,
  setModalVisible,
  leagueId,
  leagueGames,
  leagueType,
  leagueName,
  onGameAdded,
  isBulkMode = false,
  onGameUpdated,
}: AddGameModalProps) => {
  const { addGame } = useContext(GameContext);
  const { fetchCompetitionById } = useContext(LeagueContext);
  const { getUserById, currentUser, sendNotification } =
    useContext(UserContext);

  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");

  const [submittedGame, setSubmittedGame] = useState<{
    gameId: string;
    gamescore: string;
    date: string;
    teams: Teams;
  } | null>(null);

  const [selectedPlayers, setSelectedPlayers] = useState<{
    team1: (Player | null)[];
    team2: (Player | null)[];
  }>({
    team1: leagueType === "Singles" ? [null] : [null, null],
    team2: leagueType === "Singles" ? [null] : [null, null],
  });

  const areAllPlayersSelected = () => {
    if (leagueType === "Singles") {
      return (
        selectedPlayers.team1[0] !== null && selectedPlayers.team2[0] !== null
      );
    }
    return (
      selectedPlayers.team1[0] !== null &&
      selectedPlayers.team1[1] !== null &&
      selectedPlayers.team2[0] !== null &&
      selectedPlayers.team2[1] !== null
    );
  };

  const areScoresEntered = () =>
    team1Score.trim() !== "" && team2Score.trim() !== "";

  const isSubmitDisabled = () =>
    loading || !areAllPlayersSelected() || !areScoresEntered();

  const resetForm = () => {
    setSelectedPlayers({
      team1: leagueType === "Singles" ? [null] : [null, null],
      team2: leagueType === "Singles" ? [null] : [null, null],
    });
    setTeam1Score("");
    setTeam2Score("");
    setErrorText("");
  };

  const handleClose = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleAddGame = async () => {
    setLoading(true);

    if (leagueType === "Singles") {
      if (!selectedPlayers.team1[0] || !selectedPlayers.team2[0]) {
        setErrorText("Please select both players.");
        setLoading(false);
        return;
      }
    } else if (leagueType === "Doubles") {
      if (
        !selectedPlayers.team1[0] ||
        !selectedPlayers.team1[1] ||
        !selectedPlayers.team2[0] ||
        !selectedPlayers.team2[1]
      ) {
        setErrorText("Please select all 4 players.");
        setLoading(false);
        return;
      }
    }

    if (isBulkMode && onGameAdded) {
      const gameData = { selectedPlayers, team1Score, team2Score };
      const success = onGameAdded(gameData);
      if (success) resetForm();
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

    const gameId = generateUniqueGameId({
      existingGames: leagueGames,
      competitionId: leagueId,
    });

    const team1: GameTeam = {
      player1: selectedPlayers.team1[0],
      player2: leagueType === "Doubles" ? selectedPlayers.team1[1] : null,
      score: score1,
    };

    const team2: GameTeam = {
      player1: selectedPlayers.team2[0],
      player2: leagueType === "Doubles" ? selectedPlayers.team2[1] : null,
      score: score2,
    };

    const result = calculateWin(team1, team2, leagueType) as GameResult;
    const currentUserId = currentUser?.userId;

    const playersInGame = [
      team1.player1?.userId,
      team1.player2?.userId,
      team2.player1?.userId,
      team2.player2?.userId,
    ].filter(Boolean);

    if (!playersInGame.includes(currentUserId)) {
      setErrorText("You must be a participant in the game to report it.");
      setLoading(false);
      return;
    }

    const gamescore = `${score1} - ${score2}`;
    const date = moment().format("DD-MM-YYYY");

    const newGame: Game = {
      gameId,
      gamescore,
      createdAt: new Date(),
      date,
      createdTime: moment().format("HH:mm"),
      team1,
      team2,
      result,
      numberOfApprovals: 0,
      numberOfDeclines: 0,
      approvalStatus: "Pending",
      reporter: formatDisplayName(currentUser),
      approvers: [],
    };

    setErrorText("");

    const isCurrentUserTeam1 = [
      team1.player1?.userId,
      team1.player2?.userId,
    ].includes(currentUserId);

    const opponentUserIds = isCurrentUserTeam1
      ? [team2.player1?.userId, team2.player2?.userId].filter(Boolean)
      : [team1.player1?.userId, team1.player2?.userId].filter(Boolean);

    const requestForOpponentApprovals = (await Promise.all(
      opponentUserIds.map(getUserById),
    )) as Array<{ userId: string; [key: string]: unknown }>;

    for (const user of requestForOpponentApprovals) {
      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: user.userId,
        senderId: currentUserId,
        message: `${formatDisplayName(currentUser)} has just reported a score in ${leagueName} league`,
        type: notificationTypes.ACTION.ADD_GAME.LEAGUE,
        data: { leagueId, gameId },
      };
      await sendNotification(payload);
    }

    await addGame(newGame, gameId, leagueId);

    resetForm();
    setSubmittedGame({
      gameId,
      gamescore,
      date,
      teams: {
        team1: {
          player1: team1.player1 as Player,
          ...(team1.player2 && { player2: team1.player2 as Player }),
        },
        team2: {
          player1: team2.player1 as Player,
          ...(team2.player2 && { player2: team2.player2 as Player }),
        },
      },
    });
    await fetchCompetitionById({
      competitionId: leagueId,
      collectionName: COLLECTION_NAMES.leagues as CollectionName,
    });
    setLoading(false);

    if (onGameUpdated) {
      onGameUpdated();
    }
  };

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleClose}
      >
        <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <GradientOverlay colors={["#191b37", "#001d2e"]}>
            <ModalContent>
              <TouchableOpacity
                onPress={handleClose}
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

              <AddGameDetails
                team1Score={team1Score}
                setTeam1Score={setTeam1Score}
                team2Score={team2Score}
                setTeam2Score={setTeam2Score}
                selectedPlayers={selectedPlayers}
                setSelectedPlayers={setSelectedPlayers}
                leagueType={leagueType}
              />

              {errorText ? <ErrorText>{errorText}</ErrorText> : null}

              <SubmitButton
                onPress={handleAddGame}
                disabled={isSubmitDisabled()}
                style={{
                  backgroundColor: isSubmitDisabled() ? "#666" : "#00A2FF",
                  opacity: isSubmitDisabled() ? 0.6 : 1,
                  marginTop: 20,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text
                    style={{ fontSize: 14, fontWeight: "bold", color: "white" }}
                  >
                    Submit
                  </Text>
                )}
              </SubmitButton>
            </ModalContent>
          </GradientOverlay>
        </ModalContainer>
      </Modal>

      {submittedGame && currentUser && (
        <SubmittedGameModal
          visible={!!submittedGame}
          onClose={() => {
            setSubmittedGame(null);
            setModalVisible(false);
          }}
          gameId={submittedGame.gameId}
          competitionId={leagueId}
          competitionName={leagueName}
          competitionType={COMPETITION_TYPES.LEAGUE}
          gamescore={submittedGame.gamescore}
          date={submittedGame.date}
          teams={submittedGame.teams}
          currentUser={currentUser}
        />
      )}
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
  backgroundColor: "rgba(2, 13, 24, 1)",
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
  borderRadius: 8,
  width: screenWidth <= 400 ? 210 : 250,
  backgroundColor: "#00A2FF",
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 10,
  fontStyle: "italic",
});

export default AddGameModal;
