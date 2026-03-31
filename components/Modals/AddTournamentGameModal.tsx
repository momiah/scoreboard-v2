import React, { useState, useContext } from "react";
import { Modal, ActivityIndicator, Alert, Dimensions } from "react-native";
import styled from "styled-components/native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import moment from "moment";
import { validateBadmintonScores } from "../../helpers/validateBadmintonScores";
import AddGameDetails from "../scoreboard/AddGame/AddGameDetails";
import { GameTeam, Game, GameResult, UserProfile, Player } from "@shared/types";
import { calculateWin } from "../../helpers/calculateWin";
import { UserContext } from "@/context/UserContext";
import {
  notificationSchema,
  notificationTypes,
  COMPETITION_TYPES,
} from "@shared";
import { formatDisplayName } from "@/helpers/formatDisplayName";
import { LeagueContext } from "@/context/LeagueContext";
import { useVideoUpload } from "../../hooks/useVideoUpload";

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
  // @ts-expect-error - updateTournamentGame may not be typed in LeagueContext
  const { updateTournamentGame } = useContext(LeagueContext);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const { pickVideo, startBackgroundUpload } = useVideoUpload({
    competitionId: tournamentId,
  });

  const handlePickVideo = async () => {
    const uri = await pickVideo();
    if (uri) setVideoUri(uri);
  };

  const gameNumber = game?.gameNumber ?? null;
  const court = game?.court ?? null;
  const approvalStatus = game?.approvalStatus ?? "Pending";

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
  const areScoresEntered = () =>
    team1Score.trim() !== "" && team2Score.trim() !== "";

  const handleSubmit = async () => {
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

    const gamescore = `${score1}-${score2}`;
    const date = moment().format("DD-MM-YYYY");

    const gameResult: Game = {
      gameId: game.gameId,
      gamescore,
      date,
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
      approvers: game?.approvers || [],
    };

    const isCurrentUserTeam1 = [
      team1.player1?.userId,
      team1.player2?.userId,
    ].includes(currentUser?.userId);

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
        senderId: currentUser?.userId,
        message: `${formatDisplayName(currentUser)} has just reported a score in ${tournamentName} tournament`,
        type: notificationTypes.ACTION.ADD_GAME.TOURNAMENT,
        data: { tournamentId, gameId: game.gameId },
      };
      await sendNotification(payload);
    }

    // Update the game using context method
    try {
      await updateTournamentGame({
        tournamentId,
        gameId: game.gameId,
        updatedGame: gameResult,
      });
    } catch (updateError: unknown) {
      const errorMessage =
        updateError instanceof Error ? updateError.message : "";
      const alreadyReported =
        errorMessage.includes("already been reported") ||
        errorMessage.includes("already been processed");

      setLoading(false);
      setErrorText(
        alreadyReported
          ? "This game has already been reported. Please refresh to see the latest status."
          : "Failed to submit game result. Please try again.",
      );
      return;
    }

    // Kick off background upload — fully detached, survives app close
    if (videoUri && currentUser) {
      startBackgroundUpload({
        gameId: game.gameId,
        videoUri,
        competitionName: tournamentName,
        competitionType: COMPETITION_TYPES.TOURNAMENT,
        gamescore,
        date,
        postedBy: {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          username: currentUser.username,
          profileImage: currentUser.profileImage,
        },
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
    }

    if (onGameUpdated) {
      onGameUpdated(gameResult);
    }

    setTimeout(() => {
      setLoading(false);
      setTeam1Score("");
      setTeam2Score("");
      setErrorText("");
      setVideoUri(null);
      onClose();
      Alert.alert("Success", "Game result submitted successfully!");
    }, 1000);
  };

  const handleClose = () => {
    if (videoUri) {
      Alert.alert(
        "Discard Video?",
        "You have a video selected that hasn't been submitted yet.",
        [
          { text: "Keep", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setVideoUri(null);
              setTeam1Score("");
              setTeam2Score("");
              setErrorText("");
              onClose();
            },
          },
        ],
      );
      return;
    }

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

          <AddGameDetails
            team1Score={team1Score}
            setTeam1Score={setTeam1Score}
            team2Score={team2Score}
            setTeam2Score={setTeam2Score}
            selectedPlayers={{ team1: [null, null], team2: [null, null] }}
            setSelectedPlayers={() => {}}
            leagueType={tournamentType}
            isReadOnly={true}
            gameNumber={gameNumber}
            court={court}
            approvalStatus={approvalStatus}
            presetPlayers={{
              team1: {
                player1: game?.team1?.player1 ?? undefined,
                player2: game?.team1?.player2 ?? undefined,
              },
              team2: {
                player1: game?.team2?.player1 ?? undefined,
                player2: game?.team2?.player2 ?? undefined,
              },
            }}
          />

          {errorText ? <ErrorText>{errorText}</ErrorText> : null}
          {!canCurrentUserReport && (
            <ErrorText>
              Only participants of this game can report the result.
            </ErrorText>
          )}

          <ActionRow>
            <VideoButton
              onPress={handlePickVideo}
              activeOpacity={0.7}
              hasVideo={!!videoUri}
            >
              <Ionicons
                name={videoUri ? "videocam" : "videocam-outline"}
                size={20}
                color={videoUri ? "#00A2FF" : "#888"}
              />
              {videoUri && <VideoAttachedDot />}
            </VideoButton>

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
          </ActionRow>
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

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

const ActionRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginTop: 20,
  gap: 12,
});

const VideoButton = styled.TouchableOpacity<{ hasVideo: boolean }>(
  ({ hasVideo }: { hasVideo: boolean }) => ({
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hasVideo ? "#001D3D" : "#0D1B2A",
    borderWidth: 1,
    borderColor: hasVideo ? "#00A2FF" : "#333",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  }),
);

const VideoAttachedDot = styled.View({
  position: "absolute",
  top: 2,
  right: 2,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#00A2FF",
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

const SubmitText = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
});

export default AddTournamentGameModal;
