import React, { useState, useContext } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { UserContext } from "../../context/UserContext";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import AddGameDetails from "../scoreboard/AddGame/AddGameDetails";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { LeagueContext } from "../../context/LeagueContext";
import { PopupContext } from "../../context/PopupContext";
import { COLLECTION_NAMES, COMPETITION_TYPES } from "@shared";
import {
  reportLeagueGame,
  ReportLeagueGameResult,
} from "../../helpers/League/reportLeagueGame";
import { AppEventsLogger } from "react-native-fbsdk-next";
import VideoUploadModal from "./VideoUploadModal";
import { Game, Player, CollectionName, Teams } from "@shared/types";

type AddGameModalProps = {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  leagueId: string;
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
  leagueType,
  leagueName,
  onGameAdded,
  isBulkMode = false,
  onGameUpdated,
}: AddGameModalProps) => {
  const { fetchCompetitionById } = useContext(LeagueContext);
  const { showBottomToast } = useContext(PopupContext);
  const { currentUser, sendNotification } = useContext(UserContext);

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

    const reported = await reportLeagueGame({
      leagueId,
      team1Players: selectedPlayers.team1,
      team2Players: selectedPlayers.team2,
      score1: parseInt(team1Score),
      score2: parseInt(team2Score),
      reporter: currentUser,
      sendNotification,
    }).catch((error): ReportLeagueGameResult => {
      console.error("Error reporting game:", error);
      return { error: "Error saving game data. Please try again." };
    });

    if (!reported.game) {
      setErrorText(reported.error);
      setLoading(false);
      return;
    }

    AppEventsLogger.logEvent("ReportedGame", { league_id: leagueId });
    const { gameId, gamescore, date, team1, team2 } = reported.game;
    setErrorText("");
    resetForm();
    setSubmittedGame({
      gameId,
      gamescore,
      date: date ?? "",
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
              <AntDesign name="close-circle" size={30} color="red" />
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

      {submittedGame && currentUser && (
        <VideoUploadModal
          visible={!!submittedGame}
          onClose={() => {
            setSubmittedGame(null);
            setModalVisible(false);
            showBottomToast("Game published!", "success");
          }}
          gameId={submittedGame.gameId}
          competitionId={leagueId}
          competitionName={leagueName}
          competitionType={COMPETITION_TYPES.LEAGUE}
          gamescore={submittedGame.gamescore}
          date={submittedGame.date}
          teams={submittedGame.teams}
          currentUser={currentUser}
          icon="checkmark-circle-outline"
          iconColor="#00A2FF"
          showAddLaterHint={true}
        />
      )}
    </Modal>
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
