import { Modal, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../context/LeagueContext";
import { LadderContext } from "../../context/LadderContext";
import { useEffect, useState, useContext, useCallback } from "react";
import type { ReactNode } from "react";
import { AntDesign } from "@expo/vector-icons";
import { UserContext } from "../../context/UserContext";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { notificationTypes, notificationSchema, LADDER_TYPE } from "@shared";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import {
  NormalizedCompetition,
  Game,
  Player,
  CollectionName,
  GameTeam,
  LadderMatch,
} from "@shared/types";
import { getCompetitionConfig } from "@/helpers/getCompetitionConfig";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";
import { useGameApproval } from "@/hooks/useGameApproval";

const screenWidth = Dimensions.get("window").width;

const findGame = (
  competition: NormalizedCompetition,
  gameId: string,
  isLeague: boolean,
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

type GameApprovalResponse =
  | typeof notificationTypes.RESPONSE.ACCEPT
  | typeof notificationTypes.RESPONSE.DECLINE;

interface GameApprovalModalProps {
  visible: boolean;
  onClose: () => void;
  notificationId: string;
  notificationType: string;
  senderId: string;
  gameId: string;
  competitionId: string;
  isRead: boolean;
  response: GameApprovalResponse | null;
  /** Ladder notifications carry { ladderId, matchId, gameId } here. */
  data?: {
    ladderId?: string;
    matchId?: string;
    gameId?: string;
  } | null;
}

// Ladder games live in a match subcollection, not a competition doc, so they
// approve through their own view. Everything else keeps the competition path.
const GameApprovalModal = (props: GameApprovalModalProps) => {
  if (props.notificationType === notificationTypes.ACTION.ADD_GAME.LADDER) {
    return <LadderGameApprovalModal {...props} />;
  }
  return <CompetitionGameApprovalModal {...props} />;
};

export default GameApprovalModal;

interface NavigateToParams {
  competitionId?: string;
  userId?: string;
}

const CompetitionGameApprovalModal = ({
  visible,
  onClose,
  notificationId,
  notificationType,
  senderId,
  gameId,
  competitionId,
  isRead,
  response,
}: GameApprovalModalProps) => {
  const { fetchCompetitionById } = useContext(LeagueContext);
  const { currentUser, readNotification } = useContext(UserContext);
  const { approve, decline, loadingDecision } = useGameApproval();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [gameDetails, setGameDetails] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [competition, setCompetition] = useState<NormalizedCompetition | null>(
    null,
  );
  const [senderDisplayName, setSenderDisplayName] = useState<string | null>(
    null,
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
    [onClose, navigation],
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
          collectionName: config.collectionName as CollectionName,
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
          (p) => p.userId === senderId,
        );
        setSenderDisplayName(
          senderParticipant ? formatDisplayName(senderParticipant) : "Unknown",
        );

        const game = findGame(normalizedCompetition, gameId, config.isLeague);

        setCompetition(normalizedCompetition);
        setGameDetails(game);

        if (!game || response === notificationTypes.RESPONSE.DECLINE) {
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
      gameDetails?.approvalStatus ===
        notificationTypes.RESPONSE.APPROVED_GAME &&
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
    await approve({
      gameId: gameDetails?.gameId ?? "",
      competitionId,
      senderId,
      notificationId,
      notificationType,
    });
    onClose();
  };

  const handleDeclineGame = async () => {
    await decline({
      gameId: gameDetails?.gameId ?? "",
      competitionId,
      senderId,
      notificationId,
      notificationType,
    });
    onClose();
  };

  const approvalLimitReached =
    gameDetails?.approvalStatus === notificationTypes.RESPONSE.APPROVED_GAME;
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
    <GameApprovalShell visible={visible} onClose={onClose} loading={loading}>
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
              onPress={() => navigateTo("UserProfile", { userId: senderId })}
            >
              {senderDisplayName}
            </LinkText>
          </Message>

          {!gameDeleted && (
            <GameScoreCard
              game={gameDetails}
              competitionType={competitionType}
            />
          )}

          {autoApproved && (
            <Description>
              This game was auto-approved by the system after 24 hours of no
              declines.
            </Description>
          )}

          {gameDeleted && (
            <Description>
              This game has been declined and no longer exists. Please agree on
              the scores and report again.
            </Description>
          )}

          {approvalLimitReached && (
            <Description>
              This game has already been approved by the maximum number of
              participants. No further actions can be taken.
            </Description>
          )}

          <ApprovalButtons
            onDecline={handleDeclineGame}
            onAccept={handleApproveGame}
            declineDisabled={isDisabled}
            acceptDisabled={isDisabled}
            submitting={loadingDecision}
          />
        </>
      ) : (
        <Description>This competition no longer exists.</Description>
      )}
    </GameApprovalShell>
  );
};

