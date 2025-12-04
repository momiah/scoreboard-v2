import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import OptionSelector from "../OptionSelector";
import ListDropdown from "../../components/ListDropdown/ListDropdown";
import { doublesVariants, fixturesSchema } from "../../schemas/schema";
import { TeamColumn } from "../scoreboard/ScoreboardAtoms";
import {
  generateSinglesRoundRobinFixtures,
  generateRoundRobinFixtures,
} from "../../helpers/Tournament/roundRobin";
import { generateMixedDoublesTeams } from "../../helpers/Tournament/teamGeneration";
import Tag from "../Tag";
import SelectPlayerModal from "./SelectPlayerModal";

const { width: screenWidth } = Dimensions.get("window");

// Team generation sub-options for Mixed Doubles
const mixedDoublesOptions = ["Random", "Balanced"];

// Mock data for participants
// Mock data for participants
const mockParticipants = [
  {
    userId: "1",
    firstName: "Yasin",
    lastName: "Miah",
    username: "yasinm",
    displayName: "Yasin M.",
    XP: 1200,
  },
  {
    userId: "2",
    firstName: "Mohsin",
    lastName: "Miah",
    username: "mohsinm",
    displayName: "Mohsin M.",
    XP: 950,
  },
  {
    userId: "3",
    firstName: "Rayyan",
    lastName: "Hoque",
    username: "rayyanh",
    displayName: "Rayyan H.",
    XP: 1500,
  },
  {
    userId: "4",
    firstName: "Saiful",
    lastName: "Hoque",
    username: "saifulh",
    displayName: "Saiful H.",
    XP: 800,
  },
  {
    userId: "5",
    firstName: "Raqeeb",
    lastName: "Hossain",
    username: "raqeebh",
    displayName: "Raqeeb H.",
    XP: 1100,
  },
  {
    userId: "6",
    firstName: "Saz",
    lastName: "Hoque",
    username: "sazh",
    displayName: "Saz H.",
    XP: 700,
  },
  {
    userId: "7",
    firstName: "Max",
    lastName: "Hoque",
    username: "maxh",
    displayName: "Max H.",
    XP: 1300,
  },
  {
    userId: "8",
    firstName: "Babu",
    lastName: "Miah",
    username: "babum",
    displayName: "Babu M.",
    XP: 875,
  },
];

