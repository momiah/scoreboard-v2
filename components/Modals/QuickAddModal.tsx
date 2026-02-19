import React, { useState, useContext, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { UserContext } from "../../context/UserContext";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AddGameModal from "./AddGameModal";
import AddTournamentGameModal from "./AddTournamentGameModal";
import { COMPETITION_TYPES } from "../../schemas/schema";
import { NormalizedCompetition } from "../../types/competition";
import CompetitionSelector from "../CompetitionSelector";
import { Game } from "@/types/game";
import { normalizeCompetitionData } from "../../helpers/normalizeCompetitionData";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

type CompetitionType =
  (typeof COMPETITION_TYPES)[keyof typeof COMPETITION_TYPES];

const TABS = [
  { key: COMPETITION_TYPES.LEAGUE, label: "Leagues" },
  { key: COMPETITION_TYPES.TOURNAMENT, label: "Tournaments" },
] as const;

interface GameStatus {
  canAddGame: boolean;
  message: string;
  game: Game | null;
}

interface QuickAddModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  onSuccess?: () => void;
}

const QuickAddModal = ({
  modalVisible,
  setModalVisible,
  onSuccess,
}: QuickAddModalProps) => {
  const { currentUser, getCompetitionsForUser, fetchPlayers } =
    useContext(UserContext);

  const [competitions, setCompetitions] = useState<NormalizedCompetition[]>([]);
  const [selectedCompetition, setSelectedCompetition] =
    useState<NormalizedCompetition | null>(null);
  const [loading, setLoading] = useState(false);
  const [addGameModalVisible, setAddGameModalVisible] = useState(false);
  const [addTournamentGameModalVisible, setAddTournamentGameModalVisible] =
    useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    canAddGame: true,
    message: "",
    game: null,
  });
  const [pendingGameWarning, setPendingGameWarning] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<CompetitionType>(
    COMPETITION_TYPES.LEAGUE,
  );

  // Fetch and normalize competitions based on active tab
  useEffect(() => {
    const fetchCompetitions = async () => {
      const userId = currentUser?.userId;
      if (!userId || !modalVisible) return;

      try {
        setLoading(true);

        const collectionName =
          activeTab === COMPETITION_TYPES.LEAGUE ? "leagues" : "tournaments";

        const rawCompetitions = await getCompetitionsForUser(
          userId,
          collectionName,
        );

        const normalized = rawCompetitions.map((comp: NormalizedCompetition) =>
          normalizeCompetitionData({
            rawData: comp,
            competitionType: activeTab,
          }),
        ) as NormalizedCompetition[];

        setCompetitions(normalized);
      } catch (error) {
        console.error("Error fetching competitions:", error);
        setCompetitions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, [currentUser?.userId, modalVisible, activeTab, getCompetitionsForUser]);

  // Find next game when tournament is selected
  useEffect(() => {
    if (!selectedCompetition || activeTab !== COMPETITION_TYPES.TOURNAMENT) {
      setGameStatus({ canAddGame: true, message: "", game: null });
      setPendingGameWarning(null);
      return;
    }

    const findNextGame = () => {
      const userId = currentUser?.userId;
      if (!userId) return;

      if (loading) return;

      // Flatten all games from all fixture rounds
      const allGames: Game[] = [];
      selectedCompetition.fixtures?.forEach((fixture) => {
        fixture.games?.forEach((game) => {
          allGames.push(game);
        });
      });

      // Filter games where user is a participant
      const userGames = allGames.filter((game) => {
        const isInTeam1 =
          game.team1?.player1?.userId === userId ||
          game.team1?.player2?.userId === userId;
        const isInTeam2 =
          game.team2?.player1?.userId === userId ||
          game.team2?.player2?.userId === userId;
        return isInTeam1 || isInTeam2;
      });

      // Sort by game number
      const sortedGames = userGames.sort(
        (a, b) => (a.gameNumber || 0) - (b.gameNumber || 0),
      );

      // Check for any pending games (for warning badge)
      const pendingGames = userGames.filter(
        (game) => game.approvalStatus === "Pending",
      );

      if (pendingGames.length > 0) {
        setPendingGameWarning(
          `You have ${pendingGames.length} pending game${pendingGames.length > 1 ? "s" : ""} awaiting approval`,
        );
      } else {
        setPendingGameWarning(null);
      }

      // Find first scheduled game
      const nextScheduledGame = sortedGames.find(
        (game) => game.approvalStatus === "Scheduled",
      );

      if (nextScheduledGame) {
        setGameStatus({
          canAddGame: true,
          message: "Add game for your next scheduled match.",
          game: nextScheduledGame,
        });
        setSelectedGame(nextScheduledGame);
      } else {
        // Check if all games are completed
        const hasCompletedGames = userGames.some(
          (game) => game.approvalStatus === "Approved",
        );

        setGameStatus({
          canAddGame: false,
          message: hasCompletedGames
            ? "All your tournament games have been completed! 🎉"
            : "No upcoming games found. Tournament fixtures may not be generated yet.",
          game: null,
        });
        setSelectedGame(null);
      }
    };

    findNextGame();
  }, [selectedCompetition, activeTab, currentUser?.userId, loading]);

  const closeQuickAddModal = () => {
    setModalVisible(false);
    setSelectedCompetition(null);
    setSelectedGame(null);
    setGameStatus({ canAddGame: true, message: "", game: null });
    setPendingGameWarning(null); // Clear warning
  };
  const handleCompetitionSelect = (competition: NormalizedCompetition) => {
    setSelectedCompetition(competition);
  };

  const handleSubmit = () => {
    if (!selectedCompetition) return;

    if (activeTab === COMPETITION_TYPES.LEAGUE) {
      setAddGameModalVisible(true);
      fetchPlayers(selectedCompetition.id);
    } else {
      // For tournaments, check game status
      if (gameStatus.canAddGame && selectedGame) {
        setAddTournamentGameModalVisible(true);
      }
    }
  };

  const handleGameUpdated = () => {
    // Refresh competitions after game is updated
    const userId = currentUser?.userId;
    if (!userId) return;

    const collectionName =
      activeTab === COMPETITION_TYPES.LEAGUE ? "leagues" : "tournaments";

    getCompetitionsForUser(userId, collectionName).then(
      (rawCompetitions: NormalizedCompetition[]) => {
        const normalized: NormalizedCompetition[] = rawCompetitions.map(
          (comp: NormalizedCompetition) =>
            normalizeCompetitionData({
              rawData: comp,
              competitionType: activeTab,
            }),
        ) as NormalizedCompetition[];
        setCompetitions(normalized);
      },
    );

    closeQuickAddModal();
    if (onSuccess) {
      onSuccess();
    }
  };

  const isLeagueTab = activeTab === COMPETITION_TYPES.LEAGUE;
  const noCompetitions = competitions.length === 0;
  const isTournamentWithIssue = !isLeagueTab && !gameStatus.canAddGame;

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeQuickAddModal}
      >
        <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <ModalContent>
            <TouchableOpacity
              onPress={closeQuickAddModal}
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

            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "white",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Select a competition to add a game
            </Text>

            <TabContainer>
              {TABS.map((tab) => (
                <TabItem
                  key={tab.key}
                  isActive={activeTab === tab.key}
                  onPress={() => {
                    setActiveTab(tab.key);
                    setSelectedCompetition(null);
                    setSelectedGame(null);
                  }}
                >
                  <TabText isActive={activeTab === tab.key}>
                    {tab.label}
                  </TabText>
                </TabItem>
              ))}
            </TabContainer>

            <CompetitionSelector
              competitions={competitions}
              selectedId={selectedCompetition?.id}
              onSelectCompetition={handleCompetitionSelect}
              profile={currentUser}
              loading={loading}
            />

            {!isLeagueTab && selectedCompetition && !loading && (
              <>
                {/* Priority: 1. Error, 2. Warning, 3. Info */}
                {!gameStatus.canAddGame ? (
                  // Error: Cannot add game
                  <MessageBanner type="error">
                    <Ionicons name="close-circle" size={16} color="#FF6B6B" />
                    <MessageText type="error">{gameStatus.message}</MessageText>
                  </MessageBanner>
                ) : pendingGameWarning ? (
                  // Warning: Pending game exists
                  <MessageBanner type="warning">
                    <Ionicons name="warning" size={16} color="#FFA500" />
                    <MessageText type="warning">
                      {pendingGameWarning}
                    </MessageText>
                  </MessageBanner>
                ) : gameStatus.message ? (
                  // Info: Ready to add game
                  <MessageBanner type="info">
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#4ECDC4"
                    />
                    <MessageText type="info">{gameStatus.message}</MessageText>
                  </MessageBanner>
                ) : null}
              </>
            )}

            <SubmitButton
              onPress={handleSubmit}
              disabled={
                loading ||
                !selectedCompetition ||
                noCompetitions ||
                isTournamentWithIssue
              }
              style={{
                backgroundColor:
                  loading ||
                  !selectedCompetition ||
                  noCompetitions ||
                  isTournamentWithIssue
                    ? "#666"
                    : "#00A2FF",
                opacity:
                  loading ||
                  !selectedCompetition ||
                  noCompetitions ||
                  isTournamentWithIssue
                    ? 0.6
                    : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                Add Game
              </Text>
            </SubmitButton>
          </ModalContent>
        </ModalContainer>
      </Modal>

      {addGameModalVisible && selectedCompetition && (
        <AddGameModal
          modalVisible={addGameModalVisible}
          setModalVisible={setAddGameModalVisible}
          leagueId={selectedCompetition.id}
          leagueGames={selectedCompetition.games}
          leagueType={selectedCompetition.type}
          leagueName={selectedCompetition.name}
          onGameUpdated={handleGameUpdated}
        />
      )}

      {addTournamentGameModalVisible && selectedCompetition && selectedGame && (
        <AddTournamentGameModal
          visible={addTournamentGameModalVisible}
          game={selectedGame}
          tournamentType={selectedCompetition.type}
          currentUser={currentUser}
          tournamentName={selectedCompetition.name}
          tournamentId={selectedCompetition.id}
          onClose={() => {
            setAddTournamentGameModalVisible(false);
          }}
          onGameUpdated={handleGameUpdated}
        />
      )}
    </View>
  );
};

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
  maxHeight: "80%",
  paddingTop: 60,
});

