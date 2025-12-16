import React from "react";
import { ActivityIndicator } from "react-native";

import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";

import OptionSelector from "../../OptionSelector";

import { doublesModes } from "../../../schemas/schema";

const mixedDoublesOptions = ["Random", "Balanced"];

export const SetupScreen = ({
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
  participants,
}) => {
  const numberOfTeams = Math.floor(participants.length / 2);
  const numberOfPlayers = participants.length;
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
              options={doublesModes}
              errorText=""
            />
          </FormSection>

          <FormSection>
            <OptionSelector
              setValue={(name, value) => setMixedDoublesMode(value)}
              watch={() => mixedDoublesMode}
              name="mixedDoublesMode"
              label="Generation Method"
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
            disabled={numberOfCourts >= getMaxCourts()}
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

// Styled Components
const ModalTitle = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
  marginBottom: 20,
  textAlign: "center",
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

const CourtsContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
});

const CourtsButton = styled.TouchableOpacity(({ disabled }) => ({
  backgroundColor: disabled ? "#666" : "#00A2FF",
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
}));

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

const CancelText = styled.Text({
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