// Setup Screen Component
const SetupScreen = ({
  tournamentType,
  selectedMode,
  setSelectedMode,
  mixedDoublesMode,
  setMixedDoublesMode,
  numberOfCourts,
  setNumberOfCourts,
  onCancel,
  onMixedDoublesGenerate,
  onFixedDoublesCreateTeams,
  onSinglesGenerate,
  isGenerating,
}) => {
  const numberOfTeams = Math.floor(mockParticipants.length / 2);
  const numberOfPlayers = mockParticipants.length;
  const participantsText =
    tournamentType === "Singles"
      ? `${numberOfPlayers} Players`
      : `${numberOfTeams} Teams`;

  const getMaxCourts = () => {
    const maxCourts =
      tournamentType === "Singles" ? numberOfPlayers / 2 : numberOfTeams / 2;
    return Math.floor(maxCourts) || 1; // Minimum 1 court
  };

  return (
    <>
      <ModalTitle>Setup Tournament</ModalTitle>

      {/* Mode Selection */}

      {tournamentType === "Doubles" && (
        <>
          <FormSection>
            <OptionSelector
              setValue={(name, value) => {
                setSelectedMode(value);
                setMixedDoublesMode("");
              }}
              watch={() => selectedMode}
              name="doublesMode"
              label="Mode"
              options={doublesVariants}
              errorText=""
            />
          </FormSection>

          <FormSection>
            <OptionSelector
              setValue={(name, value) => setMixedDoublesMode(value)}
              watch={() => mixedDoublesMode}
              name="mixedDoublesMode"
              label="Team Generation Mode"
              options={mixedDoublesOptions}
              errorText=""
              disabled={selectedMode !== "Mixed Doubles"}
            />
          </FormSection>
        </>
      )}

      {/* Number of Courts */}
      <FormSection>
        <SectionTitle>Number of Courts</SectionTitle>
        <CourtsContainer>
          <CourtsButton
            onPress={() => setNumberOfCourts(Math.max(1, numberOfCourts - 1))}
          >
            <AntDesign name="minus" size={20} color="#fff" />
          </CourtsButton>
          <CourtsDisplay>
            <CourtsText>{numberOfCourts}</CourtsText>
          </CourtsDisplay>
          <CourtsButton
            onPress={() =>
              setNumberOfCourts(Math.min(getMaxCourts(), numberOfCourts + 1))
            }
          >
            <AntDesign name="plus" size={20} color="#fff" />
          </CourtsButton>
        </CourtsContainer>
        <CourtLimitText>
          Max: {getMaxCourts()} courts ({participantsText})
        </CourtLimitText>
      </FormSection>

      <ButtonContainer>
        <CancelButton onPress={onCancel}>
          <CancelText>Cancel</CancelText>
        </CancelButton>

        {tournamentType === "Doubles" ? (
          <>
            {selectedMode === "Mixed Doubles" && (
              <GenerateButton
                disabled={
                  !(
                    selectedMode === "Mixed Doubles" &&
                    mixedDoublesMode &&
                    numberOfCourts >= 1
                  ) || isGenerating
                }
                onPress={onMixedDoublesGenerate}
              >
                {isGenerating ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <GenerateText>Generating...</GenerateText>
                  </>
                ) : (
                  <GenerateText>Generate Fixtures</GenerateText>
                )}
              </GenerateButton>
            )}

            {selectedMode === "Fixed Doubles" && (
              <CreateButton
                disabled={
                  !(selectedMode === "Fixed Doubles" && numberOfCourts >= 1)
                }
                onPress={onFixedDoublesCreateTeams}
              >
                <CreateText>Create Teams</CreateText>
              </CreateButton>
            )}
          </>
        ) : (
          <GenerateButton
            disabled={!numberOfCourts >= 1 || isGenerating}
            onPress={onSinglesGenerate}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <GenerateText>Generating...</GenerateText>
              </>
            ) : (
              <GenerateText>Generate Fixtures</GenerateText>
            )}
          </GenerateButton>
        )}
      </ButtonContainer>
    </>
  );
};