const LadderGameApprovalModal = ({
  visible,
  onClose,
  notificationId,
  senderId,
  gameId,
  data,
}: GameApprovalModalProps) => {
  const { currentUser, readNotification, getUserById, sendNotification } =
    useContext(UserContext);
  const { fetchLadderById, fetchLadderMatches, approveLadderGame } =
    useContext(LadderContext);

  const ladderId = data?.ladderId ?? "";
  const matchId = data?.matchId ?? "";

  const [game, setGame] = useState<Game | null>(null);
  const [ladderName, setLadderName] = useState("this ladder");
  const [competitionType, setCompetitionType] = useState("Singles");
  const [senderDisplayName, setSenderDisplayName] = useState("Unknown");
  const [loading, setLoading] = useState(true);
  const [gameGone, setGameGone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setGame(null);
      setLoading(true);
      setGameGone(false);
      setSubmitting(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [ladder, matches, sender] = await Promise.all([
          fetchLadderById(ladderId),
          fetchLadderMatches(ladderId),
          getUserById(senderId),
        ]);

        if (!isMounted) return;

        const match =
          matches.find((m: LadderMatch) => m.ladderMatchId === matchId) ?? null;
        const found = match?.games.find((g) => g.gameId === gameId) ?? null;

        setLadderName(ladder?.name ?? "this ladder");
        setCompetitionType(
          ladder?.ladderType === LADDER_TYPE.DOUBLES ? "Doubles" : "Singles",
        );
        setSenderDisplayName(sender ? formatDisplayName(sender) : "Unknown");
        setGame(found);

        if (!found) {
          setGameGone(true);
          readNotification(notificationId, currentUser?.userId);
        }
      } catch (error) {
        console.error("Error loading ladder game approval:", error);
        if (isMounted) {
          setGame(null);
          setGameGone(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [visible, ladderId, matchId, gameId, senderId]);

  const alreadyApproved =
    game?.approvalStatus === notificationTypes.RESPONSE.APPROVED_GAME;
  // Gate on the game's own state, not the notification's read flag — reading a
  // notification doesn't resolve the game, and approveLadderGame is the final
  // guard against a double approval.
  const isDisabled = submitting || gameGone || alreadyApproved;

  const handleApprove = async () => {
    if (!currentUser?.userId || !game) return;

    setSubmitting(true);
    const outcome = await approveLadderGame({
      ladderId,
      matchId,
      gameId: game.gameId,
      userId: currentUser.userId,
      approver: {
        userId: currentUser.userId,
        username: currentUser.username,
      },
    });
    setSubmitting(false);

    if (!outcome.success) {
      onClose();
      return;
    }

    await readNotification(
      notificationId,
      currentUser.userId,
      notificationTypes.RESPONSE.ACCEPT,
    );
    await sendNotification({
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: senderId,
      senderId: currentUser.userId,
      message: `${formatDisplayName(currentUser)} approved your game in ${ladderName}`,
      type: notificationTypes.INFORMATION.LADDER.TYPE,
      data: { ladderId, matchId, gameId: game.gameId },
    });
    onClose();
  };

  // ── Decline (ready to implement) ──────────────────────────────────────────
  // Wire this to declineLadderGame (see LadderContext) and the Decline button
  // below when the reject flow is built out.
  //
  // const handleDecline = async () => {
  //   if (!currentUser?.userId || !game) return;
  //   setSubmitting(true);
  //   await declineLadderGame({
  //     ladderId,
  //     matchId,
  //     gameId: game.gameId,
  //     userId: currentUser.userId,
  //   });
  //   setSubmitting(false);
  //   await readNotification(
  //     notificationId,
  //     currentUser.userId,
  //     notificationTypes.RESPONSE.DECLINE,
  //   );
  //   onClose();
  // };

  return (
    <GameApprovalShell visible={visible} onClose={onClose} loading={loading}>
      <Message>A game has been reported in {ladderName}</Message>
      <Message>Reporter: {senderDisplayName}</Message>

      {!gameGone && game && (
        <GameScoreCard game={game} competitionType={competitionType} />
      )}

      {gameGone && (
        <Description>
          This game no longer exists. Please agree on the scores and report
          again.
        </Description>
      )}

      {alreadyApproved && (
        <Description>This game has already been approved.</Description>
      )}

      <ApprovalButtons
        // Decline is wired for a later phase; see handleDecline above.
        onDecline={onClose}
        onAccept={handleApprove}
        declineDisabled
        acceptDisabled={isDisabled}
        submitting={submitting}
      />
    </GameApprovalShell>
  );
};

interface TeamColumnProps {
  position: "left" | "right";
  players?: GameTeam;
  competitionType: string;
}

const TeamColumn = ({
  position,
  players = { player1: null, player2: null },
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
  team1: GameTeam["score"];
  team2: GameTeam["score"];
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

// ── Shared presentation (competition + ladder approval both render these) ──

const GameApprovalShell = ({
  visible,
  onClose,
  loading,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  children: ReactNode;
}) => (
  <Modal transparent visible={visible} animationType="slide">
    <ModalContainer>
      <ModalContent>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <>
            <CloseButton onPress={onClose}>
              <AntDesign name="close-circle" size={30} color="red" />
            </CloseButton>
            <Title>Game Approval Request</Title>
            {children}
          </>
        )}
      </ModalContent>
    </ModalContainer>
  </Modal>
);

const GameScoreCard = ({
  game,
  competitionType,
}: {
  game?: Game | null;
  competitionType: string;
}) => (
  <GameContainer>
    <TeamColumn
      position="left"
      players={game?.team1}
      competitionType={competitionType}
    />
    <ScoreDisplay
      date={game?.date || "TBD"}
      team1={game?.team1?.score}
      team2={game?.team2?.score}
    />
    <TeamColumn
      position="right"
      players={game?.team2}
      competitionType={competitionType}
    />
  </GameContainer>
);

const ApprovalButtons = ({
  onDecline,
  onAccept,
  declineDisabled,
  acceptDisabled,
  submitting,
}: {
  onDecline: () => void;
  onAccept: () => void;
  declineDisabled: boolean;
  acceptDisabled: boolean;
  submitting: boolean;
}) => (
  <ButtonRow>
    <Button variant="decline" disabled={declineDisabled} onPress={onDecline}>
      <ButtonText>Decline</ButtonText>
    </Button>
    <Button disabled={acceptDisabled} onPress={onAccept}>
      {submitting ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <ButtonText>Accept</ButtonText>
      )}
    </Button>
  </ButtonRow>
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
  }),
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
  }),
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
