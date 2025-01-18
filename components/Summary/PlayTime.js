import React, { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import AddPlayTimeModal from "../Modals/AddPlayTimeModal"; // Import the new modal component

const PlayTime = () => {
  const [playTimes, setPlayTimes] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleAddPlayTime = () => {
    setIsModalVisible(true);
  };

  const handleConfirmPlayTime = (day, startTime, endTime) => {
    setPlayTimes((prevTimes) => [...prevTimes, { day, startTime, endTime }]);
    setIsModalVisible(false);
  };

  return (
    <PlayTimeContainer>
      <SectionTitle>Playtime</SectionTitle>

      {/* Rows for PlayTimes */}
      {playTimes.map((playTime, index) => (
        <Row key={index}>
          <DayText flex={2}>{playTime.day}</DayText>
          <TimeText flex={1}>{playTime.startTime}</TimeText>
          <TimeText flex={1}>{playTime.endTime}</TimeText>
        </Row>
      ))}

      {/* Default Plus Row */}
      <Row>
        <DisabledText>Add Playtime</DisabledText>
        <IconWrapper>
          <IconButton onPress={handleAddPlayTime}>
            <AntDesign name="plus" size={24} color="#6C63FF" />
          </IconButton>
        </IconWrapper>
      </Row>

      {/* Modal */}
      <AddPlayTimeModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleConfirmPlayTime}
      />
    </PlayTimeContainer>
  );
};

const PlayTimeContainer = styled.View({
  marginBottom: 30,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
  marginBottom: 10,
});

const Row = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 15,
});

const DayText = styled.Text(({ flex }) => ({
  flex,
  color: "#FFFFFF",
  textAlign: "center",
  fontSize: 16,
}));

const TimeText = styled.Text(({ flex }) => ({
  flex,
  color: "#FFFFFF",
  textAlign: "center",
  fontSize: 16,
}));

const IconWrapper = styled.View({
  width: 60,
  flexDirection: "row",
  justifyContent: "space-between",
});

const IconButton = styled.TouchableOpacity({
  padding: 5,
});

const DisabledText = styled.Text({
  flex: 1,
  color: "#888",
  fontSize: 14,
});

export default PlayTime;