// Create Teams Screen Component
const CreateTeamsScreen = ({
  fixedDoublesTeams,
  numberOfCourts,
  onBack,
  onGenerateFixtures,
  onPlayerSelect,
  isGenerating,
}) => {
  const [playerModalVisible, setPlayerModalVisible] = useState(false);
  const [selectionContext, setSelectionContext] = useState({
    teamIndex: null,
    playerPosition: null,
  });

  const canGenerateFixtures = () => {
    const validTeams = fixedDoublesTeams.filter(
      (team) => team.player1 && team.player2
    );
    return validTeams.length > 0;
  };

  const openPlayerSelection = (teamIndex, playerPosition) => {
    setSelectionContext({ teamIndex, playerPosition });
    setPlayerModalVisible(true);
  };

  const closeDropdown = () => {
    setPlayerModalVisible(false);
    setSelectionContext({ teamIndex: null, playerPosition: null });
  };

  // Format players array for the modal
  const playerArray = mockParticipants.map((participant) => ({
    userId: participant.userId,
    firstName: participant.firstName,
    lastName: participant.lastName,
    username: participant.username,
    displayName:
      participant.displayName ||
      `${participant.firstName} ${participant.lastName?.charAt(0)}.`,
  }));

  // Create selectedPlayers structure that tracks all selected players
  const selectedPlayers = {
    team1: fixedDoublesTeams
      .flatMap((team) => [team.player1, team.player2])
      .filter(Boolean),
    team2: [], // Not used but required by SelectPlayerModal
  };

  // Get currently selected player for this specific position
  const getCurrentlySelected = () => {
    if (
      selectionContext.teamIndex === null ||
      selectionContext.playerPosition === null
    ) {
      return null;
    }

    const team = fixedDoublesTeams[selectionContext.teamIndex];
    return team?.[selectionContext.playerPosition] || null;
  };

  const handlePlayerSelection = (player) => {
    // If same player clicked, deselect them
    const currentlySelected = getCurrentlySelected();
    const isSame = currentlySelected?.userId === player.userId;
    const newPlayer = isSame ? null : player;

    onPlayerSelect(
      selectionContext.teamIndex,
      selectionContext.playerPosition,
      newPlayer?.userId || null
    );

    if (!isSame) {
      setPlayerModalVisible(false);
      setSelectionContext({ teamIndex: null, playerPosition: null });
    }
  };

  return (
    <>
      <ModalTitle>Create Fixed Doubles Teams</ModalTitle>

      <FormSection>
        <SectionTitle>Create Teams</SectionTitle>
        <FixedTeamsContainer>
          {fixedDoublesTeams.map((team, index) => (
            <TeamPairContainer key={team.teamId}>
              <TeamPairTitle>Team {index + 1}</TeamPairTitle>

              <PlayerSelectionRow
                onPress={() => openPlayerSelection(index, "player1")}
              >
                <PlayerSlotContent>
                  <PlayerSlotText>
                    {team.player1
                      ? team.player1.displayName ||
                        `${
                          team.player1.firstName
                        } ${team.player1.lastName?.charAt(0)}.`
                      : "Select Player 1"}
                  </PlayerSlotText>
                </PlayerSlotContent>
                <AntDesign name="plus" size={20} color="#00A2FF" />
              </PlayerSelectionRow>

              <PlayerSelectionRow
                onPress={() => openPlayerSelection(index, "player2")}
              >
                <PlayerSlotContent>
                  <PlayerSlotText>
                    {team.player2
                      ? team.player2.displayName ||
                        `${
                          team.player2.firstName
                        } ${team.player2.lastName?.charAt(0)}.`
                      : "Select Player 2"}
                  </PlayerSlotText>
                </PlayerSlotContent>
                <AntDesign name="plus" size={20} color="#00A2FF" />
              </PlayerSelectionRow>
            </TeamPairContainer>
          ))}
        </FixedTeamsContainer>
      </FormSection>

      <ButtonContainer>
        <BackButton onPress={onBack}>
          <BackText>Back</BackText>
        </BackButton>
        <GenerateButton
          disabled={!canGenerateFixtures() || isGenerating}
          onPress={onGenerateFixtures}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <GenerateText>Generating Fixtures...</GenerateText>
            </>
          ) : (
            <GenerateText>Generate Fixtures</GenerateText>
          )}
        </GenerateButton>
      </ButtonContainer>

      <SelectPlayerModal
        dropdownVisible={playerModalVisible}
        closeDropdown={closeDropdown}
        playerArray={playerArray}
        handleSelect={handlePlayerSelection}
        selectedPlayers={selectedPlayers}
        selected={getCurrentlySelected()}
      />
    </>
  );
};

export const PlayerSelectionModal = ({
  visible,
  onClose,
  onSelectPlayer,
  availablePlayers,
  title,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <ModalContainer>
        <SafeAreaWrapper>
          <ScrollContainer>
            <ModalTitle>{title || "Select Player"}</ModalTitle>

            <PlayersList>
              {availablePlayers.map((player) => (
                <PlayerRow
                  key={player.userId}
                  onPress={() => onSelectPlayer(player)}
                >
                  <PlayerInfo>
                    <PlayerName>
                      {player.displayName ||
                        `${player.firstName} ${player.lastName?.charAt(0)}.`}
                    </PlayerName>
                    <PlayerUsername>{player.username}</PlayerUsername>
                  </PlayerInfo>
                  <AntDesign name="check" size={20} color="#00A2FF" />
                </PlayerRow>
              ))}
            </PlayersList>

            <ButtonContainer>
              <CancelButton onPress={onClose}>
                <CancelText>Cancel</CancelText>
              </CancelButton>
            </ButtonContainer>
          </ScrollContainer>
        </SafeAreaWrapper>
      </ModalContainer>
    </Modal>
  );
};

const PlayersList = styled.View({
  marginBottom: 20,
});

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 16,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 8,
  marginBottom: 8,
});

