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

  const [leagueDetails, setLeagueDetails] = useState({
    leagueParticipants: [],
    leagueTeams: [],
    leagueAdmins: [],
    games: [],
    leagueType: "",
    prizeType: "",
    entryFee: 0,
    currencyType: "",
    image: "",
    leagueName: "",
    leagueDescription: "",
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

  useEffect(() => {
    assignLeagueAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignLeagueAdmin = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        console.log("No userId found in AsyncStorage.");
        return;
      }

      const userInfo = await getUserById(userId);

      // Create fresh profile details with only XP preserved
      const initialProfileDetail = {
        XP: userInfo.profileDetail?.XP || 0, // Only keep XP
        averagePointDifference: 0,
        currentStreak: { count: 0, type: null },
        demonWin: 0,
        highestLossStreak: 0,
        highestWinStreak: 0,
        id: userInfo.username,
        lastActive: "",
        memberSince: userInfo.profileDetail?.memberSince || "",
        numberOfGamesPlayed: 0,
        numberOfLosses: 0,
        numberOfWins: 0,
        pointEfficiency: 0,
        prevGameXP: 0,
        resultLog: [],
        totalPointDifference: 0,
        totalPointEfficiency: 0,
        totalPoints: 0,
        userId: userInfo.userId,
        winPercentage: 0,
        winStreak3: 0,
        winStreak5: 0,
        winStreak7: 0,
      };

      setLeagueDetails((prevDetails) => ({
        ...prevDetails,
        leagueAdmins: [
          ...prevDetails.leagueAdmins,
          { userId: userInfo.userId, username: userInfo.username },
        ],
        leagueParticipants: [
          ...prevDetails.leagueParticipants,
          {
            id: userInfo.username,
            userId: userInfo.userId,
            ...initialProfileDetail,
          },
        ],
      }));
    } catch (error) {
      console.error("Error assigning league admin:", error);
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

    // Create error object
    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!leagueDetails[field]) {
        newErrors[field] = "required";
      }
    });

    setErrorText(newErrors);

    // Check if any errors exist
    if (Object.values(newErrors).some((error) => error)) {
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
