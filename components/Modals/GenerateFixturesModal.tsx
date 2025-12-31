import React, { useState, useEffect, useContext } from "react";
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
import { LeagueContext } from "../../context/LeagueContext";
import { Fixtures, GameTeam, TournamentMode } from "../../types/game";
import { UserProfile } from "../../types/player";

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
  // {
  //   userId: "9",
  //   firstName: "Alice",
  //   lastName: "Wonderland",
  //   username: "alicew",
  //   displayName: "Alice W.",
  //   XP: 950,
  // },
  // {
  //   userId: "10",
  //   firstName: "Bob",
  //   lastName: "Builder",
  //   username: "bobb",
  //   displayName: "Bob B.",
  //   XP: 800,
  // },
];

// Types
interface GenerateFixturesModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  competition: {
    tournamentType?: string;
    tournamentId?: string;
  } | null;
  currentUser: UserProfile | null;
  setGeneratedFixtures: (fixtures: Fixtures[] | null) => void;
  generatedFixtures: Fixtures[] | null;
}

// Main Modal Component
const GenerateFixturesModal = ({
  modalVisible,
  setModalVisible,
  competition,
  currentUser,
  setGeneratedFixtures,
  generatedFixtures,
}: GenerateFixturesModalProps) => {
  // State
  const SET_UP_SCREEN = 1;
  const GENERATED_FIXTURES_SCREEN = 2;

  const [currentScreen, setCurrentScreen] = useState(SET_UP_SCREEN);
  const [isGenerating, setIsGenerating] = useState(false);

  // Team generation state
  const [selectedMode, setSelectedMode] = useState("");
  const [generationType, setGenerationType] = useState("");
  const [fixedDoublesTeams, setFixedDoublesTeams] = useState<GameTeam[]>([]);
  const [numberOfCourts, setNumberOfCourts] = useState(1);
  const { addTournamentFixtures } = useContext(LeagueContext);

  const tournamentType = competition?.tournamentType || "Doubles";
  // const tournamentType = "Singles";
  const competitionId = competition?.tournamentId;

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
    const initialTeams: GameTeam[] = Array.from(
      { length: numberOfTeams },
      () => ({
        player1: null,
        player2: null,
      })
    );
    setFixedDoublesTeams(initialTeams);
  }, []);

  const handleSinglesGeneration = async () => {
    setIsGenerating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fixtures = generateSinglesRoundRobinFixtures({
        players: mockParticipants,
        numberOfCourts,
        competitionId: competitionId ?? "",
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

  const handleDoublesGeneration = async (mode: TournamentMode) => {
    setIsGenerating(true);

    try {
      let teams: GameTeam[] | undefined;

      if (mode === "Mixed Doubles") {
        teams = generateMixedDoublesTeams({
          generationType: generationType,
          participants: mockParticipants,
        });
      } else if (mode === "Fixed Doubles") {
        teams = fixedDoublesTeams.filter(
          (team) => team.player1 && team.player2
        );
      }

      if (!teams?.length) {
        Alert.alert(
          "Error",
          mode === "Fixed Doubles"
            ? "Please complete all team assignments"
            : "No teams generated"
        );
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fixtures = generateRoundRobinFixtures({
        teams,
        numberOfCourts,
        competitionId: competitionId ?? "",
      });

      console.log(
        "Generated Doubles Fixtures:",
        JSON.stringify(fixtures, null, 2)
      );

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

  const handleGenerateTournament = async () => {
    try {
      if (!generatedFixtures) {
        Alert.alert("Error", "No fixtures to save");
        return;
      }

      // Show loading state
      setIsGenerating(true);

      // Write to database
      await addTournamentFixtures({
        tournamentId: competitionId,
        fixtures: generatedFixtures,
        numberOfCourts,
        currentUser: currentUser,
        mode: tournamentType === "Doubles" ? selectedMode : "",
        generationType: tournamentType === "Doubles" ? generationType : "",
      });

      Alert.alert("Success", "Tournament fixtures saved successfully!", [
        { text: "OK", onPress: () => setModalVisible(false) },
      ]);
    } catch (error) {
      // Error handling
      Alert.alert(
        "Error",
        "Failed to save tournament fixtures. Please try again.",
        [{ text: "OK" }]
      );
      console.error("Error saving tournament fixtures:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case SET_UP_SCREEN:
        return (
          <SetupScreen
            tournamentType={tournamentType}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            generationType={generationType}
            setGenerationType={setGenerationType}
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
              tournamentType={tournamentType}
              onBack={() => {
                if (selectedMode === "Fixed Doubles") {
                  setGeneratedFixtures(null);
                } else {
                  setCurrentScreen(SET_UP_SCREEN);
                  setGeneratedFixtures(null);
                }
              }}
              onGenerateTournament={handleGenerateTournament}
              isGenerating={isGenerating}
            />
          );
        }
        return (
          <CreateTeamsScreen
            fixedDoublesTeams={fixedDoublesTeams}
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
