import React, { useContext, useState, useEffect } from "react";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import styled from "styled-components/native";
import { Dimensions } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Tag from "../Tag";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../services/firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { FlatList } from "react-native";
import { PlatformBlurView as BlurView } from "../../components/PlatformBlurView";
import { LinearGradient } from "expo-linear-gradient";
import { UserContext } from "../../context/UserContext";
import { notificationSchema, notificationTypes } from "../../schemas/schema";
import { createdAt } from "expo-updates";
import { LeagueContext } from "../../context/LeagueContext";
import { PopupContext } from "../../context/PopupContext";
import Popup from "../popup/Popup";

const InvitePlayerModal = ({
  modalVisible,
  setModalVisible,
  leagueDetails,
}) => {
  const [searchUser, setSearchUser] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [inviteUsers, setInviteUsers] = useState([]);
  const [errorText, setErrorText] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const { sendNotification } = useContext(UserContext);
  const { updatePendingInvites } = useContext(LeagueContext);
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);

  // Simple function to check if user has conflict (not including current invite list)
  const hasUserConflict = (userId) => {
    const inLeague = leagueDetails.leagueParticipants?.some(
      (u) => u.userId === userId
    );
    const inPendingInvites = leagueDetails.pendingInvites?.some(
      (u) => u.userId === userId
    );
    const inPendingRequests = leagueDetails.pendingRequests?.some(
      (u) => u.userId === userId
    );

    return inLeague || inPendingInvites || inPendingRequests;
  };

  // Check if any users in invite list have conflicts
  const hasConflicts = inviteUsers.some((user) => hasUserConflict(user.userId));

  // Show error when there are conflicts
  useEffect(() => {
    if (hasConflicts) {
      const conflictedUsers = inviteUsers.filter((user) =>
        hasUserConflict(user.userId)
      );
      setErrorText(
        `Cannot invite: ${conflictedUsers
          .map((u) => u.username)
          .join(", ")}. Remove them to continue.`
      );
    } else {
      setErrorText("");
    }
  }, [inviteUsers, leagueDetails]);

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");
    setModalVisible(false);
  };

  const handleSendInvite = async () => {
    setSendingInvite(true);
    setErrorText("");

    try {
      if (inviteUsers.length === 0) {
        setErrorText("Please select at least one player to invite");
        setSendingInvite(false);
        return;
      }

      const currentUserId = await AsyncStorage.getItem("userId");

      // Send invites
      for (const user of inviteUsers) {
        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: user.userId,
          senderId: currentUserId,
          message: `You've been invited to join ${leagueDetails.leagueName}`,
          type: notificationTypes.ACTION.INVITE.LEAGUE,
          data: {
            leagueId: leagueDetails.leagueId,
          },
        };

        await sendNotification(payload);
        await updatePendingInvites(leagueDetails.leagueId, user.userId);
      }

      handleShowPopup("Players invited successfully!");
      // Clear the invite list after successful invitation
      setInviteUsers([]);
      setSearchUser("");
      setSuggestions([]);
    } catch (error) {
      setErrorText("Failed to send invites. Please try again.");
      console.error("Error sending invites:", error);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSearch = async (value) => {
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
        const users = querySnapshot.docs.map((doc) => doc.data());

        // Filter only current user and already selected users
        const filteredUsers = users.filter((user) => {
          const username = user.username.toLowerCase();
          const matchesSearch = searchWords.some((word) =>
            username.includes(word)
          );
          const isCurrentUser = user.userId === currentUserId;
          const alreadySelected = inviteUsers.some(
            (u) => u.userId === user.userId
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

  const handleSelectUser = (user) => {
    // Check max players limit
    const totalCount =
      leagueDetails.leagueParticipants.length +
      inviteUsers.length +
      leagueDetails.pendingInvites.length;

    if (totalCount >= leagueDetails.maxPlayers) {
      setErrorText("You have reached the maximum number of players");
      return;
    }

    setInviteUsers((prevUsers) => [...prevUsers, user]);
    setSearchUser("");
    setSuggestions([]);
    setErrorText("");
  };

  const handleRemoveUser = (userToRemove) => {
    setInviteUsers((prevUsers) =>
      prevUsers.filter((user) => user.userId !== userToRemove.userId)
    );
  };

  const numberOfPlayers = `${leagueDetails.leagueParticipants?.length || 0} / ${
    leagueDetails.maxPlayers
  }`;

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

                <LeagueDetailsContainer>
                  <LeagueName>{leagueDetails.leagueName}</LeagueName>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <LeagueLocation>
                      {leagueDetails.location.courtName},{" "}
                      {leagueDetails.location.city}
                    </LeagueLocation>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 5,
                      marginTop: 10,
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
                    <Tag name={leagueDetails.leagueType} />
                    <Tag name={leagueDetails.prizeType} />
                  </View>
                </LeagueDetailsContainer>
                <Label>Search Players</Label>
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
                      renderItem={({ item }) => {
                        const isAlreadySelected = inviteUsers.some(
                          (invitedUser) => invitedUser.userId === item.userId
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

                {inviteUsers?.length > 0 && (
                  <FlatList
                    style={{ marginBottom: 10 }}
                    data={inviteUsers}
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
                  with the venue. Court Champs does not reserve any courts when
                  you post a game
                </DisclaimerText>

                {errorText ? (
                  <View style={{ width: "100%" }}>
                    <ErrorText>{errorText}</ErrorText>
                  </View>
                ) : null}

                <ButtonContainer>
                  <InviteButton
                    onPress={handleSendInvite}
                    disabled={
                      sendingInvite || inviteUsers.length === 0 || hasConflicts
                    }
                    style={{
                      opacity:
                        sendingInvite ||
                        inviteUsers.length === 0 ||
                        hasConflicts
                          ? 0.6
                          : 1,
                    }}
                  >
                    {sendingInvite ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <InviteText>Invite ({inviteUsers.length})</InviteText>
                    )}
                  </InviteButton>
                </ButtonContainer>
              </ModalContent>
            </GradientOverlay>
          </ModalContainer>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ✅ All styled components remain the same
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
  width: screenWidth < 450 ? "80%" : "100%",
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

export default InvitePlayerModal;
