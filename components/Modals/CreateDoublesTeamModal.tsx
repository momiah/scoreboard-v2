import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign, Ionicons } from "@expo/vector-icons";

import type { TeamMember, TeamStats } from "@shared/types";
import { UserContext } from "../../context/UserContext";
import { LadderContext } from "../../context/LadderContext";
import { PopupContext } from "../../context/PopupContext";
import { formatDisplayName } from "../../helpers/formatDisplayName";

const screenWidth = Dimensions.get("window").width;

interface CreateDoublesTeamModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (team: TeamStats) => void;
}

const toMember = (user: {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}): TeamMember => ({
  userId: user.userId,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  displayName: formatDisplayName(user),
  profileImage: user.profileImage,
});

const CreateDoublesTeamModal: React.FC<CreateDoublesTeamModalProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const { currentUser, getAllUsersPaginated } = useContext(UserContext);
  const { createTeam } = useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<TeamMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [partner, setPartner] = useState<TeamMember | null>(null);
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runSearch = useCallback(
    async (value: string) => {
      const term = value.trim();
      if (!term) {
        setResults([]);
        setSearching(false);
        return;
      }
      try {
        const { users } = await getAllUsersPaginated(1, 20, term);
        const members = (users ?? [])
          .filter((user: { userId: string }) => user.userId !== currentUser?.userId)
          .map(toMember);
        setResults(members);
      } catch (error) {
        console.error("[CreateDoublesTeamModal] search failed:", error);
      } finally {
        setSearching(false);
      }
    },
    [getAllUsersPaginated, currentUser?.userId],
  );

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const term = value.trim();
    setSearching(!!term);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(value), 400);
  };

  const reset = () => {
    setSearchQuery("");
    setResults([]);
    setPartner(null);
    setTeamName("");
    setErrorMessage(null);
    setCreating(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectPartner = (member: TeamMember) => {
    setPartner(member);
    setSearchQuery("");
    setResults([]);
    setErrorMessage(null);
  };

  const handleCreate = async () => {
    if (creating) return;
    if (!currentUser?.userId) {
      setErrorMessage("You need to be signed in to create a team.");
      return;
    }
    if (!partner) {
      setErrorMessage("Pick a partner for your team.");
      return;
    }

    setCreating(true);
    setErrorMessage(null);
    try {
      const players: TeamMember[] = [toMember(currentUser), partner];
      const { success, alreadyExists, team } = await createTeam(
        players,
        currentUser.userId,
        teamName,
      );
      if (success && team) {
        showBottomToast("Team created", "success");
        onCreated?.(team);
        handleClose();
      } else if (alreadyExists) {
        setErrorMessage("You already have a team with this player.");
      } else {
        setErrorMessage("Couldn't create the team. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Container>
        <Content testID="create-doubles-team-modal">
          <CloseButton onPress={handleClose} testID="create-team-close">
            <AntDesign name="close-circle" size={30} color="red" />
          </CloseButton>

          <Title>Create a Team</Title>

          <MemberRow>
            <MemberAvatarFallback>
              <Ionicons name="person" size={18} color="#9fb8c8" />
            </MemberAvatarFallback>
            <MemberInfo>
              <MemberName numberOfLines={1}>
                {currentUser ? formatDisplayName(currentUser) : "You"}
              </MemberName>
              <MemberTag>You</MemberTag>
            </MemberInfo>
          </MemberRow>

          {partner ? (
            <MemberRow>
              <MemberAvatarFallback>
                <Ionicons name="person" size={18} color="#9fb8c8" />
              </MemberAvatarFallback>
              <MemberInfo>
                <MemberName numberOfLines={1}>
                  {partner.displayName || partner.username}
                </MemberName>
                <MemberTag>Partner</MemberTag>
              </MemberInfo>
              <RemoveButton
                onPress={() => setPartner(null)}
                testID="create-team-remove-partner"
              >
                <Ionicons name="close" size={18} color="#f87171" />
              </RemoveButton>
            </MemberRow>
          ) : (
            <>
              <SearchInput
                placeholder="Search for a partner…"
                placeholderTextColor="#7f97a8"
                value={searchQuery}
                onChangeText={handleSearch}
                autoCorrect={false}
                autoCapitalize="none"
                testID="create-team-search"
              />
              {searching ? (
                <ActivityIndicator size="small" color="#00A2FF" />
              ) : (
                results.length > 0 && (
                  <ResultsList>
                    <FlatList
                      data={results}
                      keyExtractor={(item) => item.userId}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <ResultRow
                          onPress={() => handleSelectPartner(item)}
                          testID={`create-team-result-${item.userId}`}
                        >
                          <ResultName numberOfLines={1}>
                            {item.displayName || item.username}
                          </ResultName>
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color="#00A2FF"
                          />
                        </ResultRow>
                      )}
                    />
                  </ResultsList>
                )
              )}
            </>
          )}

          <FieldLabel>Team name (optional)</FieldLabel>
          <NameInput
            placeholder="e.g. Smash Bros"
            placeholderTextColor="#7f97a8"
            value={teamName}
            onChangeText={setTeamName}
            maxLength={40}
            testID="create-team-name"
          />

          {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

          <ActionButton
            activeOpacity={0.85}
            disabled={!partner || creating}
            isDisabled={!partner || creating}
            onPress={handleCreate}
            testID="create-team-confirm"
          >
            <ActionButtonText>
              {creating ? "Creating…" : "Create Team"}
            </ActionButtonText>
          </ActionButton>
        </Content>
      </Container>
    </Modal>
  );
};

export default CreateDoublesTeamModal;

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

const MemberRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "#152534",
});

const MemberAvatarFallback = styled.View({
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: "#1e2b3d",
  justifyContent: "center",
  alignItems: "center",
});

const MemberInfo = styled.View({
  flex: 1,
});

const MemberName = styled.Text({
  color: "#e2e8f0",
  fontSize: 15,
  fontWeight: "600",
});

const MemberTag = styled.Text({
  color: "#7f97a8",
  fontSize: 11,
});

const RemoveButton = styled.TouchableOpacity({
  padding: 4,
});

const SearchInput = styled.TextInput({
  borderWidth: 1,
  borderColor: "rgb(15, 53, 99)",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: "white",
  fontSize: 14,
});

const ResultsList = styled.View({
  maxHeight: 180,
  borderRadius: 10,
  backgroundColor: "#0b1c2f",
});

const ResultRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255,255,255,0.06)",
});

const ResultName = styled.Text({
  color: "#e2e8f0",
  fontSize: 14,
  flex: 1,
  paddingRight: 10,
});

const FieldLabel = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  marginTop: 4,
});

const NameInput = styled.TextInput({
  borderWidth: 1,
  borderColor: "rgb(15, 53, 99)",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: "white",
  fontSize: 14,
});

const ErrorText = styled.Text({
  color: "#f87171",
  fontSize: 13,
});

const ActionButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
    marginTop: 4,
  }),
);

const ActionButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
