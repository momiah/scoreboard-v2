import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { BlurView } from "expo-blur";

import styled from "styled-components/native";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../context/LeagueContext";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserContext } from "../../context/UserContext";

import DatePicker from "../scoreboard/AddLeague/DatePicker";
import MaxPlayersPicker from "../scoreboard/AddLeague/MaxPlayersPicker";
import LeagueType from "../scoreboard/AddLeague/LeagueType";
import PrivacyType from "../scoreboard/AddLeague/PrivacyType";
import { PopupContext } from "../../context/PopupContext";
import Popup from "../popup/Popup";

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
    leageDescription: "",
    location: "",
    centerName: "",
    startDate: "",
    leagueLengthInMonths: "",
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
        ...userInfo.profileDetail, // Merge profile details
      };
      setLeagueDetails((prevDetails) => ({
        ...prevDetails, // Spread the existing state
        leagueParticipants: [...prevDetails.leagueParticipants, rearrangedData], // Add new admin to the array immutably
      }));
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

  //Creating League
  const handleCreate = () => {
    const requiredFields = [
      "leagueName",
      "location",
      "centerName",
      "startDate",
      "leagueLengthInMonths",
      "leagueType",
      "maxPlayers",
      "privacy",
    ];

    // Find the first missing field in order
    const firstMissingField = requiredFields.find(
      (field) => !leagueDetails[field]
    );

    if (firstMissingField) {
      const formattedField = firstMissingField
        .replace(/([A-Z])/g, " $1")
        .toLowerCase()
        .replace(/^./, (str) => str.toUpperCase());

      handleShowPopup(`Please fill in the ${formattedField}.`);
      return;
    }

    // If all fields are filled, proceed to create the league
    addLeagues(leagueDetails);
    setModalVisible(false);
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
        <ModalContainer>
          <ModalContent>
            <ModalTitle>Create League</ModalTitle>

            <Label>League Name</Label>
            <Input
              placeholder="Enter league name"
              placeholderTextColor="#ccc"
              value={leagueDetails.leagueName}
              onChangeText={(value) => handleChange("leagueName", value)}
              style={{ backgroundColor: "#243237" }}
            />

            <Label>Location</Label>
            <Input
              placeholder="Enter location"
              placeholderTextColor="#ccc"
              value={leagueDetails.location}
              onChangeText={(value) => handleChange("location", value)}
              style={{ backgroundColor: "#243237" }}
            />
            <Label>Center Name</Label>
            <Input
              placeholder="Enter center name"
              placeholderTextColor="#ccc"
              value={leagueDetails.centerName}
              onChangeText={(value) => handleChange("centerName", value)}
              style={{ backgroundColor: "#243237" }}
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

const ModalContainer = styled(BlurView).attrs({
  intensity: 80,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 0.7)", // Translucent dark blue
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "center",
  borderRadius: 20,
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

export default AddLeagueModal;
