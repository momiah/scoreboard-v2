import React, { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import AddPlayTimeModal from "../Modals/AddPlayTimeModal"; // Import the new modal component
import SubHeader from "../SubHeader";

const PlayTime = () => {
  const [playTimes, setPlayTimes] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleAddPlayTime = () => {
    setIsModalVisible(true);
    console.log("Add Play Time");
  };

  const handleConfirmPlayTime = (day, startTime, endTime) => {
    setPlayTimes((prevTimes) => [...prevTimes, { day, startTime, endTime }]);
    setIsModalVisible(false);
  };

  return (
    <PlayTimeContainer>
      <SubHeader title="Play Time" onIconPress={handleAddPlayTime} showIcon />

      {/* Rows for PlayTimes */}
      {playTimes.map((playTime, index) => (
        <Row key={index}>
          <DayText flex={2}>{playTime.day}</DayText>
          <TimeText flex={1}>{playTime.startTime}</TimeText>
          <TimeText flex={1}>{playTime.endTime}</TimeText>
        </Row>
      ))}

      {playTimes.length === 0 && (
        <DisabledText>Please add play times to activate league</DisabledText>
      )}

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
  //   border: "1px solid #ffffff",
});

const Row = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 5,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  padding: 10,
  borderRadius: 5,
  border: "1px solid rgb(26, 28, 54)",
});

const DayText = styled.Text(({ flex }) => ({
  flex,
  color: "#FFFFFF",
  //   textAlign: "center",
  fontSize: 16,
}));

const TimeText = styled.Text(({ flex }) => ({
  flex,
  color: "#FFFFFF",
  textAlign: "center",
  fontSize: 16,
}));

const DisabledText = styled.Text({
  flex: 1,
  color: "#888",
  fontSize: 14,
});

export default PlayTime;
