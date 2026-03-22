import React, { useContext, useState, useEffect } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Share,
  ScrollView,
} from "react-native";
import styled from "styled-components/native";
import { Dimensions } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Tag from "../Tag";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../services/firebase.config";
import { collection, query, getDocs } from "firebase/firestore";
import { FlatList } from "react-native";
import { PlatformBlurView as BlurView } from "../../components/PlatformBlurView";
import { LinearGradient } from "expo-linear-gradient";
import { UserContext } from "../../context/UserContext";
import {
  notificationSchema,
  notificationTypes,
  COMPETITION_TYPES,
  COLLECTION_NAMES,
} from "@shared";
import moment from "moment";
import { LeagueContext } from "../../context/LeagueContext";
import { PopupContext } from "../../context/PopupContext";
import Popup from "../popup/Popup";
import {
  League,
  Tournament,
  NormalizedCompetition,
  CompetitionType,
  UserProfile,
} from "@/shared/types";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";
import RecentPlayersModal from "../Modals/RecentPlayersModal";

type InvitePlayerModalProps = {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  competitionDetails: League | Tournament;
  competitionType: CompetitionType;
};

const InvitePlayerModal = ({
  modalVisible,
  setModalVisible,
  competitionDetails,
  competitionType,
}: InvitePlayerModalProps) => {
  const [searchUser, setSearchUser] = useState("");
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [inviteUsers, setInviteUsers] = useState<UserProfile[]>([]);
  const [validationError, setValidationError] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const { sendNotification } = useContext(UserContext);
  const { updatePendingInvites } = useContext(LeagueContext);

  const [activeTab, setActiveTab] = useState<"search" | "recent">("search");
  const [recentPlayersVisible, setRecentPlayersVisible] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string>("");
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

  const competition = normalizeCompetitionData({
    rawData: competitionDetails,
    competitionType,
  }) as NormalizedCompetition;

  const collectionName =
    competitionType === COMPETITION_TYPES.LEAGUE
      ? COLLECTION_NAMES.leagues
      : COLLECTION_NAMES.tournaments;

  // Check if user has conflict (already in competition or pending)
  const hasUserConflict = (userId: string) => {
    const inLeague = competition.participants?.some((u) => u.userId === userId);
    const inPendingInvites = competition.pendingInvites?.some(
      (u) => u.userId === userId,
    );
    const inPendingRequests = competition.pendingRequests?.some(
      (u) => u.userId === userId,
    );

    return inLeague || inPendingInvites || inPendingRequests;
  };

  // Derived state - computed on each render, no useEffects needed
  const fixturesGenerated =
    competitionType === COMPETITION_TYPES.TOURNAMENT &&
    (competitionDetails as Tournament).fixturesGenerated;

  const competitionEnded = competition.endDate
    ? moment(competition.endDate, "DD-MM-YYYY").isBefore(moment())
    : false;

  const conflictedUsers = inviteUsers.filter((user) =>
    hasUserConflict(user.userId),
  );
  const hasConflicts = conflictedUsers.length > 0;

  // Single source of truth for blocking errors (prevents inviting)
  const getBlockingError = (): string => {
    if (competitionEnded) {
      const label =
        competitionType === COMPETITION_TYPES.LEAGUE ? "league" : "tournament";
      return `Cannot invite players as the ${label} has ended.`;
    }
    if (fixturesGenerated) {
      return "Cannot invite players as fixtures have been generated for this tournament.";
    }
    if (hasConflicts) {
      return `Cannot invite: ${conflictedUsers
        .map((u) => u.username)
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
    setModalVisible(false);
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

      const notificationType =
        competitionType === COMPETITION_TYPES.LEAGUE
          ? notificationTypes.ACTION.INVITE.LEAGUE
          : notificationTypes.ACTION.INVITE.TOURNAMENT;

      const metaDataId =
        competitionType === COMPETITION_TYPES.LEAGUE
          ? "leagueId"
          : "tournamentId";

      // Send invites
      for (const user of inviteUsers) {
        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: user.userId,
          senderId: currentUserId,
          message: `You've been invited to join ${competition.name}`,
          type: notificationType,
          data: {
            [metaDataId]: competition.id,
          },
        };

        await sendNotification(payload);
        await updatePendingInvites(competition.id, user.userId, collectionName);
      }

      handleShowPopup("Players invited successfully!");
      setInviteUsers([]);
      setSearchUser("");
      setSuggestions([]);
    } catch (error) {
      setValidationError("Failed to send invites. Please try again.");
      console.error("Error sending invites:", error);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchUser(value);

    if (value.trim().length > 0) {
      try {
        const currentUserId = await AsyncStorage.getItem("userId");
        if (!currentUserId) {
          return;
        }

        const searchWords = value.toLowerCase().split(/\s+/);
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(
          (doc) => doc.data() as UserProfile,
        );

        const filteredUsers = users.filter((user) => {
          const username = user.username.toLowerCase();
          const matchesSearch = searchWords.some((word) =>
            username.includes(word),
          );
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
    const totalCount =
      competition.participants.length +
      inviteUsers.length +
      competition.pendingInvites.length;

    if (totalCount >= competition.maxPlayers) {
      setValidationError("You have reached the maximum number of players");
      return;
    }

    setInviteUsers((prevUsers) => [...prevUsers, user]);
    setSearchUser("");
    setSuggestions([]);
    setValidationError("");
  };

  const handleRemoveUser = (userToRemove: UserProfile) => {
    setInviteUsers((prevUsers) =>
      prevUsers.filter((user) => user.userId !== userToRemove.userId),
    );
    setValidationError("");
  };

  const numberOfPlayers = `${competition.participants?.length || 0} / ${
    competition.maxPlayers
  }`;
  const competitionVariant =
    competitionType === COMPETITION_TYPES.LEAGUE ? "League" : "Tournament";

  const handleShare = async () => {
    const type =
      competitionType === COMPETITION_TYPES.LEAGUE ? "league" : "tournament";
    const url = `https://courtchamps.com/join/${type}/${competition.id}`;

    try {
      await Share.share({
        message: `You've been invited to join my ${competitionVariant} on Court Champs! 🏸\n\n${url}`,
        url,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleAddFromRecent = (players: UserProfile[]) => {
    const newPlayers = players.filter(
      (p) => !inviteUsers.some((u) => u.userId === p.userId),
    );
    setInviteUsers((prev) => [...prev, ...newPlayers]);
  };

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Popup
          visible={showPopup}
          message={popupMessage}
          onClose={handleClosePopup}
          type="success"
          height={450}
        />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ModalContainer>
            <GradientOverlay colors={["#191b37", "#001d2e"]}>
              <ModalContent>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    alignSelf: "flex-end",
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 10,
                  }}
                >
                  <AntDesign name="closecircleo" size={30} color="red" />
                </TouchableOpacity>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <LeagueDetailsContainer>
                    <LeagueName>{competition.name}</LeagueName>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <LeagueLocation>
                        {competition.location.courtName},{" "}
                        {competition.location.city}
                      </LeagueLocation>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 5,
                        marginTop: 10,
                        alignItems: "center",
                      }}
                    >
                      <Tag
                        name={numberOfPlayers}
                        color={"rgba(0, 0, 0, 0.7)"}
                        iconColor={"#00A2FF"}
                        iconSize={15}
                        icon={"person"}
                        iconPosition={"right"}
                        bold
                      />
                      <Tag name={competition.type} />
                      <Tag name={competition.prizeType} />
                      <ShareButton onPress={handleShare}>
                        <AntDesign name="sharealt" size={13} color="#00A2FF" />
                        <ShareButtonText>
                          Share {competitionVariant}
                        </ShareButtonText>
                      </ShareButton>
                    </View>
                  </LeagueDetailsContainer>

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
                      <TabText active={activeTab === "recent"}>
                        Recent Players
                      </TabText>
                    </Tab>
                  </TabRow>

                  {activeTab === "search" && (
                    <>
                      <Label>Search by username</Label>
                      <Input
                        placeholder="Start typing to search players"
                        placeholderTextColor="#999"
                        value={searchUser}
                        onChangeText={handleSearch}
                      />
                      {suggestions.length > 0 && (
                        <DropdownContainer>
                          <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item.userId}
                            scrollEnabled={false}
                            renderItem={({ item }) => {
                              const isAlreadySelected = inviteUsers.some(
                                (invitedUser) =>
                                  invitedUser.userId === item.userId,
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
                                    {item.username}
                                    {isAlreadySelected && " (selected)"}
                                  </DropdownText>
                                </DropdownItem>
                              );
                            }}
                          />
                        </DropdownContainer>
                      )}
                    </>
                  )}

                  {inviteUsers?.length > 0 && (
                    <FlatList
                      style={{ marginBottom: 10, width: "100%" }}
                      data={inviteUsers}
                      scrollEnabled={false}
                      keyExtractor={(item, index) =>
                        item.userId || index.toString()
                      }
                      renderItem={({ item }) => {
                        const hasConflict = hasUserConflict(item.userId);
                        return (
                          <UserItem
                            style={{
                              borderColor: hasConflict ? "red" : "transparent",
                              borderWidth: hasConflict ? 1 : 0,
                            }}
                          >
                            <UserName>{item.username}</UserName>
                            <AntDesign
                              name="closecircleo"
                              size={20}
                              color="red"
                              onPress={() => handleRemoveUser(item)}
                            />
                          </UserItem>
                        );
                      }}
                    />
                  )}

                  <DisclaimerText>
                    Please ensure you have arranged court reservation directly
                    with the venue. Court Champs does not reserve any courts
                    when you post a game
                  </DisclaimerText>

                  {displayError ? (
                    <View style={{ width: "100%" }}>
                      <ErrorText>{displayError}</ErrorText>
                    </View>
                  ) : null}

                  <ButtonContainer>
                    <InviteButton
                      onPress={handleSendInvite}
                      disabled={isInviteDisabled}
                      style={{ opacity: isInviteDisabled ? 0.6 : 1 }}
                    >
                      {sendingInvite ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <InviteText>Invite ({inviteUsers.length})</InviteText>
                      )}
                    </InviteButton>
                  </ButtonContainer>
                </ScrollView>
              </ModalContent>
            </GradientOverlay>
          </ModalContainer>
        </TouchableWithoutFeedback>

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
      </Modal>
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const ModalContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "center",
  maxHeight: 1000,
});

