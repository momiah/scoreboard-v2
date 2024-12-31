import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";

import styled from "styled-components/native";
import { Dimensions } from "react-native";
import { GameContext } from "../../../context/GameContext";
import { LeagueContext } from "../../../context/LeagueContext";
import { sampleLeagues2, sampleLeagues } from "../../Leagues/leagueMocks";
import {
  mockedParticipants,
  mockedEmptyParticipants,
} from "../../Leagues/leagueMocks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserContext } from "../../../context/UserContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../services/firebase.config";

const AddLeagueModal = ({ modalVisible, setModalVisible }) => {
  const { addLeagues } = useContext(LeagueContext);
  const { getUserById } = useContext(UserContext);
  const [suggestions, setSuggestions] = useState([]);
  const [searchUser, setSearchUser] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [leagueDetails, setLeagueDetails] = useState({
    leagueParticipants: [],
    leagueAdmins: [],
    games: [],
    leagueType: "",
    prizeType: "",
    entryFee: 0,
    currencyType: "",
    image: "",
    leagueName: "",
    location: "",
    centerName: "",
    startDate: "",
    endDate: "",
    image: "",
    leagueType: "",
    maxPlayers: 0,
    privacy: "",
    playingTime: [],
    leagueStatus: "FULL",
  });

  useEffect(() => {
    getAdminInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAdminInfo = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId"); // Retrieve userId from AsyncStorage
      if (!userId) {
        console.log("No userId found in AsyncStorage.");
        return;
      }

      const userInfo = await getUserById(userId);
      setLeagueDetails((prevDetails) => ({
        ...prevDetails, // Spread the existing state
        leagueAdmins: [...prevDetails.leagueAdmins, userInfo] // Add new admin to the array immutably
      }));

      const rearrangedData = {
        id: userInfo.username, // Rename firstName + lastName to id
        userId: userInfo.userId,
        ...userInfo.profile_detail, // Merge profile details
      };
      setLeagueDetails((prevDetails) => ({
        ...prevDetails, // Spread the existing state
        leagueParticipants: [...prevDetails.leagueParticipants, rearrangedData] // Add new admin to the array immutably
      }));
      // Await the resolved value of the promise
      // console.log(userInfo, "=================>"); // Logs the actual user data
    } catch (error) {
      console.error("Error retrieving admin info:", error);
    }
  };
  // console.log(getAdminInfo(), "leagueDetails===>");
  const handleChange = (field, value) => {
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      [field]: value,
    }));
  };
  console.log("leagueDetails===>", leagueDetails);
  const handleCreate = () => {
    // console.log("Creating league with details:", leagueDetails);

    addLeagues(leagueDetails);
    setModalVisible(false);
  };
  const handleSearch = async (value) => {
    setSearchUser(value);
  
    if (value.length > 0) {
      try {
        // Retrieve the logged-in user ID from AsyncStorage
        const currentUserId = await AsyncStorage.getItem('userId');
        
        if (!currentUserId) {
          console.error("No user ID found in AsyncStorage");
          return; // Handle if no user is logged in
        }
  
        // Query Firestore to search for matching firstName or lastName
        const q = query(
          collection(db, "users"), // Your Firestore collection name
          where("firstName", ">=", value.toLowerCase()),
          where("firstName", "<=", value.toLowerCase() + "\uf8ff") // Range query for partial matching
        );
  
        // Get matching documents
        const querySnapshot = await getDocs(q);
  
        // Map the result into an array
        const users = querySnapshot.docs.map((doc) => doc.data());
  
        // Filter out the logged-in user and already selected users
        const filteredUsers = users.filter(
          (user) =>
            user.userId !== currentUserId && // Exclude the logged-in user based on userId
            !leagueDetails.leagueParticipants.some((selectedUser) => selectedUser.userId === user.userId) // Exclude already selected users
        );
  
        setSuggestions(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    } else {
      setSuggestions([]);
    }
  };

  console.log(suggestions, "suggestionssuggestions");

  const handleSelectUser = (user) => {

    const rearrangedData = {
      id: user.username, // Rename firstName + lastName to id
      userId: user.userId,
      ...user.profile_detail, // Merge profile details
    };
    // Add user to selected users
    setLeagueDetails((prevState) => ({
      ...prevState,
      leagueParticipants: [...prevState.leagueParticipants, rearrangedData]
    }));
    setSearchUser(""); // Clear the input after selection
    setSuggestions([]); // Clear the suggestions
  };

  const handleRemoveUser = (userToRemove) => {
    // Remove user from selected users
    setLeagueDetails((prevState) => ({
      ...prevState,
      leagueParticipants: prevState.leagueParticipants.filter(
        (participant) => participant.userId !== userToRemove.userId
      )
    }));
  };

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <ModalContent>
            <ModalTitle>Create League</ModalTitle>

            <Label>League Name</Label>
            <Input
              placeholder="Enter league name"
              placeholderTextColor="#ccc"
              value={leagueDetails.leagueName}
              onChangeText={(value) => handleChange("leagueName", value)}
            />

            <Label>Location</Label>
            <Input
              placeholder="Enter location"
              placeholderTextColor="#ccc"
              value={leagueDetails.location}
              onChangeText={(value) => handleChange("location", value)}
            />
            <Label>Center Name</Label>
            <Input
              placeholder="Enter center name"
              placeholderTextColor="#ccc"
              value={leagueDetails.centerName}
              onChangeText={(value) => handleChange("centerName", value)}
            />
            <Label>Start Date</Label>
            <Input
              placeholder="Enter start date"
              placeholderTextColor="#ccc"
              value={leagueDetails.startDate}
              onChangeText={(value) => handleChange("startDate", value)}
            />
            <Label>End Date</Label>
            <Input
              placeholder="Enter end date"
              placeholderTextColor="#ccc"
              value={leagueDetails.endDate}
              onChangeText={(value) => handleChange("endDate", value)}
            />
            <Label>Max Players</Label>
            <Input
              placeholder="Enter max players"
              placeholderTextColor="#ccc"
              value={leagueDetails.maxPlayers}
              onChangeText={(value) => handleChange("maxPlayers", value)}
            />
            <Label>Add League participant</Label>
            <Input
              placeholder="Enter max players"
              placeholderTextColor="#ccc"
              value={searchUser}
              onChangeText={handleSearch}
            />
            {suggestions.length > 0 && (
              <DropdownContainer>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item.email || item.id} // Use unique key for each user
                  renderItem={({ item }) => (
                    <DropdownItem onPress={() => handleSelectUser(item)}>
                      <DropdownText>
                        {item.firstName} {item.lastName}
                      </DropdownText>
                    </DropdownItem>
                  )}
                />
              </DropdownContainer>
            )}

            {leagueDetails?.leagueParticipants?.length > 0 && (
              <FlatList
                data={leagueDetails?.leagueParticipants}
                keyExtractor={(item, index) => item.email || index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleRemoveUser(item)}>
                    <Text>
                      {item.id} 
                    </Text>
                    <RemoveText>✖</RemoveText>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Display search results */}

            <Label>League Type</Label>
            <Input
              placeholder="Enter League Type"
              placeholderTextColor="#ccc"
              value={leagueDetails.leagueType}
              onChangeText={(value) => handleChange("leagueType", value)}
            />
            <Label>Privacy</Label>
            <Input
              placeholder="Enter privacy"
              placeholderTextColor="#ccc"
              value={leagueDetails.privacy}
              onChangeText={(value) => handleChange("privacy", value)}
            />

            <ButtonContainer>
              <CancelButton onPress={() => setModalVisible(false)}>
                <CancelText>Cancel</CancelText>
              </CancelButton>
              <CreateButton onPress={handleCreate}>
                <CreateText>Create</CreateText>
              </CreateButton>
            </ButtonContainer>
          </ModalContent>
        </ModalContainer>
      </Modal>
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const ModalContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "#00152B",
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "center",
});

const ModalTitle = styled.Text({
  fontSize: 18,
  color: "#FFF",
  fontWeight: "bold",
  marginBottom: 20,
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

const CancelButton = styled.TouchableOpacity({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 10,
});

const CreateButton = styled.TouchableOpacity({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 5,
  backgroundColor: "#00A2FF",
});

const CancelText = styled.Text({
  color: "red",
});

const CreateText = styled.Text({
  color: "white",
});
const DropdownContainer = styled.View({
  backgroundColor: "#444",
  borderRadius: 8,
  maxHeight: 200,
  overflow: "hidden", // Ensures rounded corners are maintained if content overflows
});

const DropdownItem = styled.TouchableOpacity({
  padding: 10,
  backgroundColor: "#333",
  borderRadius: 8,
  marginBottom: 5,
});

const DropdownText = styled.Text({
  color: "white",
});
const UserItemContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
});

const RemoveText = styled.Text({
  color: "red",
  marginLeft: 10,
});

export default AddLeagueModal;
