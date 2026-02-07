import React, { useState, useMemo, useCallback } from "react";
import { ActivityIndicator, Dimensions } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import SelectPlayerModal from "../../Modals/SelectPlayerModal";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import { Player, GameTeam } from "../../../types/game";

const { width: screenWidth } = Dimensions.get("window");

interface CreateTeamsScreenProps {
  fixedDoublesTeams: GameTeam[];
  onBack: () => void;
  onGenerateFixtures: () => void;
  isGenerating: boolean;
  setFixedDoublesTeams: React.Dispatch<React.SetStateAction<GameTeam[]>>;
  participants: Player[];
}

type PlayerPosition = "player1" | "player2";

export const CreateTeamsScreen = ({
  fixedDoublesTeams,
  onBack,
  onGenerateFixtures,
  isGenerating,
  setFixedDoublesTeams,
  participants,
}: CreateTeamsScreenProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTeamIndex, setActiveTeamIndex] = useState<number | null>(null);
  const [activePlayerPosition, setActivePlayerPosition] =
    useState<PlayerPosition | null>(null);

  const playerArray: Player[] = useMemo(
    () =>
      participants.map((participant: Player) => ({
        userId: participant.userId,
        firstName: participant.firstName,
        lastName: participant.lastName,
        username: participant.username,
        displayName: formatDisplayName(participant),
      })),
    [participants]
  );

  const selectedPlayers = useMemo(
    () => ({
      team1: fixedDoublesTeams
        .flatMap((team) => [team.player1, team.player2])
        .filter(Boolean),
      team2: [],
    }),
    [fixedDoublesTeams]
  );

  const canGenerate = useMemo(
    () => fixedDoublesTeams.every((team) => team.player1 && team.player2),
    [fixedDoublesTeams]
  );

  const currentlySelected = useMemo(() => {
    if (activeTeamIndex === null || activePlayerPosition === null) return null;
    return fixedDoublesTeams[activeTeamIndex]?.[activePlayerPosition] || null;
  }, [fixedDoublesTeams, activeTeamIndex, activePlayerPosition]);

  // Memoized callbacks
  const openPlayerSelection = useCallback(
    (teamIndex: number, playerPosition: PlayerPosition) => {
      setActiveTeamIndex(teamIndex);
      setActivePlayerPosition(playerPosition);
      setModalVisible(true);
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setActiveTeamIndex(null);
    setActivePlayerPosition(null);
  }, []);

  const handlePlayerSelect = useCallback(
    (player: Player) => {
      if (activeTeamIndex === null || activePlayerPosition === null) return;

      const isSame = currentlySelected?.userId === player.userId;
      const newPlayer = isSame ? null : player;

      setFixedDoublesTeams((prev) => {
        const updated = [...prev];
        updated[activeTeamIndex] = {
          ...updated[activeTeamIndex],
          [activePlayerPosition]: newPlayer,
        };
        return updated;
      });

      if (isSame) return;
      closeModal();
    },
    [
      currentlySelected,
      activeTeamIndex,
      activePlayerPosition,
      setFixedDoublesTeams,
      closeModal,
    ]
  );

  return (
    <>
      <ModalTitle>Create Fixed Doubles Teams</ModalTitle>

      <FormSection>
        <FixedTeamsContainer>
          {fixedDoublesTeams.map((team, index) => (
            <TeamPair
              key={index}
              team={team}
              index={index}
              onPlayerSelect={openPlayerSelection}
            />
          ))}
        </FixedTeamsContainer>
      </FormSection>

      <ButtonContainer>
        <BackButton onPress={onBack}>
          <BackText>Back</BackText>
        </BackButton>
        <GenerateButton
          disabled={!canGenerate || isGenerating}
          onPress={onGenerateFixtures}
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
      </ButtonContainer>

      <SelectPlayerModal
        dropdownVisible={modalVisible}
        closeDropdown={closeModal}
        playerArray={playerArray}
        handleSelect={handlePlayerSelect}
        selectedPlayers={selectedPlayers}
        selected={currentlySelected}
      />
    </>
  );
};

const TeamPair = ({
  team,
  index,
  onPlayerSelect,
}: {
  team: GameTeam;
  index: number;
  onPlayerSelect: (teamIndex: number, playerPosition: PlayerPosition) => void;
}) => (
  <TeamPairContainer>
    <TeamPairTitle>Team {index + 1}</TeamPairTitle>

    <PlayerSelectionRow onPress={() => onPlayerSelect(index, "player1")}>
      <PlayerSlotContent>
        <PlayerSlotText playerSelected={!!team.player1}>
          {team.player1 ? formatDisplayName(team.player1) : "Select Player 1"}
        </PlayerSlotText>
      </PlayerSlotContent>
      <AntDesign name="plus" size={20} color="#00A2FF" />
    </PlayerSelectionRow>

    <PlayerSelectionRow onPress={() => onPlayerSelect(index, "player2")}>
      <PlayerSlotContent>
        <PlayerSlotText playerSelected={!!team.player2}>
          {team.player2 ? formatDisplayName(team.player2) : "Select Player 2"}
        </PlayerSlotText>
      </PlayerSlotContent>
      <AntDesign name="plus" size={20} color="#00A2FF" />
    </PlayerSelectionRow>
  </TeamPairContainer>
);

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

const PlayerSlotText = styled.Text(
  ({ playerSelected }: { playerSelected: boolean }) => ({
    color: playerSelected ? "white" : "grey",
    fontSize: 14,
  })
);

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

const FixedTeamsContainer = styled.ScrollView({
  maxHeight: screenWidth <= 405 ? 400 : 600,
  gap: 20,
});

const TeamPairContainer = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  padding: 16,
  borderRadius: 8,
  gap: 8,
  marginBottom: 10,
});

const TeamPairTitle = styled.Text({
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
  marginBottom: 8,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 20,
  gap: 12,
});

const BackButton = styled.TouchableOpacity({
  flex: 1,
  padding: 12,
  backgroundColor: "#666",
  borderRadius: 6,
  alignItems: "center",
});

const GenerateButton = styled.TouchableOpacity(
  ({ disabled }: { disabled?: boolean }) => ({
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    backgroundColor: disabled ? "#9e9e9e" : "#28a745",
    opacity: disabled ? 0.6 : 1,
    flexDirection: "row",
    justifyContent: "center",
  })
);

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
