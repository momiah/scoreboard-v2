import React, { useState, useContext } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import AddTournamentGameModal from "./AddTournamentGameModal";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import {
  Tournament as BaseTournament,
  NormalizedCompetition,
} from "../../types/competition";
import { Game } from "@/types/game";
import { UserContext } from "../../context/UserContext";

const { width: screenWidth } = Dimensions.get("window");

// Extend Tournament to include Firestore document ID
interface Tournament extends BaseTournament {
  id: string;
}

interface TournamentFixturesModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  tournament: NormalizedCompetition;
}

const TournamentFixturesModal: React.FC<TournamentFixturesModalProps> = ({
  modalVisible,
  setModalVisible,
  tournament,
}) => {
  const { currentUser } = useContext(UserContext);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [addTournamentGameModalVisible, setAddTournamentGameModalVisible] =
    useState(false);

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setAddTournamentGameModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedGame(null);
  };

  const handleGameUpdated = (updatedGame: Game) => {
    console.log("Game updated:", updatedGame);
    // Optionally refresh tournament data here
  };

  // Get all games from the tournament
  // Tournament can have games in either tournament.games or flattened from tournament.fixtures
  const allGames = tournament?.games || [];

  // Alternatively, if games are in fixtures structure:
  // const allGames = tournament?.fixtures?.flatMap(fixture => fixture.games) || [];

  // Filter out already completed/reported games
  const pendingGames = allGames.filter(
    (game) => game.approvalStatus !== "Approved" && !game.result,
  );

  const renderGameItem = ({ item }: { item: Game }) => {
    const team1Player1 = item.team1?.player1
      ? formatDisplayName(item.team1.player1)
      : "TBD";
    const team1Player2 = item.team1?.player2
      ? formatDisplayName(item.team1.player2)
      : null;
    const team2Player1 = item.team2?.player1
      ? formatDisplayName(item.team2.player1)
      : "TBD";
    const team2Player2 = item.team2?.player2
      ? formatDisplayName(item.team2.player2)
      : null;

    const team1Display = team1Player2
      ? `${team1Player1} & ${team1Player2}`
      : team1Player1;
    const team2Display = team2Player2
      ? `${team2Player1} & ${team2Player2}`
      : team2Player1;

    return (
      <GameItem onPress={() => handleGameSelect(item)}>
        <GameHeader>
          {item.gameNumber && <GameNumber>Game #{item.gameNumber}</GameNumber>}
          {item.court && <CourtText>Court {item.court}</CourtText>}
        </GameHeader>
        <TeamsContainer>
          <TeamName>{team1Display}</TeamName>
          <VsText>vs</VsText>
          <TeamName>{team2Display}</TeamName>
        </TeamsContainer>
      </GameItem>
    );
  };

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <GradientOverlay colors={["#191b37", "#001d2e"]}>
            <ModalContent>
              <TouchableOpacity
                onPress={closeModal}
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

              <HeaderContainer>
                <TournamentName>{tournament?.name}</TournamentName>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "white",
                    marginTop: 10,
                  }}
                >
                  Select a fixture to add result
                </Text>
              </HeaderContainer>

              {pendingGames.length === 0 ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#aaa",
                    marginTop: 20,
                    textAlign: "center",
                  }}
                >
                  No pending games found. All games have been completed 🎉
                </Text>
              ) : (
                <GameList
                  data={pendingGames}
                  renderItem={renderGameItem}
                  keyExtractor={(item) => item.gameId}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </ModalContent>
          </GradientOverlay>
        </ModalContainer>
      </Modal>

      {addTournamentGameModalVisible && selectedGame && (
        <AddTournamentGameModal
          visible={addTournamentGameModalVisible}
          game={selectedGame}
          tournamentType={tournament.type}
          onClose={() => {
            setAddTournamentGameModalVisible(false);
            setSelectedGame(null);
          }}
          onGameUpdated={handleGameUpdated}
          currentUser={currentUser}
          tournamentName={tournament.name}
          tournamentId={tournament.id}
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

const GradientOverlay = styled(LinearGradient)({
  padding: 2,
  borderRadius: 12,
  opacity: 0.9,
});

const HeaderContainer = styled.View({
  marginBottom: 20,
  alignItems: "center",
});

const TournamentName = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
});

const GameList = styled.FlatList({
  maxHeight: 400,
  marginTop: 10,
}) as typeof FlatList;

const GameItem = styled.TouchableOpacity({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  padding: 15,
  borderRadius: 8,
  marginBottom: 10,
});

const GameHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 10,
});

const GameNumber = styled.Text({
  color: "#00A2FF",
  fontSize: 12,
  fontWeight: "600",
});

const CourtText = styled.Text({
  color: "#aaa",
  fontSize: 12,
});

const TeamsContainer = styled.View({
  alignItems: "center",
});

const TeamName = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "600",
  textAlign: "center",
});

const VsText = styled.Text({
  color: "#aaa",
  fontSize: 12,
  marginVertical: 5,
});

export default TournamentFixturesModal;
