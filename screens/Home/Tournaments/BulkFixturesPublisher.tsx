import React, { useState, useContext, useCallback, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
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
  advanceBrackets,
  calculatePlayerPerformance,
  calculateTeamPerformance,
  recalculateParticipantsFromFixtures,
  getOrderedApprovedGames,
} from "@shared/helpers";
import {
  Game,
  GameTeam,
  GameResult,
  CompetitionTypes,
  Tournament,
  UserProfile,
  Fixtures,
} from "@shared/types";
import {
  FixtureGameHeader,
  FixtureTeamColumn,
  FixtureRoundHeader,
} from "../../../components/Tournaments/Fixtures/FixturesAtoms";
import { LeagueContext } from "@/context/LeagueContext";
import {
  formatScoreDigits,
  deriveScoresFromInput,
  formatScoresToInput,
} from "../../../helpers/scoreInputHelpers";
import { isShellGame } from "@/shared";

import { doc, updateDoc, increment, onSnapshot } from "firebase/firestore";
import { db } from "../../../services/firebase.config";
import { getUserById } from "../../../devFunctions/firebaseFunctions";
import { getPlayerUserIds } from "../../../context/LeagueContext";

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
  round: number;
}

interface BulkScoreDisplayProps {
  game: GameWithScores;
  onScoresChange: (
    gameId: string,
    team1Score: string,
    team2Score: string,
  ) => void;
}

interface BulkGameItemProps {
  game: GameWithScores;
  tournamentType: CompetitionTypes;
  onScoresChange: (
    gameId: string,
    team1Score: string,
    team2Score: string,
  ) => void;
}

const BulkScoreDisplay = ({ game, onScoresChange }: BulkScoreDisplayProps) => {
  const hasReportedScore =
    game.result && game.gamescore && game.gamescore !== "";

  const [scoreInput, setScoreInput] = React.useState(() =>
    formatScoresToInput({
      team1Score: game.inputTeam1Score,
      team2Score: game.inputTeam2Score,
    }),
  );

  useEffect(() => {
    const derivedScores = deriveScoresFromInput(scoreInput);

    if (
      derivedScores.team1Score !== game.inputTeam1Score ||
      derivedScores.team2Score !== game.inputTeam2Score
    ) {
      setScoreInput(
        formatScoresToInput({
          team1Score: game.inputTeam1Score,
          team2Score: game.inputTeam2Score,
        }),
      );
    }
  }, [game.inputTeam1Score, game.inputTeam2Score]);

  const handleScoreInputChange = (incomingValue: string) => {
    const isDeleting = incomingValue.length < scoreInput.length;
    let digits = incomingValue.replace(/[^0-9]/g, "").slice(0, 4);

    if (isDeleting && digits.length === 2 && !incomingValue.endsWith("-")) {
      digits = digits.slice(0, 1);
    }

    const formattedValue = formatScoreDigits(digits);
    const { team1Score: nextTeam1Score, team2Score: nextTeam2Score } =
      deriveScoresFromInput(formattedValue);

    setScoreInput(formattedValue);
    onScoresChange(game.gameId, nextTeam1Score, nextTeam2Score);
  };

  return (
    <BulkScoreContainer>
      {hasReportedScore ? (
        <StaticScoreContainer>
          <StaticScore>{game.team1.score}</StaticScore>
          <VsText>-</VsText>
          <StaticScore>{game.team2.score}</StaticScore>
        </StaticScoreContainer>
      ) : (
        <SingleScoreInput
          keyboardType="number-pad"
          placeholder="00-00"
          placeholderTextColor="#1d3a5f"
          value={scoreInput}
          onChangeText={handleScoreInputChange}
          maxLength={5}
        />
      )}
    </BulkScoreContainer>
  );
};

const BulkGameItem = ({
  game,
  tournamentType,
  onScoresChange,
}: BulkGameItemProps) => (
  <GameCard>
    <FixtureGameHeader game={game} />
    <GameContent>
      <FixtureTeamColumn
        team={game?.team1}
        position="left"
        tournamentType={tournamentType}
      />
      <BulkScoreDisplay game={game} onScoresChange={onScoresChange} />
      <FixtureTeamColumn
        team={game?.team2}
        position="right"
        tournamentType={tournamentType}
      />
    </GameContent>
  </GameCard>
);

// ── Post-submit stats: knockout takes delta + advance, round-robin replays ──

