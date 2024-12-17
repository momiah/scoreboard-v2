import React, { useState, useContext } from "react";
import { Modal, Text, View } from "react-native";
import styled from "styled-components/native";
import { Dimensions } from "react-native";
import { GameContext } from "../../../context/GameContext";
import { sampleLeagues2, sampleLeagues } from "../../Leagues/leagueMocks";

const AddLeagueModal = ({ modalVisible, setModalVisible }) => {
  const [leagueDetails, setLeagueDetails] = useState({
    leagueName: "",
    location: "",
    centerName: "",
    startDate: "",
    endDate: "",
    image: "",
    maxPlayers: 0,
    privacy: "",
  });

  const { addLeagues } = useContext(GameContext);

  const handleChange = (field, value) => {
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      [field]: value,
    }));
  };

  const handleCreate = () => {
    // addLeagues(leagueDetails); // Pass league details to the context function
    addLeagues(sampleLeagues); // Pass league details to the context function
    setModalVisible(false); // Close modal after action
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

export default AddLeagueModal;
