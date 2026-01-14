import React, { useState, useContext, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { UserContext } from "../../../context/UserContext";
import { PopupContext } from "../../../context/PopupContext";
import moment from "moment";
import { validateBadmintonScores } from "../../../helpers/validateBadmintonScores";
import Popup from "../../../components/popup/Popup";
import { calculateWin } from "../../../helpers/calculateWin";
import {
  Game,
  GameTeam,
  GameResult,
  CompetitionTypes,
} from "../../../types/game";

import { Tournament } from "../../../types/competition";
import {
  FixtureGameHeader,
  FixtureTeamColumn,
  FixtureRoundHeader,
} from "../../../components/Tournaments/Fixtures/FixturesAtoms";
import { LeagueContext } from "@/context/LeagueContext";
import { COLLECTION_NAMES } from "@/schemas/schema";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../services/firebase.config";
import { processGamePerformance } from "../../../helpers/processGamePerformance";
import { ScoreboardProfile } from "../../../types/player";

const { height: screenHeight } = Dimensions.get("window");
const popupHeight = screenHeight * 0.3;

type BulkFixturesPublisherParams = {
  tournamentId: string;
  tournamentById: Tournament;
};

interface GameWithScores extends Game {
  inputTeam1Score: string;
  inputTeam2Score: string;
  hasScores: boolean;
}

interface BulkScoreDisplayProps {
  game: GameWithScores;
  onScoreChange: (
    gameId: string,
    team: "team1" | "team2",
    score: string
  ) => void;
}

interface BulkGameItemProps {
  game: GameWithScores;
  tournamentType: CompetitionTypes;
  onScoreChange: (
    gameId: string,
    team: "team1" | "team2",
    score: string
  ) => void;
}

const BulkScoreDisplay = ({ game, onScoreChange }: BulkScoreDisplayProps) => {
  const hasReportedScore =
    game.result && game.gamescore && game.gamescore !== "";

  return (
    <BulkScoreContainer>
      {hasReportedScore ? (
        <StaticScoreContainer>
          <StaticScore>{game.team1.score}</StaticScore>
          <VsText>-</VsText>
          <StaticScore>{game.team2.score}</StaticScore>
        </StaticScoreContainer>
      ) : (
        // Interactive inputs for unreported games
        <ScoreInputsContainer>
          <ScoreInput
            value={game.inputTeam1Score}
            onChangeText={(text: string) =>
              onScoreChange(game.gameId, "team1", text)
            }
            placeholder="0"
            keyboardType="numeric"
            maxLength={2}
          />
          <VsText>-</VsText>
          <ScoreInput
            value={game.inputTeam2Score}
            onChangeText={(text: string) =>
              onScoreChange(game.gameId, "team2", text)
            }
            placeholder="0"
            keyboardType="numeric"
            maxLength={2}
          />
        </ScoreInputsContainer>
      )}
    </BulkScoreContainer>
  );
};

// Custom game item for bulk editing
const BulkGameItem = ({
  game,
  tournamentType,
  onScoreChange,
}: BulkGameItemProps) => (
  <GameCard>
    <FixtureGameHeader game={game} />
    <GameContent>
      <FixtureTeamColumn
        team={game?.team1}
        position="left"
        tournamentType={tournamentType}
      />
      <BulkScoreDisplay game={game} onScoreChange={onScoreChange} />
      <FixtureTeamColumn
        team={game?.team2}
        position="right"
        tournamentType={tournamentType}
      />
    </GameContent>
  </GameCard>
);

const BulkFixturesPublisher = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { tournamentId, tournamentById } =
    route.params as BulkFixturesPublisherParams;
  const { currentUser } = useContext(UserContext);
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);
  const { updateTournamentGame, fetchCompetitionById } =
    useContext(LeagueContext);

  useFocusEffect(
    useCallback(() => {
      const refreshGames = async () => {
        try {
          const updatedTournament = await fetchCompetitionById({
            competitionId: tournamentId,
            collectionName: COLLECTION_NAMES.tournaments,
          });

          if (updatedTournament?.fixtures) {
            setGamesWithScores((prev) => {
              const updated = prev.map((game) => {
                const freshGame = updatedTournament.fixtures
                  .flatMap(
                    (round: { round: number; games: Game[] }) => round.games
                  )
                  .find((g: Game) => g.gameId === game.gameId);

                return freshGame
                  ? {
                      ...freshGame,
                      inputTeam1Score: game.inputTeam1Score,
                      inputTeam2Score: game.inputTeam2Score,
                      hasScores: game.hasScores,
                    }
                  : game;
              });
              return updated;
            });
          }
        } catch (error) {
          console.error("❌ Error refreshing games:", error);
        }
      };

      refreshGames();
    }, [tournamentId])
  );

  const initializeGamesWithScores = useCallback((): GameWithScores[] => {
    const allGames: GameWithScores[] = [];
    tournamentById?.fixtures?.forEach((round) => {
      round.games?.forEach((game) => {
        allGames.push({
          ...game,
          inputTeam1Score: "",
          inputTeam2Score: "",
          hasScores: false,
        });
      });
    });
    return allGames;
  }, [tournamentById?.fixtures]);

  const [gamesWithScores, setGamesWithScores] = useState<GameWithScores[]>(
    initializeGamesWithScores
  );
  const [publishing, setPublishing] = useState<boolean>(false);

  const handleClosePopup = (): void => {
    setShowPopup(false);
    setPopupMessage("");
    navigation.goBack();
  };

  const handleScoreChange = useCallback(
    (gameId: string, team: "team1" | "team2", score: string): void => {
      const numericText = score.replace(/[^0-9]/g, "");
      if (numericText.length <= 2) {
        setGamesWithScores((prev) =>
          prev.map((game) => {
            if (game.gameId === gameId) {
              const updatedGame = {
                ...game,
                [`input${team === "team1" ? "Team1" : "Team2"}Score`]:
                  numericText,
              };
              const team1Score =
                team === "team1" ? numericText : game.inputTeam1Score;
              const team2Score =
                team === "team2" ? numericText : game.inputTeam2Score;
              updatedGame.hasScores =
                team1Score.trim() !== "" && team2Score.trim() !== "";
              return updatedGame;
            }
            return game;
          })
        );
      }
    },
    []
  );

  // Group games by round for display
  const gamesByRound: Record<number, GameWithScores[]> = gamesWithScores.reduce(
    (rounds, game) => {
      const roundIndex = tournamentById?.fixtures?.findIndex((round) =>
        round.games?.some((g) => g.gameId === game.gameId)
      );
      if (roundIndex !== undefined && roundIndex >= 0) {
        const roundNumber = roundIndex + 1;
        if (!rounds[roundNumber]) {
          rounds[roundNumber] = [];
        }
        rounds[roundNumber].push(game);
      }
      return rounds;
    },
    {} as Record<number, GameWithScores[]>
  );

  const publishedGamesCount = gamesWithScores.filter(
    (game) => game.result && game.gamescore && game.gamescore !== ""
  ).length;

  const gamesReadyToSubmit: GameWithScores[] = gamesWithScores.filter(
    (game) =>
      game.hasScores &&
      !(game.result && game.gamescore && game.gamescore !== "")
  );

  const totalCompletedCount = publishedGamesCount + gamesReadyToSubmit.length;

  // Update the handleSubmitGames function
  const handleSubmitGames = useCallback(async (): Promise<void> => {
    if (gamesReadyToSubmit.length === 0) {
      Alert.alert(
        "No Scores",
        "Please add scores to at least one game before submitting."
      );
      return;
    }

    // Validate all scores
    const invalidGames: string[] = [];
    const validatedGames: Game[] = [];

    for (const game of gamesReadyToSubmit) {
      const score1 = parseInt(game.inputTeam1Score);
      const score2 = parseInt(game.inputTeam2Score);

      const validationError = validateBadmintonScores(score1, score2);
      if (validationError) {
        invalidGames.push(`Game ${game.gameNumber}: ${validationError}`);
        continue;
      }

      // Create updated game object
      const team1: GameTeam = {
        ...game.team1,
        score: score1,
      };

      const team2: GameTeam = {
        ...game.team2,
        score: score2,
      };

      const result = calculateWin(
        team1,
        team2,
        tournamentById.tournamentType as CompetitionTypes
      ) as GameResult;

      const updatedGame: Game = {
        ...game,
        gamescore: `${score1}-${score2}`,
        reportedAt: new Date(),
        reportedTime: moment().format("HH:mm"),
        team1,
        team2,
        result,
        numberOfApprovals: 0,
        numberOfDeclines: 0,
        approvalStatus: "Approved",
        reporter: currentUser?.userId || "",
      };

      validatedGames.push(updatedGame);
    }

    if (invalidGames.length > 0) {
      Alert.alert(
        "Invalid Scores",
        `Please fix these games:\n\n${invalidGames.join("\n")}`
      );
      return;
    }

    Alert.alert(
      "Confirm Submit",
      `Submit ${validatedGames.length} game result${
        validatedGames.length > 1 ? "s" : ""
      }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "default",
          onPress: async () => {
            setPublishing(true);
            try {
              let successCount = 0;
              const failedGames: string[] = [];

              // Track participants for progressive updates
              let currentParticipants: ScoreboardProfile[] =
                tournamentById.tournamentParticipants || [];

              for (const game of validatedGames) {
                try {
                  // Update the game in Firestore
                  await updateTournamentGame({
                    tournamentId: tournamentId,
                    gameId: game.gameId,
                    gameResult: game,
                    removeGame: false,
                  });

                  // Process player and team performance updates
                  const performanceResult = await processGamePerformance({
                    game,
                    participants: currentParticipants,
                    competitionId: tournamentId,
                    collectionName: "tournaments",
                  });

                  if (performanceResult.success) {
                    currentParticipants = performanceResult.updatedParticipants;
                  } else {
                    console.warn(
                      `Performance update warning for Game ${game.gameNumber}:`,
                      performanceResult.message
                    );
                  }

                  successCount++;
                } catch (error) {
                  console.error(
                    `❌ Failed to update Game ${game.gameNumber}:`,
                    error
                  );
                  failedGames.push(`Game ${game.gameNumber}`);
                }
              }

              // Update tournament with final participant stats
              if (successCount > 0) {
                try {
                  const tournamentRef = doc(db, "tournaments", tournamentId);
                  await updateDoc(tournamentRef, {
                    tournamentParticipants: currentParticipants,
                  });
                  console.log(
                    `✅ Updated ${currentParticipants.length} tournament participants`
                  );
                } catch (error) {
                  console.error(
                    "Failed to update tournament participants:",
                    error
                  );
                }
              }

              if (successCount === validatedGames.length) {
                handleShowPopup(
                  `Successfully submitted ${successCount} game result${
                    successCount > 1 ? "s" : ""
                  }!`
                );
              } else if (successCount > 0) {
                Alert.alert(
                  "Partial Success",
                  `${successCount} game${
                    successCount > 1 ? "s" : ""
                  } updated successfully.\n\nFailed: ${failedGames.join(", ")}`
                );
              } else {
                Alert.alert(
                  "Update Failed",
                  `Failed to update any games. Please try again.\n\nFailed: ${failedGames.join(
                    ", "
                  )}`
                );
              }
            } catch (error) {
              console.error("Error during bulk submission:", error);
              Alert.alert("Error", "Failed to submit games. Please try again.");
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  }, [
    gamesReadyToSubmit,
    tournamentById,
    tournamentId,
    currentUser,
    handleShowPopup,
    updateTournamentGame,
  ]);

  // Handle cancel
  const handleCancel = useCallback((): void => {
    const hasAnyScores = gamesWithScores.some((game) => game.hasScores);

    if (!hasAnyScores) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      "Confirm Cancel",
      "Are you sure you want to cancel? All entered scores will be lost.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  }, [gamesWithScores, navigation]);

  const submitText: string =
    gamesReadyToSubmit.length === 1
      ? "Submit 1 Game"
      : `Submit ${gamesReadyToSubmit.length} Games`;

  return (
    <Container>
      <Popup
        visible={showPopup}
        message={popupMessage}
        onClose={handleClosePopup}
        type="success"
        height={popupHeight}
      />

      <Header>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Bulk Publish Fixtures</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <SubHeader>
        <SubHeaderText>
          Enter scores for games you want to publish ({totalCompletedCount}/
          {gamesWithScores.length} completed)
        </SubHeaderText>
      </SubHeader>

      <FixturesScrollContainer>
        {Object.entries(gamesByRound).map(([roundNumber, games]) => (
          <FixtureRoundContainer key={roundNumber}>
            <FixtureRoundHeader roundNumber={parseInt(roundNumber)} />
            {games.map((game) => (
              <BulkGameItem
                key={game.gameId}
                game={game}
                tournamentType={
                  tournamentById.tournamentType as CompetitionTypes
                }
                onScoreChange={handleScoreChange}
              />
            ))}
          </FixtureRoundContainer>
        ))}
      </FixturesScrollContainer>

      <SubmitButtons>
        <SubmitButton
          onPress={handleSubmitGames}
          disabled={gamesReadyToSubmit.length === 0 || publishing}
          style={{
            backgroundColor:
              gamesReadyToSubmit.length === 0 || publishing
                ? "#666"
                : "#00A2FF",
          }}
        >
          {publishing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ButtonText>{submitText}</ButtonText>
          )}
        </SubmitButton>
      </SubmitButtons>
    </Container>
  );
};

// Styled Components (same as before)
const Container = styled.View({
  flex: 1,
  backgroundColor: "#020D18",
  //   padding: 20,
});

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
  marginTop: 40,
  paddingHorizontal: 10,
});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const SubHeader = styled.View({
  marginBottom: 20,
});

const SubHeaderText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  textAlign: "center",
});

const FixturesScrollContainer = styled.ScrollView({
  flex: 1,
});

const FixtureRoundContainer = styled.View({
  marginBottom: 20,
});

const GameCard = styled.View({
  marginHorizontal: 20,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 8,
  backgroundColor: "rgb(3, 16, 31)",
  overflow: "hidden",
});

const GameContent = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 8,
});

const SubmitButtons = styled.View({
  flexDirection: "row",
  gap: 10,
  paddingTop: 20,
  paddingHorizontal: 20,
  paddingBottom: 30,
});

const SubmitButton = styled.TouchableOpacity({
  flex: 2,
  backgroundColor: "#00A2FF",
  padding: 15,
  borderRadius: 8,
  alignItems: "center",
});

const ButtonText = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
});

// Add these new styled components
const StaticScoreContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
});

const StaticScore = styled.Text({
  fontSize: 25,
  fontWeight: "bold",
  color: "#00A2FF",
  marginBottom: 4,
});

const BulkScoreContainer = styled.View({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: 10,
});

const ScoreInputsContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
});

const ScoreInput = styled.TextInput({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 6,
  width: 40,
  height: 40,
  textAlign: "center",
  fontSize: 16,
  fontWeight: "bold",
  color: "#00A2FF",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.2)",
});

const VsText = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "#00A2FF",
  marginHorizontal: 8,
});

export default BulkFixturesPublisher;
