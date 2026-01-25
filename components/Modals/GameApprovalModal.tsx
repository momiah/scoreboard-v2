import { Modal, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../context/LeagueContext";
import { useEffect, useState, useContext, useCallback } from "react";
import { AntDesign } from "@expo/vector-icons";
import { UserContext } from "../../context/UserContext";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { notificationTypes } from "../../schemas/schema";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import { NormalizedCompetition } from "@/types/competition";
import { Game } from "@/types/game";
import { Player } from "@/types/game";
import { getCompetitionConfig } from "@/helpers/getCompetitionConfig";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";

const screenWidth = Dimensions.get("window").width;

const findGame = (
  competition: NormalizedCompetition,
  gameId: string,
  isLeague: boolean
): Game | null => {
  if (isLeague) {
    return competition.games?.find((game) => game.gameId === gameId) || null;
  }

  for (const fixture of competition.fixtures || []) {
    const game = fixture.games?.find((game) => game.gameId === gameId);
    if (game) return game;
  }

  return competition.games?.find((game) => game.gameId === gameId) || null;
};

interface GameApprovalModalProps {
  visible: boolean;
  onClose: () => void;
  notificationId: string;
  notificationType: string;
  senderId: string;
  gameId: string;
  competitionId: string;
  isRead: boolean;
}

interface NavigateToParams {
  competitionId?: string;
  userId?: string;
}

const GameApprovalModal = ({
  visible,
  onClose,
  notificationId,
  notificationType,
  senderId,
  gameId,
  competitionId,
  isRead,
}: GameApprovalModalProps) => {
  const { fetchCompetitionById, approveGame, declineGame } =
    useContext(LeagueContext);
  const { currentUser, readNotification } = useContext(UserContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [gameDetails, setGameDetails] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDecision, setLoadingDecision] = useState(false);
  const [competition, setCompetition] = useState<NormalizedCompetition | null>(
    null
  );
  const [senderDisplayName, setSenderDisplayName] = useState<string | null>(
    null
  );
  const [gameDeleted, setGameDeleted] = useState(false);

  const config = getCompetitionConfig(notificationType);

  const resetState = useCallback(() => {
    setGameDetails(null);
    setCompetition(null);
    setSenderDisplayName(null);
    setGameDeleted(false);
    setLoading(true);
  }, []);

  const navigateTo = useCallback(
    (route: string, params: NavigateToParams) => {
      onClose();
      navigation.navigate(route, params);
    },
    [onClose, navigation]
  );

  useEffect(() => {
    if (!visible) {
      resetState();
      return;
    }

    let isMounted = true;

    const fetchDetails = async () => {
      try {
        const competition = await fetchCompetitionById({
          competitionId,
          collectionName: config.collectionName,
        });

        if (!isMounted) return;

        if (!competition) {
          setCompetition(null);
          setGameDetails(null);
          readNotification(notificationId, currentUser?.userId);
          setLoading(false);
          return;
        }

        const normalizedCompetition = normalizeCompetitionData({
          rawData: competition,
          competitionType: config.competitionType,
        }) as NormalizedCompetition;

        const senderParticipant = normalizedCompetition?.participants?.find(
          (p) => p.userId === senderId
        );
        setSenderDisplayName(
          senderParticipant ? formatDisplayName(senderParticipant) : "Unknown"
        );

        const game = findGame(normalizedCompetition, gameId, config.isLeague);

        setCompetition(normalizedCompetition);
        setGameDetails(game);

        if (!game) {
          setGameDeleted(true);
          readNotification(notificationId, currentUser?.userId);
        }
      } catch (error) {
        console.error("Error fetching competition details:", error);
        if (isMounted) {
          setCompetition(null);
          setGameDetails(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [visible, competitionId, gameId, senderId, notificationType]);

  useEffect(() => {
    if (
      gameDetails?.approvalStatus === notificationTypes.RESPONSE.APPROVE_GAME &&
      !isRead
    ) {
      readNotification(notificationId, currentUser?.userId);
    }
  }, [
    gameDetails?.approvalStatus,
    isRead,
    notificationId,
    currentUser?.userId,
  ]);

  const handleApproveGame = async () => {
    setLoadingDecision(true);
    try {
      await approveGame({
        gameId: gameDetails?.gameId,
        competitionId,
        userId: currentUser?.userId,
        senderId,
        notificationId,
        notificationType,
      });
      onClose();
    } catch (error) {
      console.error("Error approving game:", error);
    } finally {
      setLoadingDecision(false);
    }
  };

  const handleDeclineGame = async () => {
    setLoadingDecision(true);
    try {
      await declineGame({
        gameId: gameDetails?.gameId,
        competitionId,
        userId: currentUser?.userId,
        senderId,
        notificationId,
        notificationType,
      });
      onClose();
    } catch (error) {
      console.error("Error declining game:", error);
    } finally {
      setLoadingDecision(false);
    }
  };

  const approvalLimitReached =
    gameDetails?.approvalStatus === notificationTypes.RESPONSE.APPROVE_GAME;
  const autoApproved = gameDetails?.autoApproved || false;
  const competitionName = competition?.name || "Unknown Competition";
  const competitionType = competition?.type || "Singles";
  const isDisabled =
    isRead ||
    loadingDecision ||
    gameDeleted ||
    approvalLimitReached ||
    autoApproved;

  return (
    <Modal transparent visible={visible} animationType="slide">
      <ModalContainer>
        <ModalContent>
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <CloseButton onPress={onClose}>
                <AntDesign name="closecircleo" size={30} color="red" />
              </CloseButton>

              <Title>Game Approval Request</Title>

              {competition ? (
                <>
                  <Message>
                    A game has been reported on{" "}
                    <LinkText
                      onPress={() =>
                        navigateTo(config.navRoute, {
                          [config.paramKey]: competitionId,
                        })
                      }
                    >
                      {competitionName}
                    </LinkText>
                  </Message>

                  <Message>
                    Reporter:{" "}
                    <LinkText
                      onPress={() =>
                        navigateTo("UserProfile", { userId: senderId })
                      }
                    >
                      {senderDisplayName}
                    </LinkText>
                  </Message>

                  {!gameDeleted && (
                    <GameContainer>
                      <TeamColumn
                        position="left"
                        players={gameDetails?.team1}
                        competitionType={competitionType}
                      />
                      <ScoreDisplay
                        date={gameDetails?.date || "TBD"}
                        team1={gameDetails?.team1?.score}
                        team2={gameDetails?.team2?.score}
                      />
                      <TeamColumn
                        position="right"
                        players={gameDetails?.team2}
                        competitionType={competitionType}
                      />
                    </GameContainer>
                  )}

                  {autoApproved && (
                    <Description>
                      This game was auto-approved by the system after 24 hours
                      of no declines.
                    </Description>
                  )}

                  {gameDeleted && (
                    <Description>
                      This game has been declined and no longer exists. Please
                      agree on the scores and report again.
                    </Description>
                  )}

                  {approvalLimitReached && (
                    <Description>
                      This game has already been approved by the maximum number
                      of participants. No further actions can be taken.
                    </Description>
                  )}

                  <ButtonRow>
                    <Button
                      variant="decline"
                      disabled={isDisabled}
                      onPress={handleDeclineGame}
                    >
                      <ButtonText>Decline</ButtonText>
                    </Button>
                    <Button disabled={isDisabled} onPress={handleApproveGame}>
                      {loadingDecision ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <ButtonText>Accept</ButtonText>
                      )}
                    </Button>
                  </ButtonRow>
                </>
              ) : (
                <Description>This competition no longer exists.</Description>
              )}
            </>
          )}
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

interface TeamColumnProps {
  position: "left" | "right";
  players?: {
    player1?: Player | null;
    player2?: Player | null;
    score?: number;
  };
  competitionType: string;
}

const TeamColumn = ({
  position,
  players = {},
  competitionType,
}: TeamColumnProps) => (
  <TeamContainer>
    <PlayerCell position={position} player={players?.player1} />
    {competitionType === "Doubles" && (
      <PlayerCell position={position} player={players?.player2} />
    )}
  </TeamContainer>
);

const PlayerCell = ({
  position,
  player,
}: {
  position: "left" | "right";
  player: Player | null | undefined;
}) => (
  <TeamTextContainer position={position}>
    <TeamText position={position}>
      {player ? formatDisplayName(player) : "TBD"}
    </TeamText>
  </TeamTextContainer>
);

const ScoreDisplay = ({
  date,
  team1,
  team2,
}: {
  date: string;
  team1: number | undefined;
  team2: number | undefined;
}) => (
  <ResultsContainer>
    <DateText>{date}</DateText>
    <ScoreContainer>
      <ScoreNumber>{team1 ?? "-"}</ScoreNumber>
      <ScoreSeparator>-</ScoreSeparator>
      <ScoreNumber>{team2 ?? "-"}</ScoreNumber>
    </ScoreContainer>
  </ResultsContainer>
);

// Styled Components
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
  alignItems: "flex-start",
  minHeight: 300,
  justifyContent: "center",
});

const CloseButton = styled.TouchableOpacity({
  alignSelf: "flex-end",
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 10,
});

const Title = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
  marginBottom: 10,
  marginTop: 20,
});

const Message = styled.Text({
  fontSize: 14,
  color: "white",
  marginTop: 10,
});

const LinkText = styled.Text({
  color: "#00A2FF",
  textDecorationLine: "underline",
  fontWeight: "bold",
});

const Description = styled.Text({
  color: "red",
  fontSize: 12,
  marginTop: 10,
  fontWeight: "bold",
  fontStyle: "italic",
});

const ButtonRow = styled.View({
  flexDirection: "row",
  gap: 15,
  marginTop: 10,
});

const Button = styled.TouchableOpacity(
  ({
    disabled,
    variant,
  }: {
    disabled: boolean;
    variant: "decline" | "accept";
  }) => ({
    backgroundColor: disabled
      ? "#888"
      : variant === "decline"
      ? "red"
      : "#00A2FF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    opacity: disabled ? 0.6 : 1,
    width: 100,
    alignItems: "center",
  })
);

const ButtonText = styled.Text({
  color: "white",
  fontWeight: "bold",
});

const GameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  marginTop: 20,
  borderRadius: 8,
  width: "100%",
  paddingVertical: 10,
});

const TeamContainer = styled.View({
  flex: 1.5,
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});

const TeamTextContainer = styled.View({
  flexDirection: "column",
  padding: 15,
  paddingRight: 10,
  paddingLeft: 10,
  width: "100%",
  maxWidth: screenWidth <= 400 ? 125 : 140,
});

const TeamText = styled.Text(
  ({ position }: { position: "left" | "right" }) => ({
    color: "white",
    fontSize: screenWidth <= 400 ? 13 : 14,
    textAlign: position === "right" ? "right" : "left",
    flexWrap: "wrap",
  })
);

const ResultsContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 5,
});

const ScoreContainer = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 5,
  paddingHorizontal: 5,
});

const ScoreNumber = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  color: "#00A2FF",
});

const ScoreSeparator = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  color: "#ccc",
  marginHorizontal: 8,
});

const DateText = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
  marginBottom: 5,
});

export default GameApprovalModal;
