import React, { useState, useCallback, useContext } from "react";
import { Alert } from "react-native";
import styled from "styled-components/native";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

import AddTournamentGameModal from "../../Modals/AddTournamentGameModal";
import GenerateFixturesModal from "../../Modals/GenerateFixturesModal";
import { EmptyStateContainer } from "../EmptyStateContainer";
import BracketTree from "./BracketTree";
import { UserContext } from "../../../context/UserContext";
import { Fixtures, Game, Tournament } from "@shared/types";
import { COMPETITION_TYPES, isShellGame } from "@shared";

const VALID_KNOCKOUT_COUNTS = [4, 8, 16, 32, 64];

interface BracketsProps {
  tournament: Tournament & { tournamentId?: string };
  userRole?: string;
  scrollToGameId?: string;
  glowColor?: string;
}

const Brackets = ({
  tournament,
  userRole,
  scrollToGameId,
  glowColor = "#00A2FF",
}: BracketsProps) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentUser } = useContext(UserContext);

  const [showGenerateFixturesModal, setShowGenerateFixturesModal] =
    useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [generatedFixtures, setGeneratedFixtures] = useState<Fixtures[] | null>(
    tournament?.fixtures ?? null,
  );

  const fixturesArray = generatedFixtures ?? [];
  const hasFixtures = fixturesArray.length > 0;

  const tournamentType = tournament?.tournamentType || "Doubles";
  const tournamentName = tournament?.tournamentName;
  const tournamentId = tournament?.tournamentId ?? "";

  // const numberOfParticipants = tournament?.tournamentParticipants
  //   ? tournament.tournamentParticipants.length
  //   : 0;
  const numberOfParticipants = 32; // Hardcoded for testing purposes
  const isEvenNumberOfParticipants = numberOfParticipants % 2 === 0;
  const knockoutCount =
    tournamentType === "Singles"
      ? numberOfParticipants
      : Math.floor(numberOfParticipants / 2);
  const isValidKnockoutCount = VALID_KNOCKOUT_COUNTS.includes(knockoutCount);

  const emptyStateMessage =
    userRole === "admin"
      ? "Generate the bracket to start the tournament"
      : "Please contact the tournament organizer to generate the brackets.";

  const handleShowGenerateBrackets = () => {
    if (!isEvenNumberOfParticipants) {
      Alert.alert("Please ensure an even number of participants.");
      return;
    }
    if (!isValidKnockoutCount) {
      const unit = tournamentType === "Singles" ? "players" : "teams";
      Alert.alert(
        `Knockout tournaments need ${VALID_KNOCKOUT_COUNTS.join(", ")} ${unit}. You currently have ${knockoutCount}.`,
      );
      return;
    }
    setShowGenerateFixturesModal(true);
  };

  const handleGamePress = useCallback(
    (game: Game) => {
      if (isShellGame(game)) return;

      if (game.result) {
        navigation.navigate("GameScreen", {
          gameId: game.gameId,
          competitionId: tournamentId,
          competitionType: COMPETITION_TYPES.TOURNAMENT,
          competitionName: tournamentName,
          gamescore: game.gamescore,
          date: game.date ?? "",
          team1: game.team1,
          team2: game.team2,
        });
        return;
      }

      setSelectedGame(game);
      setGameModalVisible(true);
    },
    [navigation, tournamentId, tournamentName],
  );

  const handleGameUpdated = useCallback((updatedGame: Game) => {
    setGeneratedFixtures((previous) =>
      (previous ?? []).map((round) => ({
        ...round,
        games: round.games.map((game) =>
          game.gameId === updatedGame.gameId ? updatedGame : game,
        ),
      })),
    );
  }, []);

  return (
    <Container>
      {hasFixtures ? (
        <BracketTree
          fixtures={fixturesArray}
          tournamentType={tournamentType}
          onGamePress={handleGamePress}
          scrollToGameId={scrollToGameId}
          glowColor={glowColor}
        />
      ) : (
        <EmptyStateContainer
          emptyStateMessage={emptyStateMessage}
          userRole={userRole}
          handleShowGenerateFixtures={handleShowGenerateBrackets}
          label="Brackets"
        />
      )}

      {showGenerateFixturesModal && (
        <GenerateFixturesModal
          modalVisible={showGenerateFixturesModal}
          setModalVisible={setShowGenerateFixturesModal}
          competition={tournament}
          currentUser={currentUser}
          setGeneratedFixtures={setGeneratedFixtures}
          generatedFixtures={generatedFixtures}
        />
      )}

      <AddTournamentGameModal
        visible={gameModalVisible}
        game={selectedGame}
        tournamentType={tournamentType}
        currentUser={currentUser}
        tournamentName={tournamentName}
        tournamentId={tournamentId}
        onClose={() => {
          setGameModalVisible(false);
          setSelectedGame(null);
        }}
        onGameUpdated={handleGameUpdated}
      />
    </Container>
  );
};

const Container = styled.View({
  flex: 1,
});

export default Brackets;