const TabContainer = styled.View({
  flexDirection: "row",
  marginBottom: 15,
  borderBottomWidth: 1,
  borderBottomColor: "rgb(9, 33, 62)",
});

const TabItem = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    flex: 1,
    borderBottomColor: isActive ? "#00A2FF" : "transparent",
    borderBottomWidth: 2,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  }),
);

const TabText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    fontSize: 14,
    fontWeight: "bold",
    color: isActive ? "#ffffff" : "#aaa",
  }),
);

const MessageBanner = styled.View<{ type: "warning" | "info" | "error" }>(
  ({ type }: { type: "warning" | "info" | "error" }) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      type === "warning"
        ? "rgba(255, 165, 0, 0.1)"
        : type === "error"
          ? "rgba(255, 107, 107, 0.1)"
          : "rgba(78, 205, 196, 0.1)",
    borderWidth: 1,
    borderColor:
      type === "warning"
        ? "rgba(255, 165, 0, 0.3)"
        : type === "error"
          ? "rgba(255, 107, 107, 0.3)"
          : "rgba(78, 205, 196, 0.3)",
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
    gap: 8,
  }),
);

const MessageText = styled.Text<{ type: "warning" | "info" | "error" }>(
  ({ type }: { type: "warning" | "info" | "error" }) => ({
    fontSize: 13,
    color:
      type === "warning" ? "#FFA500" : type === "error" ? "#FF6B6B" : "#4ECDC4",
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  }),
);

const SubmitButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  marginTop: 20,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
});

// const StatusMessage = styled.Text<{ error?: boolean }>(
//   ({ error }: { error?: boolean }) => ({
//     fontSize: 13,
//     color: error ? "#bf0000ff" : "#00A2FF",
//     marginTop: 15,
//     textAlign: "center",
//     fontStyle: "italic",
//     paddingHorizontal: 10,
//   }),
// );

// const WarningBadge = styled.View({
//   flexDirection: "row",
//   alignItems: "center",
//   justifyContent: "center",
//   backgroundColor: "rgba(255, 165, 0, 0.1)",
//   borderWidth: 1,
//   borderColor: "rgba(255, 165, 0, 0.3)",
//   borderRadius: 8,
//   padding: 10,
//   marginTop: 15,
//   gap: 8,
// });

// const WarningText = styled.Text({
//   fontSize: 13,
//   color: "#FFA500",
//   fontWeight: "500",
// });

export default QuickAddModal;