const applyKnockoutUpdates = async ({
  successfulGames,
  mergedFixtures,
  tournament,
  users,
  isDoubles,
  numberOfCourts,
}: {
  successfulGames: Game[];
  mergedFixtures: Fixtures[];
  tournament: Tournament;
  users: UserProfile[];
  isDoubles: boolean;
  numberOfCourts: number;
}) => {
  let updatedParticipants = tournament.tournamentParticipants;
  let updatedTeams = tournament.tournamentTeams ?? [];
  const usersToUpdate: UserProfile[] = [];

  for (const game of successfulGames) {
    const gamePlayerIds = getPlayerUserIds(game);
    const gameParticipants = updatedParticipants.filter((p) =>
      gamePlayerIds.includes(p.userId!),
    );
    const gameUsers = users.filter((u) => gamePlayerIds.includes(u.userId));

    const { playersToUpdate, usersToUpdate: gameUsersToUpdate } =
      calculatePlayerPerformance(game, gameParticipants, gameUsers);

    updatedParticipants = updatedParticipants.map(
      (p) => playersToUpdate.find((u) => u.userId === p.userId) ?? p,
    );

    if (gameUsersToUpdate?.length) usersToUpdate.push(...gameUsersToUpdate);

    if (isDoubles) {
      const [winnerTeam, loserTeam] = await calculateTeamPerformance({
        game,
        allTeams: updatedTeams,
      });
      updatedTeams = updatedTeams.map((team) => {
        if (team.teamKey === winnerTeam.teamKey) return winnerTeam;
        if (team.teamKey === loserTeam.teamKey) return loserTeam;
        return team;
      });
    }
  }

  return {
    updatedFixtures: advanceBrackets({
      fixtures: mergedFixtures,
      numberOfCourts,
    }),
    updatedParticipants,
    updatedTeams,
    usersToUpdate,
  };
};

