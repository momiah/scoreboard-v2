import React, { useContext, useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Share,
  ScrollView,
  FlatList,
  SafeAreaView,
} from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../services/firebase.config";
import { COLLECTION_NAMES } from "@shared";
import { collection, query, getDocs } from "firebase/firestore";
import { UserContext } from "../../context/UserContext";
import { LeagueContext } from "../../context/LeagueContext";
import { PopupContext } from "../../context/PopupContext";
import { notificationSchema, notificationTypes } from "@shared";
import Popup from "../popup/Popup";
import Tag from "../Tag";
import RecentPlayersModal from "./RecentPlayersModal";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import type { Club, UserProfile } from "@shared/types";

interface InviteClubMembersModalProps {
  visible: boolean;
  onClose: () => void;
  club: Club;
}

const InviteClubMembersModal: React.FC<InviteClubMembersModalProps> = ({
  visible,
  onClose,
  club,
}) => {
  const [searchUser, setSearchUser] = useState("");
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [inviteUsers, setInviteUsers] = useState<UserProfile[]>([]);
  const [validationError, setValidationError] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "recent">("search");
  const [recentPlayersVisible, setRecentPlayersVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());

  const { sendNotification } = useContext(UserContext);
  const { updatePendingInvites } = useContext(LeagueContext);
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);

  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => {
      if (id) setCurrentUserId(id);
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      setSearchUser("");
      setSuggestions([]);
      setInviteUsers([]);
      setValidationError("");
      setActiveTab("search");
      setParticipantIds(new Set());
      return;
    }

    const loadParticipants = async () => {
      try {
        const snap = await getDocs(
          collection(
            db,
            COLLECTION_NAMES.clubs,
            club.clubId,
            "participants",
          ),
        );
        setParticipantIds(new Set(snap.docs.map((d) => d.id)));
      } catch (e) {
        console.error("Error loading club participants:", e);
      }
    };
    loadParticipants();
  }, [visible, club.clubId]);

  const hasConflict = useCallback(
    (userId: string) => {
      const isParticipant = participantIds.has(userId);
      const isPendingInvite = (club.pendingInvites ?? []).some(
        (u) => u.userId === userId,
      );
      const isPendingRequest = (club.pendingRequests ?? []).some(
        (u) => u.userId === userId,
      );
      return isParticipant || isPendingInvite || isPendingRequest;
    },
    [participantIds, club.pendingInvites, club.pendingRequests],
  );

  const conflictedUsers = inviteUsers.filter((u) => hasConflict(u.userId));
  const hasConflicts = conflictedUsers.length > 0;

  const getBlockingError = (): string => {
    if (hasConflicts) {
      return `Cannot invite: ${conflictedUsers
        .map((u) => formatDisplayName(u))
        .join(", ")}. Remove them to continue.`;
    }
    return "";
  };

  const blockingError = getBlockingError();
  const displayError = blockingError || validationError;
  const isInviteDisabled =
    sendingInvite || inviteUsers.length === 0 || !!blockingError;

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");
    onClose();
  };

  const handleSendInvite = async () => {
    setSendingInvite(true);
    setValidationError("");

    try {
      if (inviteUsers.length === 0) {
        setValidationError("Please select at least one player to invite");
        setSendingInvite(false);
        return;
      }

      for (const user of inviteUsers) {
        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: user.userId,
          senderId: currentUserId,
          message: `You've been invited to join ${club.clubName}`,
          type: notificationTypes.ACTION.INVITE.CLUB,
          data: {
            clubId: club.clubId,
          },
        };

        await sendNotification(payload);
        await updatePendingInvites(club.clubId, user.userId, "clubs");
      }

      handleShowPopup("Members invited successfully!");
      setInviteUsers([]);
      setSearchUser("");
      setSuggestions([]);
    } catch (error) {
      setValidationError("Failed to send invites. Please try again.");
      console.error("Error sending club invites:", error);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchUser(value);

    if (value.trim().length > 0) {
      try {
        if (!currentUserId) return;

        const searchTerm = value.toLowerCase().trim();
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(
          (doc) => doc.data() as UserProfile,
        );

        const filteredUsers = users.filter((user) => {
          const firstName = user.firstName?.toLowerCase() || "";
          const lastName = user.lastName?.toLowerCase() || "";
          const fullName = `${firstName} ${lastName}`;

          const matchesSearch =
            firstName.startsWith(searchTerm) ||
            lastName.startsWith(searchTerm) ||
            fullName.startsWith(searchTerm);

          const isCurrentUser = user.userId === currentUserId;
          const alreadySelected = inviteUsers.some(
            (u) => u.userId === user.userId,
          );

          return matchesSearch && !isCurrentUser && !alreadySelected;
        });

        setSuggestions(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectUser = (user: UserProfile) => {
    setInviteUsers((prev) => [...prev, user]);
    setSearchUser("");
    setSuggestions([]);
    setValidationError("");
  };

  const handleRemoveUser = (userId: string) => {
    setInviteUsers((prev) => prev.filter((u) => u.userId !== userId));
    setValidationError("");
  };

  const handleAddFromRecent = (players: UserProfile[]) => {
    setInviteUsers(players);
  };

  const handleShare = async () => {
    const url = `https://courtchamps.com/join/club/${club.clubId}`;
    try {
      await Share.share({
        message: `Join my club on Court Champs! 🏸\n\n${url}`,
        url,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <Container>
        <Popup
          visible={showPopup}
          message={popupMessage}
          onClose={handleClosePopup}
          type="success"
          height={450}
        />

        <RecentPlayersModal
          visible={recentPlayersVisible}
          onClose={() => {
            setRecentPlayersVisible(false);
            setActiveTab("search");
          }}
          onAddPlayers={handleAddFromRecent}
          currentUserId={currentUserId}
          alreadySelected={inviteUsers}
        />

        <Header>
          <TouchableOpacity onPress={onClose}>
            <AntDesign name="arrowleft" size={24} color="white" />
          </TouchableOpacity>
        </Header>

        <FixedSection>
          <ClubDetailsContainer>
            <ClubName>{club.clubName}</ClubName>
            {club.clubLocation ? (
              <ClubLocation>{club.clubLocation}</ClubLocation>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                gap: 5,
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <Tag name="Club" color="#FAB234" bold />
              <ShareButton onPress={handleShare}>
                <AntDesign name="sharealt" size={13} color="#00A2FF" />
                <ShareButtonText>Share Club</ShareButtonText>
              </ShareButton>
            </View>
          </ClubDetailsContainer>

          <TabRow>
            <Tab
              active={activeTab === "search"}
              onPress={() => setActiveTab("search")}
            >
              <TabText active={activeTab === "search"}>Search</TabText>
            </Tab>
            <Tab
              active={activeTab === "recent"}
              onPress={() => {
                setActiveTab("recent");
                setRecentPlayersVisible(true);
              }}
            >
              <TabText active={activeTab === "recent"}>Recent Players</TabText>
            </Tab>
          </TabRow>

          {activeTab === "search" && (
            <Input
              placeholder="Start typing to search players"
              placeholderTextColor="#999"
              value={searchUser}
              onChangeText={handleSearch}
            />
          )}
        </FixedSection>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
          >
            {activeTab === "search" && suggestions.length > 0 && (
              <DropdownContainer>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.userId}
                  scrollEnabled={false}
                  renderItem={({ item }) => {
                    const isAlreadySelected = inviteUsers.some(
                      (u) => u.userId === item.userId,
                    );
                    return (
                      <DropdownItem
                        onPress={() =>
                          !isAlreadySelected && handleSelectUser(item)
                        }
                        disabled={isAlreadySelected}
                        style={{
                          backgroundColor: isAlreadySelected
                            ? "#444"
                            : "rgb(5, 34, 64)",
                          opacity: isAlreadySelected ? 0.6 : 1,
                        }}
                      >
                        <DropdownText>
                          {formatDisplayName(item)}
                          {isAlreadySelected && " (selected)"}
                        </DropdownText>
                        <DropdownText
                          style={{ color: "#aaa", fontStyle: "italic" }}
                        >
                          @ {item.username}
                        </DropdownText>
                      </DropdownItem>
                    );
                  }}
                />
              </DropdownContainer>
            )}

            {inviteUsers.length > 0 && (
              <SelectedSection>
                <SelectedLabel>Selected ({inviteUsers.length})</SelectedLabel>
                <SelectedTagsRow>
                  {inviteUsers.map((user) => {
                    const conflict = hasConflict(user.userId);
                    return (
                      <PlayerTag key={user.userId} hasConflict={conflict}>
                        <PlayerTagName hasConflict={conflict}>
                          {formatDisplayName(user)}
                        </PlayerTagName>
                        <TouchableOpacity
                          onPress={() => handleRemoveUser(user.userId)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <AntDesign
                            name="close"
                            size={11}
                            color={conflict ? "red" : "#aaa"}
                          />
                        </TouchableOpacity>
                      </PlayerTag>
                    );
                  })}
                </SelectedTagsRow>
              </SelectedSection>
            )}

            {displayError ? <ErrorText>{displayError}</ErrorText> : null}
          </ScrollView>
        </TouchableWithoutFeedback>

        <BottomBar>
          <InviteButton
            onPress={handleSendInvite}
            disabled={isInviteDisabled}
            style={{ opacity: isInviteDisabled ? 0.6 : 1 }}
          >
            {sendingInvite ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <InviteButtonText>
                Invite ({inviteUsers.length})
              </InviteButtonText>
            )}
          </InviteButton>
        </BottomBar>
      </Container>
    </Modal>
  );
};

const Container = styled(SafeAreaView)({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 20,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255,255,255,0.08)",
});

const FixedSection = styled.View({
  paddingHorizontal: 20,
  paddingTop: 10,
});

const ClubDetailsContainer = styled.View({
  paddingVertical: 20,
  width: "100%",
});

const ClubName = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
  marginBottom: 6,
});

const ClubLocation = styled.Text({
  fontSize: 13,
  color: "#888",
  marginBottom: 4,
});

const Input = styled.TextInput({
  width: "100%",
  padding: 12,
  marginBottom: 12,
  backgroundColor: "#141d2b",
  color: "#fff",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  fontSize: 15,
});

const DropdownContainer = styled.View({
  backgroundColor: "rgb(4, 26, 49)",
  borderRadius: 8,
  padding: 8,
  marginBottom: 12,
  width: "100%",
});

const DropdownItem = styled.TouchableOpacity({
  backgroundColor: "rgb(5, 34, 64)",
  borderRadius: 6,
  padding: 12,
  marginVertical: 4,
  justifyContent: "space-between",
  flexDirection: "row",
});

const DropdownText = styled.Text({
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "500",
});

const SelectedSection = styled.View({
  marginTop: 16,
  marginBottom: 12,
});

const SelectedLabel = styled.Text({
  color: "#aaa",
  fontSize: 12,
  marginBottom: 10,
});

const SelectedTagsRow = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
});

const PlayerTag = styled.View<{ hasConflict: boolean }>(
  ({ hasConflict }: { hasConflict: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: hasConflict
      ? "rgba(255,0,0,0.1)"
      : "rgba(0,162,255,0.12)",
    borderWidth: 1,
    borderColor: hasConflict ? "red" : "rgba(0,162,255,0.3)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  }),
);

const PlayerTagName = styled.Text<{ hasConflict: boolean }>(
  ({ hasConflict }: { hasConflict: boolean }) => ({
    color: hasConflict ? "red" : "white",
    fontSize: 13,
    fontWeight: "500",
  }),
);

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
  fontStyle: "italic",
  textAlign: "left",
  marginVertical: 8,
});

const InviteButton = styled.TouchableOpacity({
  justifyContent: "center",
  alignItems: "center",
  padding: 14,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
});

const InviteButtonText = styled.Text({
  color: "white",
  fontWeight: "600",
  fontSize: 15,
});

const ShareButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderRadius: 5,
  paddingHorizontal: 8,
  paddingVertical: 4,
  marginLeft: "auto",
});

const ShareButtonText = styled.Text({
  color: "#00A2FF",
  fontSize: 12,
  fontWeight: "500",
});

const TabRow = styled.View({
  flexDirection: "row",
  width: "100%",
  marginBottom: 16,
  marginTop: 8,
  borderRadius: 8,
  padding: 4,
  gap: 6,
});

const Tab = styled.TouchableOpacity<{ active: boolean }>(
  ({ active }: { active: boolean }) => ({
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: active ? "#00A2FF" : "transparent",
  }),
);

const TabText = styled.Text<{ active: boolean }>(
  ({ active }: { active: boolean }) => ({
    color: active ? "white" : "#888",
    fontSize: 13,
    fontWeight: active ? "600" : "400",
  }),
);

const BottomBar = styled.View({
  padding: 16,
  paddingBottom: 30,
  borderTopWidth: 1,
  borderTopColor: "rgba(255,255,255,0.08)",
  backgroundColor: "rgb(3, 16, 31)",
});

export default InviteClubMembersModal;
