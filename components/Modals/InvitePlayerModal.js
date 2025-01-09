import React, { useContext, useState } from "react";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  Keyboard,
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

const InvitePlayerModal = ({
  modalVisible,
  setModalVisible,
  leagueDetails,
}) => {
  const [searchUser, setSearchUser] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [inviteUsers, setInviteUsers] = useState([]);
  const handleSendInvite = () => {
    setModalVisible(false);

    console.log("invited user:", inviteUsers);
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
    setInviteUsers((prevUsers) => [...prevUsers, user]); // Directly add the user to the array
    setSearchUser(""); // Clear the input after selection
    setSuggestions([]); // Clear the suggestions
  };

  const handleRemoveUser = (userToRemove) => {
    setInviteUsers(
      (prevUsers) =>
        prevUsers.filter((user) => user.userId !== userToRemove.userId) // Remove user based on userId
    );
  };

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
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
                      {leagueDetails.centerName}, {leagueDetails.location}
                    </LeagueLocation>
                  </View>
                  <Tag
                    name={leagueDetails.leagueStatus.status}
                    color={leagueDetails.leagueStatus.color}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row" }}>
                      <Tag name={leagueDetails.leagueType} />
                      <Tag name={leagueDetails.prizeType} />
                    </View>
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
                      keyExtractor={(item) => item.email || item.id}
                      renderItem={({ item }) => (
                        <DropdownItem onPress={() => handleSelectUser(item)}>
                          <DropdownText>{item.username}</DropdownText>
                        </DropdownItem>
                      )}
                    />
                  </DropdownContainer>
                )}
                {inviteUsers?.length > 0 && (
                  <FlatList
                    data={inviteUsers}
                    keyExtractor={(item, index) =>
                      item.email || index.toString()
                    }
                    renderItem={({ item }) => (
                      <UserItem>
                        <UserName>{item.username}</UserName>
                        <RemoveButton onPress={() => handleRemoveUser(item)}>
                          <RemoveText>✖</RemoveText>
                        </RemoveButton>
                      </UserItem>
                    )}
                  />
                )}

                <DisclaimerText>
                  Please ensure you have arranged court reservation directly
                  with the venue. Court Champs does not reserve any courts when
                  you post a game
                </DisclaimerText>

                <ButtonContainer>
                  <CreateButton onPress={handleSendInvite}>
                    <CreateText>Invite</CreateText>
                  </CreateButton>
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

const CreateButton = styled.TouchableOpacity({
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

const CreateText = styled.Text({
  color: "white",
});
const DropdownContainer = styled.View({
  backgroundColor: "#2D3748", // Dark gray to match the input field
  borderRadius: 20, // Rounded corners
  padding: 10, // Padding inside the container
  marginTop: 5, // Spacing from the input field
  maxHeight: "200px",
  width: "100%",
});

const DropdownItem = styled.TouchableOpacity({
  backgroundColor: "#4A5568", // Slightly lighter gray for contrast
  borderRadius: 15, // Consistent rounding
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
  backgroundColor: "#4A5568", // Background color
  borderRadius: 15, // Rounded corners
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

export default InvitePlayerModal;