const PlayerInfo = styled.View({
  flex: 1,
});

const PlayerName = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
});

const PlayerUsername = styled.Text({
  color: "#ccc",
  fontSize: 14,
  marginTop: 2,
});

const PlayerSelectionRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 12,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 6,
  marginBottom: 8,
});

const PlayerSlotContent = styled.View({
  flex: 1,
});

const PlayerSlotText = styled.Text({
  color: "#fff",
  fontSize: 14,
});

const GeneratedFixturesScreen = ({
  generatedFixtures,
  numberOfCourts,
  selectedMode,
  tournamentType,
  onBack,
  onGenerateTournament,
}) => (
  <>
    <ModalTitle>Generated Fixtures</ModalTitle>

    <FixturesContainer>
      {generatedFixtures?.fixtures?.map((round, roundIndex) => (
        <RoundContainer key={`round_${round.round}`}>
          <TitleContainer>
            <RoundTitle>ROUND {round.round}</RoundTitle>
          </TitleContainer>

          {round.games.map((game, gameIndex) => (
            <GameCard key={game.gameId}>
              <GameHeader>
                <Tag name={`Game ${gameIndex + 1}`} bold color="#00A2FF" />
                <Tag name={`Court ${game.court}`} bold />
              </GameHeader>

              <TeamVsContainer>
                <TeamColumn
                  team="left"
                  players={{
                    player1: game.team1.player1,
                    player2: game.team1.player2,
                  }}
                  leagueType={tournamentType}
                />

                <VsText>VS</VsText>

                <TeamColumn
                  team="right"
                  players={{
                    player1: game.team2.player1,
                    player2: game.team2.player2,
                  }}
                  leagueType={tournamentType}
                />
              </TeamVsContainer>
            </GameCard>
          ))}
        </RoundContainer>
      ))}
    </FixturesContainer>

    <ButtonContainer>
      <BackButton onPress={onBack}>
        <BackText>Back</BackText>
      </BackButton>
      <ConfirmButton onPress={onGenerateTournament}>
        <ConfirmText>Confirm</ConfirmText>
      </ConfirmButton>
    </ButtonContainer>
  </>
);

