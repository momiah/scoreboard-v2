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
  Alert,
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
import { calculateWin } from "../../helpers/calculateWin";
import { formatDisplayName } from "../../helpers/formatDisplayName";

import { launchImageLibrary } from "react-native-image-picker";
import storage from "@react-native-firebase/storage";


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
  const [video, setVideo] = useState(null);



  // Initialize with null or empty strings, not objects
  const [selectedPlayers, setSelectedPlayers] = useState({
    team1: leagueType === "Singles" ? [null] : [null, null],
    team2: leagueType === "Singles" ? [null] : [null, null],
  });

  const pickVideo = async () => {
    const result = await launchImageLibrary({
      mediaType: "video",
      videoQuality: "high",
      durationLimit: 1800, // prevents too long videos (some devices enforce)
    });

    if (result.didCancel) return;

    const asset = result.assets[0];
    setVideo(asset);
  };

  const validateVideo = (video) => {
    const sizeMB = video.fileSize ? video.fileSize / (1024 * 1024) : 0;
    const duration = video.duration || 0;
    if (sizeMB > 150) {
      setErrorText("Video must be smaller than 150MB.");
      return false;
    }

    if (duration > 1800) {
      setErrorText("Video must be shorter than 30 minutes.");
      return false;
    }

    return true;
  };

  const uploadVideoToFirebase = async (video) => {
    const { uri, fileName } = video;
    const uniqueName = fileName || `game_${Date.now()}.mp4`;
    const reference = storage().ref(`leagues/${leagueId}/gameVideos/${uniqueName}`);
    await reference.putFile(uri);
    const url = await reference.getDownloadURL();
    return {
      url,
      sizeMB: video.fileSize ? video.fileSize / (1024 * 1024) : 0,
      durationSec: video.duration || 0,
      uploadedAt: new Date(),
      uploaderId: currentUser?.userId || "",
    };
  };


  const areAllPlayersSelected = () => {
    if (leagueType === "Singles") {
      return (
        selectedPlayers.team1[0] !== null && selectedPlayers.team2[0] !== null
      );
    } else {
      return (
        selectedPlayers.team1[0] !== null &&
        selectedPlayers.team1[1] !== null &&
        selectedPlayers.team2[0] !== null &&
        selectedPlayers.team2[1] !== null
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

    // REQUIRE video
    if (!video) {
      setErrorText("Please upload a video.");
      setLoading(false);
      return;
    }

    // Validate video
    if (!validateVideo(video)) {
      // Alert.alert("Invalid Video", errorText);
      setLoading(false);
      return;
    }

    // Upload to Firebase
    let videoUrl = "";
    try {
      videoUrl = await uploadVideoToFirebase(video);
    } catch (error) {
      setErrorText("Video upload failed. Please try again.");
      setLoading(false);
      return;
    }


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
      const gameData = {
        selectedPlayers,
        team1Score,
        team2Score,
        videoUrl,
      };

      const success = onGameAdded(gameData);
      if (success) {
        setSelectedPlayers({
          team1: leagueType === "Singles" ? [null] : [null, null],
          team2: leagueType === "Singles" ? [null] : [null, null],
        });
        setTeam1Score("");
        setTeam2Score("");
        setErrorText("");
        setVideo(null);
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

    const result = calculateWin(team1, team2, leagueType);

    const newGame = {
      gameId,
      gamescore: `${team1Score} - ${team2Score}`,
      createdAt: new Date(),
      date: moment().format("DD-MM-YYYY"),
      time: moment().format("HH:mm"),
      team1,
      team2,
      result,
      videoUrl,
      numberOfApprovals: 0,
      numberOfDeclines: 0,
      approvalStatus: "pending",
      reporter: formatDisplayName(currentUser),
    };

    // console.log("New Game Object:", JSON.stringify(newGame, null, 2));

    const playersInGame = [
      team1.player1?.userId,
      team1.player2?.userId,
      team2.player1?.userId,
      team2.player2?.userId,
    ].filter(Boolean);

    const currentUserId = currentUser?.userId;

    if (!playersInGame.includes(currentUser?.userId)) {
      setErrorText("You must be a participant in the game to report it.");
      setLoading(false);
      return;
    }

    setErrorText("");

    const isCurrentUserTeam1 = [
      team1.player1?.userId,
      team1.player2?.userId,
    ].includes(currentUserId);

    const opponentUserIds = isCurrentUserTeam1
      ? [team2.player1?.userId, team2.player2?.userId].filter(Boolean)
      : [team1.player1?.userId, team1.player2?.userId].filter(Boolean);

    console.log("Opponent User IDs:", opponentUserIds);

    const requestForOpponentApprovals = await Promise.all(
      opponentUserIds.map(getUserById)
    );

    for (const user of requestForOpponentApprovals) {
      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: user.userId,
        senderId: currentUserId,
        message: `${formatDisplayName(
          currentUser
        )} has just reported a score in ${leagueName} league`,
        type: notificationTypes.ACTION.ADD_GAME.LEAGUE,
        data: { leagueId, gameId },
      };

      await sendNotification(payload);
    }

    await addGame(newGame, gameId, leagueId);

    // Reset with nulls
    setSelectedPlayers({
      team1: leagueType === "Singles" ? [null] : [null, null],
      team2: leagueType === "Singles" ? [null] : [null, null],
    });
    setTeam1Score("");
    setTeam2Score("");
    setVideo(null);

    handleShowPopup(
      "Game added! Opponents have 24 hours to approve or will be auto-approved."
    );
    await fetchLeagueById(leagueId);
    setLoading(false);
    console.log("Game added successfully with player objects:", newGame);
  };

  const clearSelectedPlayers = () => {
    setModalVisible(false);
    setSelectedPlayers({
      team1: leagueType === "Singles" ? [null] : [null, null],
      team2: leagueType === "Singles" ? [null] : [null, null],
    });
    setTeam1Score("");
    setTeam2Score("");
    setVideo(null);
  };

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedPlayers({
            team1: leagueType === "Singles" ? [null] : [null, null],
            team2: leagueType === "Singles" ? [null] : [null, null],
          });
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

              <TouchableOpacity
                onPress={pickVideo}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: video ? "#28a745" : "#007bff",
                  padding: 12,
                  borderRadius: 12,
                  marginTop: 15,
                  width: screenWidth - 100,
                }}
              >
                <AntDesign
                  name={video ? "checkcircle" : "videocamera"}
                  size={20}
                  color="white"
                  style={{ marginRight: 10 }}
                />
                <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
                  {video ? "Video Selected ✓" : "Upload Video"}
                </Text>
              </TouchableOpacity>

              {video && (
                <Text style={{ color: "#ccc", fontSize: 12, marginTop: 5 }}>
                  {`${(video.fileSize / (1024 * 1024)).toFixed(2)} MB • ${Math.floor(
                    video.duration / 60
                  )} min ${Math.floor(video.duration % 60)} sec`}
                </Text>
              )}


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
