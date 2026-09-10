import React, { useCallback, useContext, useEffect, useState } from "react";
import { Modal, Dimensions, FlatList, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign, Ionicons } from "@expo/vector-icons";

import type { TeamStats } from "@shared/types";
import { UserContext } from "../../context/UserContext";
import { LadderContext } from "../../context/LadderContext";
import CreateDoublesTeamModal from "./CreateDoublesTeamModal";

const screenWidth = Dimensions.get("window").width;

interface TeamSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (team: TeamStats) => void;
}

const teamLabel = (team: TeamStats): string =>
  team.teamName?.trim() || (team.team ?? []).join(" & ");

const TeamSelectorModal: React.FC<TeamSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { currentUser } = useContext(UserContext);
  const { fetchUserTeams } = useContext(LadderContext);

  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!currentUser?.userId) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTeams(await fetchUserTeams(currentUser.userId));
    } catch (error) {
      console.error("[TeamSelectorModal] Failed to load teams:", error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.userId, fetchUserTeams]);

  useEffect(() => {
    if (visible) loadTeams();
  }, [visible, loadTeams]);

  const handleCreated = (team: TeamStats) => {
    setCreateVisible(false);
    onSelect(team);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Container>
        <Content testID="team-selector-modal">
          <CloseButton onPress={onClose} testID="team-selector-close">
            <AntDesign name="close-circle" size={30} color="red" />
          </CloseButton>

          <Title>Select a Team</Title>

          {loading ? (
            <LoadingWrap>
              <ActivityIndicator size="small" color="#00A2FF" />
            </LoadingWrap>
          ) : teams.length === 0 ? (
            <EmptyText>
              You don&apos;t have any teams yet. Create one to get started.
            </EmptyText>
          ) : (
            <TeamList>
              <FlatList
                data={teams}
                keyExtractor={(item) => item.teamKey}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TeamRow
                    onPress={() => onSelect(item)}
                    testID={`team-selector-row-${item.teamKey}`}
                  >
                    <TeamIcon>
                      <Ionicons name="people" size={18} color="#00A2FF" />
                    </TeamIcon>
                    <TeamInfo>
                      <TeamName numberOfLines={1}>{teamLabel(item)}</TeamName>
                      <TeamMembers numberOfLines={1}>
                        {(item.team ?? []).join(" • ")}
                      </TeamMembers>
                    </TeamInfo>
                    <Ionicons name="chevron-forward" size={18} color="#555" />
                  </TeamRow>
                )}
              />
            </TeamList>
          )}

          <CreateButton
            onPress={() => setCreateVisible(true)}
            activeOpacity={0.85}
            testID="team-selector-create"
          >
            <Ionicons name="add" size={18} color="#00A2FF" />
            <CreateButtonText>Create new team</CreateButtonText>
          </CreateButton>
        </Content>
      </Container>

      <CreateDoublesTeamModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={handleCreated}
      />
    </Modal>
  );
};

export default TeamSelectorModal;

const Container = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const Content = styled.View({
  width: screenWidth - 40,
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderRadius: 16,
  padding: 24,
  gap: 14,
});

const CloseButton = styled.TouchableOpacity({
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 10,
  padding: 2,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 22,
  fontWeight: "bold",
  paddingRight: 30,
});

const LoadingWrap = styled.View({
  paddingVertical: 24,
});

const EmptyText = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  textAlign: "center",
  paddingVertical: 16,
});

const TeamList = styled.View({
  maxHeight: 260,
});

const TeamRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "#152534",
  marginBottom: 8,
});

const TeamIcon = styled.View({
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  justifyContent: "center",
  alignItems: "center",
});

const TeamInfo = styled.View({
  flex: 1,
});

const TeamName = styled.Text({
  color: "#e2e8f0",
  fontSize: 15,
  fontWeight: "600",
});

const TeamMembers = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
  marginTop: 2,
});

const CreateButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#00A2FF",
});

const CreateButtonText = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "bold",
});