// Main Modal Component
const GenerateFixturesModal = ({
  modalVisible,
  setModalVisible,
  competition,
}) => {
  // State
  const [currentScreen, setCurrentScreen] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Team generation state
  const [selectedMode, setSelectedMode] = useState("");
  const [mixedDoublesMode, setMixedDoublesMode] = useState("");
  const [fixedDoublesTeams, setFixedDoublesTeams] = useState([]);
  const [numberOfCourts, setNumberOfCourts] = useState(1);

  // Fixtures state
  const [generatedFixtures, setGeneratedFixtures] = useState(null);

  // const tournamentType = "Singles";
  const tournamentType = competition?.tournamentType || "Doubles";

  useEffect(() => {
    let maxCourts;
    if (tournamentType === "Singles") {
      maxCourts = Math.floor(mockParticipants.length / 2) || 1;
    } else {
      maxCourts = Math.floor(Math.floor(mockParticipants.length / 2) / 2) || 1;
    }

    if (numberOfCourts > maxCourts) {
      setNumberOfCourts(maxCourts);
    }
  }, [numberOfCourts, tournamentType]);

  useEffect(() => {
    const numberOfTeams = Math.floor(mockParticipants.length / 2);
    const initialTeams = Array.from({ length: numberOfTeams }, (_, index) => ({
      teamId: `team_${index + 1}`,
      player1: null,
      player2: null,
    }));
    setFixedDoublesTeams(initialTeams);
  }, []);

  // Handle Singles generation
  const handleSinglesGeneration = async () => {
    setIsGenerating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fixtures = generateSinglesRoundRobinFixtures({
        players: mockParticipants,
        numberOfCourts,
      });

      if (fixtures) {
        setGeneratedFixtures(fixtures);
        setCurrentScreen(2);
        console.log(
          "Generated Singles fixtures:",
          JSON.stringify(fixtures, null, 2)
        );
      }
    } catch (error) {
      console.error("Error generating fixtures:", error);
      Alert.alert("Error", "Failed to generate fixtures");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Mixed Doubles generation
  const handleMixedDoublesGeneration = async () => {
    setIsGenerating(true);

    try {
      const teams = generateMixedDoublesTeams({
        mixedDoublesMode,
        participants: mockParticipants,
      });

      if (!teams || teams.length === 0) {
        Alert.alert("Error", "No teams generated");
        setIsGenerating(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fixtures = generateRoundRobinFixtures({ teams, numberOfCourts });

      if (fixtures) {
        setGeneratedFixtures(fixtures);

        setCurrentScreen(2);
        console.log(
          "Generated Mixed Doubles fixtures:",
          JSON.stringify(fixtures, null, 2)
        );
      }
    } catch (error) {
      console.error("Error generating fixtures:", error);
      Alert.alert("Error", "Failed to generate fixtures");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Fixed Doubles generation
  const handleFixedDoublesGeneration = async () => {
    setIsGenerating(true);

    try {
      const teams = fixedDoublesTeams.filter(
        (team) => team.player1 && team.player2
      );

      if (!teams.length) {
        Alert.alert("Error", "Please complete all team assignments");
        setIsGenerating(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fixtures = generateRoundRobinFixtures({ teams, numberOfCourts });

      if (fixtures) {
        setGeneratedFixtures(fixtures);
        setCurrentScreen(3);
        console.log("Generated Fixed Doubles fixtures:", fixtures);
      }
    } catch (error) {
      console.error("Error generating fixtures:", error);
      Alert.alert("Error", "Failed to generate fixtures");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle player selection for Fixed Doubles
  const handleFixedDoublesPlayerSelect = (
    teamIndex,
    playerPosition,
    playerId
  ) => {
    const player = mockParticipants.find((p) => p.userId === playerId);
    if (player) {
      setFixedDoublesTeams((prev) => {
        const updated = [...prev];
        updated[teamIndex] = {
          ...updated[teamIndex],
          [playerPosition]: player,
        };
        return updated;
      });
    }
  };

  // Handle generate tournament
  const handleGenerateTournament = () => {
    Alert.alert("Success", "Tournament generated successfully!", [
      { text: "OK", onPress: () => setModalVisible(false) },
    ]);
  };

  // Render current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 1:
        return (
          <SetupScreen
            tournamentType={tournamentType}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            mixedDoublesMode={mixedDoublesMode}
            setMixedDoublesMode={setMixedDoublesMode}
            numberOfCourts={numberOfCourts}
            onSinglesGenerate={handleSinglesGeneration}
            setNumberOfCourts={setNumberOfCourts}
            onCancel={() => setModalVisible(false)}
            onMixedDoublesGenerate={handleMixedDoublesGeneration}
            onFixedDoublesCreateTeams={() => setCurrentScreen(2)}
            isGenerating={isGenerating}
          />
        );
      case 2:
        // If we have generated fixtures, show them regardless of mode
        if (generatedFixtures) {
          return (
            <GeneratedFixturesScreen
              generatedFixtures={generatedFixtures}
              numberOfCourts={numberOfCourts}
              selectedMode={selectedMode}
              onBack={() => {
                if (selectedMode === "Fixed Doubles") {
                  setGeneratedFixtures(null); // Clear fixtures to show Create Teams
                  // Stay on case 2 - will now show CreateTeamsScreen
                } else {
                  setCurrentScreen(1); // Go back to Setup for Singles/Mixed Doubles
                  setGeneratedFixtures(null);
                }
              }}
              onGenerateTournament={handleGenerateTournament}
              tournamentType={tournamentType}
            />
          );
        }

        // Otherwise, show Create Teams (only for Fixed Doubles)
        return (
          <CreateTeamsScreen
            fixedDoublesTeams={fixedDoublesTeams}
            numberOfCourts={numberOfCourts}
            onBack={() => setCurrentScreen(1)}
            onGenerateFixtures={handleFixedDoublesGeneration}
            onPlayerSelect={handleFixedDoublesPlayerSelect}
            isGenerating={isGenerating}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <ModalContainer>
        <SafeAreaWrapper
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollContainer>{renderCurrentScreen()}</ScrollContainer>
        </SafeAreaWrapper>
      </ModalContainer>
    </Modal>
  );
};

// Styled Components
const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const SafeAreaWrapper = styled(KeyboardAvoidingView)({
  width: screenWidth - 40,
  maxHeight: "90%",
  margin: 20,
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: "rgba(2, 13, 24, 0.9)",
});

const ScrollContainer = styled.ScrollView({
  padding: "40px 20px",
});

const ModalTitle = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
  marginBottom: 20,
  textAlign: "center",
});

const InfoContainer = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  padding: 16,
  borderRadius: 8,
  marginBottom: 20,
});

const InfoText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  marginBottom: 4,
});

const FormSection = styled.View({
  marginBottom: 20,
});

const SectionTitle = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
  marginBottom: 12,
});

const FixedTeamsContainer = styled.View({
  gap: 16,
});

const TeamPairContainer = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  padding: 16,
  borderRadius: 8,
  gap: 8,
});

