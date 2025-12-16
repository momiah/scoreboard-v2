import React, { useState, useEffect } from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";

import {
  generateSinglesRoundRobinFixtures,
  generateRoundRobinFixtures,
} from "../../helpers/Tournament/roundRobin";
import { generateMixedDoublesTeams } from "../../helpers/Tournament/teamGeneration";

import { SetupScreen } from "../Tournaments/FixturesGeneration/SetupScreen";
import { CreateTeamsScreen } from "../Tournaments/FixturesGeneration/CreateTeamsScreen";
import { GeneratedFixturesScreen } from "../Tournaments/FixturesGeneration/GeneratedFixturesScreen";

const { width: screenWidth } = Dimensions.get("window");

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

// Main Modal Component
const GenerateFixturesModal = ({
  modalVisible,
  setModalVisible,
  competition,
}) => {
  // State
  const SET_UP_SCREEN = 1;
  const GENERATED_FIXTURES_SCREEN = 2;

  const [currentScreen, setCurrentScreen] = useState(SET_UP_SCREEN);
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
        setCurrentScreen(GENERATED_FIXTURES_SCREEN);
      }
    } catch (error) {
      console.error("Error generating fixtures:", error);
      Alert.alert("Error", "Failed to generate fixtures");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDoublesGeneration = async (variant) => {
    setIsGenerating(true);

    try {
      let teams;

      if (variant === "Mixed Doubles") {
        teams = generateMixedDoublesTeams({
          mixedDoublesMode,
          participants: mockParticipants,
        });
      } else if (variant === "Fixed Doubles") {
        teams = fixedDoublesTeams.filter(
          (team) => team.player1 && team.player2
        );
      }

      if (!teams?.length) {
        Alert.alert(
          "Error",
          variant === "Fixed Doubles"
            ? "Please complete all team assignments"
            : "No teams generated"
        );
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fixtures = generateRoundRobinFixtures({ teams, numberOfCourts });

      if (fixtures) {
        setGeneratedFixtures(fixtures);
        setCurrentScreen(GENERATED_FIXTURES_SCREEN);
      }
    } catch (error) {
      console.error("Error generating fixtures:", error);
      Alert.alert("Error", "Failed to generate fixtures");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMixedDoublesGeneration = () =>
    handleDoublesGeneration("Mixed Doubles");
  const handleFixedDoublesGeneration = () =>
    handleDoublesGeneration("Fixed Doubles");

  const handleGenerateTournament = () => {
    Alert.alert("Success", "Tournament generated successfully!", [
      { text: "OK", onPress: () => setModalVisible(false) },
    ]);
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case SET_UP_SCREEN:
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
            onFixedDoublesCreateTeams={() =>
              setCurrentScreen(GENERATED_FIXTURES_SCREEN)
            }
            isGenerating={isGenerating}
            participants={mockParticipants}
          />
        );
      case GENERATED_FIXTURES_SCREEN:
        if (generatedFixtures) {
          return (
            <GeneratedFixturesScreen
              generatedFixtures={generatedFixtures}
              numberOfCourts={numberOfCourts}
              selectedMode={selectedMode}
              onBack={() => {
                if (selectedMode === "Fixed Doubles") {
                  setGeneratedFixtures(null);
                } else {
                  setCurrentScreen(SET_UP_SCREEN);
                  setGeneratedFixtures(null);
                }
              }}
              onGenerateTournament={handleGenerateTournament}
              tournamentType={tournamentType}
            />
          );
        }
        return (
          <CreateTeamsScreen
            fixedDoublesTeams={fixedDoublesTeams}
            numberOfCourts={numberOfCourts}
            onBack={() => setCurrentScreen(SET_UP_SCREEN)}
            onGenerateFixtures={handleFixedDoublesGeneration}
            isGenerating={isGenerating}
            setFixedDoublesTeams={setFixedDoublesTeams}
            participants={mockParticipants}
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

const ScrollContainer = styled.View({
  padding: "40px 20px",
});

export default GenerateFixturesModal;