const applyRoundRobinUpdates = async ({
  successfulGames,
  mergedFixtures,
  tournament,
  users,
  isDoubles,
}: {
  successfulGames: Game[];
  mergedFixtures: Fixtures[];
  tournament: Tournament;
  users: UserProfile[];
  isDoubles: boolean;
}) => {
  const orderedApprovedGames = getOrderedApprovedGames(mergedFixtures);

  const { updatedParticipants, updatedTeams } =
    await recalculateParticipantsFromFixtures(
      orderedApprovedGames,
      tournament.tournamentParticipants,
      tournament.tournamentTeams ?? [],
      isDoubles,
    );

  // ── Pre-existing bug fix: previous code only updated the LAST game's users.
  // Loop across all successful games so every player's profile gets its delta.
  const usersToUpdate: UserProfile[] = [];
  for (const game of successfulGames) {
    const gamePlayerIds = getPlayerUserIds(game);
    const gameParticipants = tournament.tournamentParticipants.filter((p) =>
      gamePlayerIds.includes(p.userId!),
    );
    const gameUsers = users.filter((u) => gamePlayerIds.includes(u.userId));

    const { usersToUpdate: gameUsersToUpdate } = calculatePlayerPerformance(
      game,
      gameParticipants,
      gameUsers,
    );
    if (gameUsersToUpdate?.length) usersToUpdate.push(...gameUsersToUpdate);
  }

  return {
    updatedFixtures: mergedFixtures,
    updatedParticipants,
    updatedTeams,
    usersToUpdate,
  };
};

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
  const { updateTournamentGame } = useContext(LeagueContext);

  const [loading, setLoading] = useState<boolean>(true);
  const [gamesWithScores, setGamesWithScores] = useState<GameWithScores[]>([]);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [liveTournament, setLiveTournament] =
    useState<Tournament>(tournamentById);

  const isKnockout = liveTournament.tournamentMode === "Knockout";

  useEffect(() => {
    const tournamentRef = doc(db, "tournaments", tournamentId);

    const unsubscribe = onSnapshot(tournamentRef, (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const data = snap.data() as Tournament;
      setLiveTournament(data);
      setLoading(false);

      setGamesWithScores((prev) => {
        const inputStateMap = new Map(
          prev.map((game) => [
            game.gameId,
            {
              inputTeam1Score: game.inputTeam1Score,
              inputTeam2Score: game.inputTeam2Score,
              hasScores: game.hasScores,
            },
          ]),
        );

        if (!data?.fixtures || data.fixtures.length === 0) {
          return prev;
        }

        const isKnockoutSnap = data.tournamentMode === "Knockout";

        return data.fixtures.flatMap((round) =>
          round.games
            // For knockout: hide shell games (null players). Users can only
            // publish games where both teams are populated.
            .filter((game) => !isKnockoutSnap || !isShellGame(game))
            .map((game) => {
              const isAlreadyReported =
                game.result && game.gamescore && game.gamescore !== "";

              if (isAlreadyReported) {
                return {
                  ...game,
                  round: round.round,
                  inputTeam1Score: "",
                  inputTeam2Score: "",
                  hasScores: false,
                };
              }

              const existingInput = inputStateMap.get(game.gameId);
              return {
                ...game,
                round: round.round,
                inputTeam1Score: existingInput?.inputTeam1Score ?? "",
                inputTeam2Score: existingInput?.inputTeam2Score ?? "",
                hasScores: existingInput?.hasScores ?? false,
              };
            }),
        );
      });
    });

    return unsubscribe;
  }, [tournamentId]);

  const handleClosePopup = (): void => {
    setShowPopup(false);
    setPopupMessage("");
  };

  const handleScoresChange = useCallback(
    (gameId: string, team1Score: string, team2Score: string): void => {
      setGamesWithScores((prev) =>
        prev.map((game) => {
          if (game.gameId !== gameId) return game;
          return {
            ...game,
            inputTeam1Score: team1Score,
            inputTeam2Score: team2Score,
            hasScores: team1Score.trim() !== "" && team2Score.trim() !== "",
          };
        }),
      );
    },
    [],
  );

  const gamesByRound: Record<number, GameWithScores[]> = gamesWithScores.reduce(
    (rounds, game) => {
      const roundNumber = game.round;
      if (!rounds[roundNumber]) rounds[roundNumber] = [];
      rounds[roundNumber].push(game);
      return rounds;
    },
    {} as Record<number, GameWithScores[]>,
  );

  const publishedGamesCount = gamesWithScores.filter(
    (game) => game.result && game.gamescore && game.gamescore !== "",
  ).length;

  const gamesReadyToSubmit: GameWithScores[] = gamesWithScores.filter(
    (game) =>
      game.hasScores &&
      !(game.result && game.gamescore && game.gamescore !== ""),
  );

  const totalCompletedCount = publishedGamesCount + gamesReadyToSubmit.length;

  const handleSubmitGames = useCallback(async (): Promise<void> => {
    if (gamesReadyToSubmit.length === 0) {
      Alert.alert(
        "No Scores",
        "Please add scores to at least one game before submitting.",
      );
      return;
    }

    // ── Validate scores ──
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

      const team1: GameTeam = { ...game.team1, score: score1 };
      const team2: GameTeam = { ...game.team2, score: score2 };

      const result = calculateWin(
        team1,
        team2,
        tournamentById.tournamentType as CompetitionTypes,
      ) as GameResult;

      validatedGames.push({
        ...game,
        gamescore: `${score1}-${score2}`,
        reportedAt: new Date(),
        reportedTime: moment().format("HH:mm"),
        team1,
        team2,
        result,
        numberOfApprovals: 0,
        numberOfDeclines: 0,
        approvalStatus: "approved",
        reporter: currentUser?.userId || "",
      });
    }

    if (invalidGames.length > 0) {
      Alert.alert(
        "Invalid Scores",
        `Please fix these games:\n\n${invalidGames.join("\n")}`,
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
              const failedGames: string[] = [];
              const successfulGames: Game[] = [];

              // ── Write individual games to Firestore ──
              for (const game of validatedGames) {
                try {
                  await updateTournamentGame({
                    tournamentId,
                    gameId: game.gameId,
                    updatedGame: game,
                    removeGame: false,
                  });
                  successfulGames.push(game);
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : "";
                  const alreadyReported =
                    errorMessage.includes("already been reported") ||
                    errorMessage.includes("already been processed");

                  console.error(
                    `❌ Failed to update Game ${game.gameNumber}:`,
                    error,
                  );
                  failedGames.push(
                    alreadyReported
                      ? `Game ${game.gameNumber}: already reported`
                      : `Game ${game.gameNumber}`,
                  );
                }
              }

              console.log(
                `Bulk update completed. Success: ${successfulGames.length}, Failed: ${failedGames.length}`,
              );

              // ── Recalculate stats from fresh state ──
              if (successfulGames.length > 0) {
                const tournamentRef = doc(db, "tournaments", tournamentId);
                const successfulGameIds = new Set(
                  successfulGames.map((g) => g.gameId),
                );

                const mergedFixtures = liveTournament.fixtures.map((round) => ({
                  ...round,
                  games: round.games.map((game) => {
                    if (successfulGameIds.has(game.gameId)) {
                      return (
                        successfulGames.find((g) => g.gameId === game.gameId) ??
                        game
                      );
                    }
                    return game;
                  }),
                }));

                const isDoubles = liveTournament.tournamentType === "Doubles";

                // ── Fetch users involved in successful games only ──
                const uniquePlayerIds = [
                  ...new Set(
                    successfulGames.flatMap((game) => getPlayerUserIds(game)),
                  ),
                ].filter((id): id is string => !!id);

                const fetchedUsers = await Promise.all(
                  uniquePlayerIds.map((id) => getUserById(id)),
                );
                const users = fetchedUsers.filter((u): u is UserProfile => !!u);

                const numberOfCourts = liveTournament.numberOfCourts || 1;

                const {
                  updatedFixtures,
                  updatedParticipants,
                  updatedTeams,
                  usersToUpdate,
                } = isKnockout
                  ? await applyKnockoutUpdates({
                      successfulGames,
                      mergedFixtures,
                      tournament: liveTournament,
                      users,
                      isDoubles,
                      numberOfCourts,
                    })
                  : await applyRoundRobinUpdates({
                      successfulGames,
                      mergedFixtures,
                      tournament: liveTournament,
                      users,
                      isDoubles,
                    });

                await updateDoc(tournamentRef, {
                  fixtures: updatedFixtures,
                  tournamentParticipants: updatedParticipants,
                  ...(isDoubles && { tournamentTeams: updatedTeams }),
                  gamesCompleted: increment(successfulGames.length),
                });

                await Promise.all(
                  usersToUpdate.map((user) =>
                    updateDoc(doc(db, "users", user.userId), {
                      profileDetail: user.profileDetail,
                    }),
                  ),
                );
              }

              // ── Feedback ──
              if (successfulGames.length === validatedGames.length) {
                handleShowPopup(
                  `Successfully submitted ${successfulGames.length} game result${
                    successfulGames.length > 1 ? "s" : ""
                  }!`,
                );
              } else if (successfulGames.length > 0) {
                Alert.alert(
                  "Partial Success",
                  `${successfulGames.length} game${
                    successfulGames.length > 1 ? "s" : ""
                  } submitted.\n\nFailed: ${failedGames.join(", ")}`,
                );
              } else {
                Alert.alert(
                  "Update Failed",
                  `Failed to submit any games.\n\nFailed: ${failedGames.join(", ")}`,
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
      ],
    );
  }, [
    gamesReadyToSubmit,
    tournamentById,
    tournamentId,
    currentUser,
    handleShowPopup,
    updateTournamentGame,
    liveTournament,
    isKnockout,
  ]);

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
      ],
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
        <HeaderTitle>
          {isKnockout ? "Bulk Publish Brackets" : "Bulk Publish Fixtures"}
        </HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <SubHeader>
        <SubHeaderText>
          Enter scores for games you want to publish{"\n"}({totalCompletedCount}
          /{gamesWithScores.length} completed)
        </SubHeaderText>
      </SubHeader>

      {loading ? (
        <LoadingContainer>
          <ActivityIndicator size="large" color="#00A2FF" />
          <LoadingText>Loading fixtures...</LoadingText>
        </LoadingContainer>
      ) : (
        <FixturesScrollContainer>
          {Object.keys(gamesByRound).length > 0 ? (
            Object.entries(gamesByRound).map(([roundNumber, games]) => (
              <FixtureRoundContainer key={roundNumber}>
                <FixtureRoundHeader roundNumber={parseInt(roundNumber)} />
                {games.map((game) => (
                  <BulkGameItem
                    key={game.gameId}
                    game={game}
                    tournamentType={
                      tournamentById.tournamentType as CompetitionTypes
                    }
                    onScoresChange={handleScoresChange}
                  />
                ))}
              </FixtureRoundContainer>
            ))
          ) : (
            <NoFixturesText>
              No Fixtures have been generated yet - You can create new fixtures
              in the fixtures screen.
            </NoFixturesText>
          )}
        </FixturesScrollContainer>
      )}

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

const Container = styled.View({
  flex: 1,
  backgroundColor: "#020D18",
  paddingTop: Platform.OS === "android" ? 25 : 0,
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

const SubHeader = styled.View({ marginBottom: 20 });

const SubHeaderText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  textAlign: "center",
});

const FixturesScrollContainer = styled.ScrollView({ flex: 1 });

const FixtureRoundContainer = styled.View({ marginBottom: 20 });

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

const SingleScoreInput = styled.TextInput({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 6,
  width: 90,
  height: 40,
  textAlign: "center",
  fontSize: 18,
  fontWeight: "bold",
  letterSpacing: 2,
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

const NoFixturesText = styled.Text({
  color: "red",
  fontStyle: "italic",
  fontSize: 15,
  textAlign: "center",
  marginTop: 150,
});

const LoadingContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: 12,
});

const LoadingText = styled.Text({
  color: "#ccc",
  fontSize: 14,
});

export default BulkFixturesPublisher;