const GradientOverlay = styled(LinearGradient)({
  padding: 2,
  borderRadius: 12,
  shadowColor: "#00A2FF",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.4,
  shadowRadius: 20,
  opacity: 0.9,
});

const DisclaimerText = styled.Text({
  color: "white",
  fontStyle: "italic",
  fontSize: 11,
  textAlign: "left",
});

const Label = styled.Text({
  color: "#ccc",
  alignSelf: "flex-start",
  marginBottom: 5,
  marginLeft: 5,
  fontSize: 14,
});

const Input = styled.TextInput({
  width: "100%",
  padding: 10,
  marginBottom: 20,
  backgroundColor: "#262626",
  color: "#fff",
  borderRadius: 5,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  marginTop: 20,
});

const InviteButton = styled.TouchableOpacity({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 5,
  backgroundColor: "#00A2FF",
});

const LeagueName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
  padding: 5,
  marginBottom: 5,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
  alignSelf: "flex-start",
});

const LeagueLocation = styled.Text({
  fontSize: 12,
  padding: 5,
  color: "white",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
});

const LeagueDetailsContainer = styled.View({
  paddingTop: 20,
  paddingBottom: 25,
  width: "100%",
  borderRadius: 10,
  overflow: "hidden",
});

const InviteText = styled.Text({
  color: "white",
});

const DropdownContainer = styled.View({
  backgroundColor: "rgb(4, 26, 49)",
  borderRadius: 5,
  padding: 10,
  marginVertical: 5,
  maxHeight: "200px",
  width: "100%",
});

const DropdownItem = styled.TouchableOpacity({
  backgroundColor: "rgb(5, 34, 64)",
  borderRadius: 5,
  padding: 10,
  marginVertical: 5,
});

const DropdownText = styled.Text({
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "500",
});

const UserItem = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  marginVertical: 5,
  backgroundColor: "rgb(5, 34, 64)",
  borderRadius: 5,
  width: screenWidth < 450 ? "75%" : "100%",
});

const UserName = styled.Text({
  fontSize: 16, // Set a readable font size
  color: "#FFFFFF", // White text color
  fontWeight: "500", // Slightly bold text
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
  fontStyle: "italic",
  textAlign: "left",
  marginVertical: 10,
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
  borderRadius: 8,
  backgroundColor: "rgba(255,255,255,0.05)",
  padding: 3,
});

const Tab = styled.TouchableOpacity<{ active: boolean }>(
  ({ active }: { active: boolean }) => ({
    flex: 1,
    paddingVertical: 8,
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

export default InvitePlayerModal;
