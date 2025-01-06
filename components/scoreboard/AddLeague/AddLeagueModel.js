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
import { LeagueContext } from "../../../context/LeagueContext";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserContext } from "../../../context/UserContext";

import DatePicker from "./DatePicker";
import MaxPlayersPicker from "./MaxPlayersPicker";
import LeagueType from "./LeagueType";
import PrivacyType from "./PrivacyType";
import { PopupContext } from "../../../context/PopupContext";
import Popup from "../../popup/Popup";

const AddLeagueModal = ({ modalVisible, setModalVisible }) => {
  const { addLeagues } = useContext(LeagueContext);
  const { getUserById } = useContext(UserContext);
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);
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

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");

    // setModalVisible(false);
  };

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
        leagueAdmins: [...prevDetails.leagueAdmins, userInfo], // Add new admin to the array immutably
      }));

      const rearrangedData = {
        id: userInfo.username, // Rename firstName + lastName to id
        userId: userInfo.userId,
        ...userInfo.profile_detail, // Merge profile details
      };
      setLeagueDetails((prevDetails) => ({
        ...prevDetails, // Spread the existing state
        leagueParticipants: [...prevDetails.leagueParticipants, rearrangedData], // Add new admin to the array immutably
      }));
      // Await the resolved value of the promise
      // console.log(userInfo, "=================>"); // Logs the actual user data
    } catch (error) {
      console.error("Error retrieving admin info:", error);
    }
  };

  const handleChange = (field, value) => {
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      [field]: value,
    }));
  };

  // console.log("leagueDetails===>", leagueDetails);

  //Creating League
  const handleCreate = () => {
    const requiredFields = [
      "leagueName",
      "location",
      "centerName",
      "startDate",
      "endDate",
      "leagueType",
      "maxPlayers",
      "privacy",
    ];

    // Find the first missing field in order
    const firstMissingField = requiredFields.find(
      (field) => !leagueDetails[field]
    );

    if (firstMissingField) {
      // Convert the field name to a human-readable format
      const formattedField = firstMissingField
        .replace(/([A-Z])/g, " $1")
        .toLowerCase()
        .replace(/^./, (str) => str.toUpperCase());

      // Trigger the popup with the first missing field
      handleShowPopup(`Please fill in the ${formattedField}.`);
      return;
    }

    // If all fields are filled, proceed to create the league
    addLeagues(leagueDetails);
    setModalVisible(false);
    handleShowPopup("League created successfully!");
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
        />
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

            <DatePicker
              setLeagueDetails={setLeagueDetails}
              leagueDetails={leagueDetails}
            />

            <MaxPlayersPicker setLeagueDetails={setLeagueDetails} />

            <LeagueType setLeagueDetails={setLeagueDetails} />

            <PrivacyType setLeagueDetails={setLeagueDetails} />

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
