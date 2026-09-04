import React, { useState, useContext } from "react";
import { Modal, ActivityIndicator, Dimensions, View } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import moment from "moment";
import { validateBadmintonScores } from "../../helpers/validateBadmintonScores";
import AddGameDetails from "../scoreboard/AddGame/AddGameDetails";
import {
  GameTeam,
  Game,
  GameResult,
  UserProfile,
  Teams,
  Player,
} from "@shared/types";
import { calculateWin } from "../../helpers/calculateWin";
import { UserContext } from "@/context/UserContext";
import { PopupContext } from "@/context/PopupContext";
import {
  notificationSchema,
  notificationTypes,
  COMPETITION_TYPES,
} from "@shared";
import { formatDisplayName } from "@/helpers/formatDisplayName";
import { LeagueContext } from "@/context/LeagueContext";
import { LadderContext } from "@/context/LadderContext";
import VideoUploadModal from "./VideoUploadModal";

const { width: screenWidth } = Dimensions.get("window");

/**
 * When supplied, the modal publishes into a ladder match's shell game (via
 * `updateLadderGame`) instead of a tournament fixture. `tournamentId`/
 * `tournamentName` are ignored in that case.
 */
export type LadderGameContext = {
  ladderId: string;
  matchId: string;
  name: string;
};

type AddTournamentGameModalProps = {
  visible: boolean;
  game: Game | null;
  tournamentType: string;
  onClose: () => void;
  onGameUpdated?: (updatedGame: Game) => void;
  currentUser: UserProfile | null;
  tournamentName: string;
  tournamentId: string;
  ladder?: LadderGameContext | null;
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
  ladder = null,
}: AddTournamentGameModalProps) => {
  const { getUserById, sendNotification } = useContext(UserContext);
  const { updateTournamentGame } = useContext(LeagueContext);
  const { updateLadderGame } = useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [submittedGame, setSubmittedGame] = useState<{
    gameId: string;
    gamescore: string;
    date: string;
    teams: Teams;
  } | null>(null);

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

  const resetForm = () => {
    setTeam1Score("");
    setTeam2Score("");
    setErrorText("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

    // Ladder shells created before stable gameIds carry an empty gameId; derive
    // a deterministic one so the write and the approval notification reference
    // the same game.
    const resolvedGameId =
      game.gameId ||
      (ladder && game.gameNumber != null
        ? `${ladder.matchId}-g${game.gameNumber}`
        : game.gameId);

    const gameResult: Game = {
      gameId: resolvedGameId,
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

    const competitionLabel = ladder ? "ladder" : "tournament";
    for (const user of requestForOpponentApprovals) {
      const payload = {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: user.userId,
        senderId: currentUser?.userId,
        message: `${formatDisplayName(currentUser)} has just reported a score in ${
          ladder ? ladder.name : tournamentName
        } ${competitionLabel}`,
        type: ladder
          ? notificationTypes.ACTION.ADD_GAME.LADDER
          : notificationTypes.ACTION.ADD_GAME.TOURNAMENT,
        data: ladder
          ? {
              ladderId: ladder.ladderId,
              matchId: ladder.matchId,
              gameId: resolvedGameId,
            }
          : { tournamentId, gameId: game.gameId },
      };
      await sendNotification(payload);
    }

    try {
      if (ladder) {
        const outcome = await updateLadderGame({
          ladderId: ladder.ladderId,
          matchId: ladder.matchId,
          updatedGame: gameResult,
        });
        if (!outcome.success) {
          throw new Error(
            outcome.reason === "unavailable"
              ? "already been reported"
              : "Failed to submit ladder game result.",
          );
        }
      } else {
        await updateTournamentGame({
          tournamentId,
          gameId: game.gameId,
          updatedGame: gameResult,
        });
      }
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

    if (onGameUpdated) {
      onGameUpdated(gameResult);
    }

    setLoading(false);
    resetForm();

    // The tournament flow follows submit with an optional video upload; the
    // ladder video pipeline is wired in a later phase, so for ladders we just
    // confirm the report and close.
    if (ladder) {
      onClose();
      showBottomToast("Score sent to your opponent for approval", "success");
      return;
    }

    setSubmittedGame({
      gameId: game.gameId,
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
  };

  // if (!game) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible && !!game}
      onRequestClose={handleClose}
    >
      <ModalContainer>
        <ModalContent>
          <CloseButton onPress={handleClose}>
            <AntDesign name="close-circle" size={30} color="red" />
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

      {submittedGame && currentUser && (
        <VideoUploadModal
          visible={!!submittedGame}
          onClose={() => {
            setSubmittedGame(null);
            onClose();
            showBottomToast("Game published!", "success");
          }}
          gameId={submittedGame.gameId}
          competitionId={tournamentId}
          competitionName={tournamentName}
          competitionType={COMPETITION_TYPES.TOURNAMENT}
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
