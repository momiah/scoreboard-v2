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
import { BlurView } from "expo-blur";
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

  // ✅ Must come first
  const hasConflictedUsers = inviteUsers.some(
    (item) =>
      leagueDetails.leagueParticipants.some((u) => u.userId === item.userId) ||
      leagueDetails.pendingInvites.some((u) => u.userId === item.userId)
  );

  useEffect(() => {
    if (hasConflictedUsers) {
      setErrorText(
        "Some selected users are already in the league or already invited"
      );
    }
  }, [hasConflictedUsers]);

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");

    setModalVisible(false);
  };

  const handleSendInvite = async () => {
    setSendingInvite(true);
    try {
      if (inviteUsers.length === 0) {
        setErrorText("Please select at least one player to invite");
        setSendingInvite(false);
        return;
      }

      const currentUserId = await AsyncStorage.getItem("userId");
      const inLeague = leagueDetails.leagueParticipants.map((u) => u.userId);
      const pendingInvites = leagueDetails.pendingInvites.map((u) => u.userId);
      const pendingRequests = leagueDetails.pendingRequests.map(
        (u) => u.userId
      );

      const hasConflict = inviteUsers.some(
        (u) =>
          inLeague.includes(u.userId) ||
          pendingInvites.includes(u.userId) ||
          pendingRequests.includes(u.userId)
      );

      if (hasConflict) {
        setErrorText(
          "Some selected users are already in the league or already invited/ requested to join"
        );
        return;
      }

      for (const user of inviteUsers) {
        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: user.userId,
          senderId: currentUserId,
          message: `You've been invited to join ${leagueDetails.leagueName}`,
          type: notificationTypes.ACTION.INVITE.LEAGUE,
          data: {
            leagueId: leagueDetails.id,
          },
        };

        await sendNotification(payload);
        await updatePendingInvites(leagueDetails.id, user.userId);
      }
      handleShowPopup("Players invited successfully!");
      // setModalVisible(false);
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
        // Retrieve the logged-in user ID from AsyncStorage
        const currentUserId = await AsyncStorage.getItem("userId");
        if (!currentUserId) {
          return; // Handle if no user is logged in
        }

        // Split the search value into individual words
        const searchWords = value.toLowerCase().split(/\s+/); // Split by spaces

        // Query Firestore for matching usernames
        const q = query(collection(db, "users")); // Base query

        const querySnapshot = await getDocs(q);

        // Map the result into an array and filter the users by search words
        const users = querySnapshot.docs.map((doc) => doc.data());

        // Filter based on search words
        const filteredUsers = users.filter((user) => {
          const username = user.username.toLowerCase(); // Convert username to lowercase
          return (
            searchWords.some((word) => username.includes(word)) && // Match any word
            user.userId !== currentUserId && // Exclude the logged-in user
            !leagueDetails.leagueParticipants.some(
              (selectedUser) => selectedUser.userId === user.userId
            ) &&
            !inviteUsers.some(
              (invitedUser) => invitedUser.userId === user.userId
            ) // Exclude already selected users
          );
        });

        setSuggestions(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    } else {
      setSuggestions([]); // Clear suggestions if input is empty
    }
  };

  const handleSelectUser = (user) => {
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
    setErrorText(""); // Clear any previous errors
  };

  const handleRemoveUser = (userToRemove) => {
    setInviteUsers(
      (prevUsers) =>
        prevUsers.filter((user) => user.userId !== userToRemove.userId) // Remove user based on userId
    );
  };

  // Shows 2/8 (Example) for number of players
  const numberOfPlayers = `${leagueDetails.leagueParticipants?.length} / ${leagueDetails.maxPlayers}`;

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
                      keyExtractor={(item) => item.userId} // Use userId instead of email
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
                      item.email || index.toString()
                    }
                    renderItem={({ item }) => {
                      const inLeague = leagueDetails.leagueParticipants.some(
                        (u) => u.userId === item.userId
                      );
                      const isPending = leagueDetails.pendingInvites.some(
                        (u) => u.userId === item.userId
                      );

                      const hasConflict = inLeague || isPending;

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
                <View style={{ width: "100%" }}>
                  {errorText && <ErrorText>{errorText}</ErrorText>}
                </View>

                <ButtonContainer>
                  <InviteButton onPress={handleSendInvite}>
                    {sendingInvite ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <InviteText>Invite</InviteText>
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
  backgroundColor: "rgba(2, 13, 24, 1)", // Translucent dark blue
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "center",

  // border: "1px solid #191b37",
});
const GradientOverlay = styled(LinearGradient)({
  padding: 2, // Creates a border-like effect
  borderRadius: 12, // Rounded corners
  shadowColor: "#00A2FF", // Glow color
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.4,
  shadowRadius: 20, // Soft glow effect
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
  backgroundColor: "rgb(4, 26, 49)", // Translucent dark blue
  borderRadius: 5, // Rounded corners
  padding: 10, // Padding inside the container
  marginVertical: 5, // Spacing from the input field
  maxHeight: "200px",
  width: "100%",
});

const DropdownItem = styled.TouchableOpacity({
  backgroundColor: "rgb(5, 34, 64)", // Translucent dark blue
  borderRadius: 5, // Consistent rounding
  padding: 10, // Spacing inside the item
  marginVertical: 5, // Space between items
});

const DropdownText = styled.Text({
  color: "#FFFFFF", // White text for visibility
  fontSize: 16, // Readable font size
  fontWeight: "500", // Slightly bold for emphasis
});

const UserItem = styled.View({
  flexDirection: "row", // Align items horizontally
  justifyContent: "space-between", // Push name to the left and cross to the right
  alignItems: "center", // Center items vertically
  padding: 10, // Add spacing inside the item
  marginVertical: 5, // Space between items
  backgroundColor: "rgb(5, 34, 64)", // Translucent dark blue
  borderRadius: 5, // Rounded corners
  width: "100%",
});

const UserName = styled.Text({
  fontSize: 16, // Set a readable font size
  color: "#FFFFFF", // White text color
  fontWeight: "500", // Slightly bold text
});

const RemoveButton = styled.TouchableOpacity({
  padding: 5, // Add padding for better touch area
  borderRadius: 5, // Slightly rounded corners
  backgroundColor: "#E53E3E", // Red background for the remove button
});

const RemoveText = styled.Text({
  color: "#FFFFFF", // White text color
  fontWeight: "bold", // Bold text for emphasis
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 10,
  fontStyle: "italic",
  textAlign: "left",
  marginVertical: 10,
});

export default InvitePlayerModal;
