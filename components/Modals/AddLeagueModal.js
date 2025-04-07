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

import DatePicker from "../Leagues/AddLeague/DatePicker";
import MaxPlayersPicker from "../Leagues/AddLeague/MaxPlayersPicker";
import LeagueType from "../Leagues/AddLeague/LeagueType";
import PrivacyType from "../Leagues/AddLeague/PrivacyType";
import { leagueSchema, scoreboardProfileSchema } from "../../schemas/schema";

const AddLeagueModal = ({ modalVisible, setModalVisible }) => {
  const { addLeagues } = useContext(LeagueContext);
  const { getUserById } = useContext(UserContext);
  const [errorText, setErrorText] = useState({
    leagueName: "",
    location: "",
    centerName: "",
    startDate: "",
    leagueLengthInMonths: "",
    leagueType: "",
    maxPlayers: "",
    privacy: "",
  });

  const [leagueDetails, setLeagueDetails] = useState(leagueSchema);

  const assignLeagueAdmin = async () => {
    const currentUserId = await AsyncStorage.getItem("userId");
    if (!currentUserId) {
      console.log("No userId found in AsyncStorage.");
      return null;
    }

    const userInfo = await getUserById(currentUserId);

    const leagueCreatorProfile = {
      ...scoreboardProfileSchema,
      // XP: userInfo.profileDetail?.XP || 0,
      username: userInfo.username,
      userId: userInfo.userId,
      memberSince: userInfo.profileDetail?.memberSince || "",
    };

    return {
      leagueAdmin: { userId: userInfo.userId, username: userInfo.username },
      leagueParticipant: {
        ...leagueCreatorProfile,
      },
    };
  };

  const handleChange = (field, value) => {
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      [field]: value,
    }));
  };

  const handleCreate = async () => {
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

    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!leagueDetails[field]) {
        newErrors[field] = "required";
      }
    });

    setErrorText(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    try {
      const adminData = await assignLeagueAdmin();
      if (!adminData) return;

      const newLeague = {
        ...leagueDetails,
        leagueAdmins: [adminData.leagueAdmin],
        leagueParticipants: [adminData.leagueParticipant],
      };

      addLeagues(newLeague);
      setModalVisible(false);
    } catch (err) {
      console.error("Error creating league:", err);
    }
  };

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ModalContainer>
          <ModalContent>
            <ModalTitle>Create League</ModalTitle>

            <LabelContainer>
              <Label>League Name </Label>
              {errorText && <ErrorText>{errorText.leagueName}</ErrorText>}
            </LabelContainer>
            <Input
              placeholder="Enter league name"
              placeholderTextColor="#ccc"
              value={leagueDetails.leagueName}
              onChangeText={(value) => handleChange("leagueName", value)}
              style={{ backgroundColor: "#243237" }}
            />
            <LabelContainer>
              <Label>Location </Label>
              {errorText && <ErrorText>{errorText.location}</ErrorText>}
            </LabelContainer>
            <Input
              placeholder="Enter location"
              placeholderTextColor="#ccc"
              value={leagueDetails.location}
              onChangeText={(value) => handleChange("location", value)}
              style={{ backgroundColor: "#243237" }}
            />
            <LabelContainer>
              <Label>Center Name </Label>
              {errorText && <ErrorText>{errorText.centerName}</ErrorText>}
            </LabelContainer>
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
              errorText={errorText.startDate}
            />

            <MaxPlayersPicker
              setLeagueDetails={setLeagueDetails}
              errorText={errorText.maxPlayers}
            />
            <LeagueType
              setLeagueDetails={setLeagueDetails}
              errorText={errorText.leagueType}
            />
            <PrivacyType
              setLeagueDetails={setLeagueDetails}
              errorText={errorText.privacy}
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

  marginLeft: 5,
  fontSize: 14,
});

const LabelContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: 5,
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

const ErrorText = styled.Text({
  color: "red",
  fontSize: 10,
  fontStyle: "italic",
  alignSelf: "flex-end",
});

export default AddLeagueModal;