const TeamPairTitle = styled.Text({
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
  marginBottom: 8,
});

const DropdownContainer = styled.View({
  marginBottom: 4,
});

const CourtsContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
});

const CourtsButton = styled.TouchableOpacity({
  backgroundColor: "#00A2FF",
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
});

const CourtsDisplay = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
  minWidth: 60,
  alignItems: "center",
});

const CourtsText = styled.Text({
  color: "#fff",
  fontSize: 18,
  fontWeight: "600",
});

const CourtLimitText = styled.Text({
  color: "#ccc",
  fontSize: 12,
  textAlign: "center",
  marginTop: 8,
});

const FixturesContainer = styled.ScrollView({
  maxHeight: screenWidth <= 405 ? 400 : 600,
});

const RoundContainer = styled.View({
  marginBottom: 20,
});

const TitleContainer = styled.View({
  borderRadius: 5,
  paddingHorizontal: 16,
  backgroundColor: "#1d1d1dff",
  borderColor: "#444444ff",
  borderWidth: 1,
  marginBottom: 12,
  paddingVertical: 8,
});

const RoundTitle = styled.Text({
  color: "#fff",
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "start",
});

const GameCard = styled.View({
  backgroundColor: " rgb(3, 16, 31)",
  border: "1px solid rgb(9, 33, 62)",
  paddingHorizontal: 16,
  paddingTop: 12,
  borderRadius: 8,
  marginBottom: 10,
});

const GameHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
});

const TeamVsContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
});

const VsText = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "bold",
  marginHorizontal: 16,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 20,
  gap: 12,
});

const CancelButton = styled.TouchableOpacity({
  flex: 1,
  padding: 12,
  backgroundColor: "#666",
  borderRadius: 6,
  alignItems: "center",
});

const BackButton = styled.TouchableOpacity({
  flex: 1,
  padding: 12,
  backgroundColor: "#666",
  borderRadius: 6,
  alignItems: "center",
});

const GenerateButton = styled.TouchableOpacity(({ disabled }) => ({
  flex: 1,
  padding: 12,
  borderRadius: 6,
  alignItems: "center",
  backgroundColor: disabled ? "#9e9e9e" : "#28a745",
  opacity: disabled ? 0.6 : 1,
  flexDirection: "row",
  justifyContent: "center",
}));

const CreateButton = styled.TouchableOpacity(({ disabled }) => ({
  flex: 1,
  padding: 12,
  borderRadius: 6,
  alignItems: "center",
  backgroundColor: disabled ? "#9e9e9e" : "#00A2FF",
  opacity: disabled ? 0.6 : 1,
}));

const ConfirmButton = styled.TouchableOpacity({
  flex: 1,
  padding: 12,
  backgroundColor: "#00A2FF",
  borderRadius: 6,
  alignItems: "center",
});

const CancelText = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "500",
});

const BackText = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "500",
});

const GenerateText = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});

const CreateText = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});

const ConfirmText = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});

const styles = {
  playerDropbox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdown: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
    marginTop: 5,
  },
  dropdownText: {
    color: "#fff",
  },
};

export default GenerateFixturesModal;
