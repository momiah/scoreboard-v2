import React, { useContext, useState, useEffect } from "react";
import { TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import AddPlayTimeModal from "../Modals/AddPlayTimeModal";
import SubHeader from "../SubHeader";
import { LeagueContext } from "../../context/LeagueContext";
import { AntDesign } from "@expo/vector-icons";

const PlayTime = ({ userRole }) => {
  const [playTimes, setPlayTimes] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPlayTime, setSelectedPlayTime] = useState(null); // For editing
  const { addPlaytime, leagueById, deletePlaytime } = useContext(LeagueContext); // Ensure `deletePlaytime` is implemented in context

  useEffect(() => {
    if (leagueById?.playingTime) {
      setPlayTimes(leagueById.playingTime);
    }
  }, [leagueById]);

  const handleAddPlayTime = () => {
    setSelectedPlayTime(null); // Clear selected playtime for adding new
    setIsModalVisible(true);
  };

  const handleConfirmPlayTime = (day, startTime, endTime) => {
    const newPlayTime = { day, startTime, endTime };

    if (selectedPlayTime) {
      // Update existing playtime
      setPlayTimes((prevTimes) =>
        prevTimes.map((time) =>
          time === selectedPlayTime ? newPlayTime : time
        )
      );
      addPlaytime([newPlayTime], selectedPlayTime);
    } else {
      // Add new playtime
      setPlayTimes((prevTimes) => [...prevTimes, newPlayTime]);
      addPlaytime([newPlayTime]);
    }

    setIsModalVisible(false);
  };

  const handleDeletePlayTime = (playTime) => {
    // Delete locally
    setPlayTimes((prevTimes) => prevTimes.filter((time) => time !== playTime));

    // Delete from Firebase
    deletePlaytime(playTime);
  };

  const handleEditPlayTime = (playTime) => {
    setSelectedPlayTime(playTime);
    setIsModalVisible(true);
  };

  const PlayTimeRow = ({ playTime, isAdmin }) => {
    const [showActions, setShowActions] = useState(false);

    return isAdmin ? (
      <RowAdminButton onPress={() => setShowActions(!showActions)}>
        {showActions ? (
          <ActionContainer>
            <EditButton onPress={() => handleEditPlayTime(playTime)}>
              <ActionText>Edit</ActionText>
            </EditButton>

            <TouchableOpacity onPress={() => handleDeletePlayTime(playTime)}>
              <AntDesign name="delete" size={25} color="red" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowActions(false)}>
              <AntDesign name="closecircleo" size={25} color="red" />
            </TouchableOpacity>
          </ActionContainer>
        ) : (
          <>
            <DayText flex={2}>{playTime.day}</DayText>
            <TimeText flex={1}>{playTime.startTime}</TimeText>
            <TimeText flex={1}>{playTime.endTime}</TimeText>
          </>
        )}
      </RowAdminButton>
    ) : (
      <Row>
        <DayText flex={2}>{playTime.day}</DayText>
        <TimeText flex={1}>{playTime.startTime}</TimeText>
        <TimeText flex={1}>{playTime.endTime}</TimeText>
      </Row>
    );
  };

  return (
    <PlayTimeContainer>
      <SubHeader
        title="Play Time"
        onIconPress={handleAddPlayTime}
        showIcon={userRole === "admin"}
      />

      {playTimes.length > 0 ? (
        playTimes.map((playTime, index) => (
          <PlayTimeRow
            key={index}
            playTime={playTime}
            isAdmin={userRole === "admin"}
          />
        ))
      ) : userRole === "admin" ? (
        <DisabledText>Please add playtime for the league.</DisabledText>
      ) : (
        <DisabledText>Admin has not added playtime yet.</DisabledText>
      )}

      {/* Modal */}
      <AddPlayTimeModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onConfirm={handleConfirmPlayTime}
        defaultValues={selectedPlayTime} // Pass selected playtime for editing
      />
    </PlayTimeContainer>
  );
};

const PlayTimeContainer = styled.View({
  marginBottom: 30,
});

const baseRowStyles = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 5,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  padding: 10,
  borderRadius: 5,
  border: "1px solid rgb(26, 28, 54)",
};

const Row = styled.View(baseRowStyles);

const RowAdminButton = styled.TouchableOpacity(baseRowStyles);

const DayText = styled.Text(({ flex }) => ({
  flex,
  color: "#FFFFFF",
  fontSize: 16,
}));

const TimeText = styled.Text(({ flex }) => ({
  flex,
  color: "#FFFFFF",
  textAlign: "center",
  fontSize: 16,
}));

const ActionContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
});

const buttonStyles = {
  width: "70%",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 5,
  marginHorizontal: 5,
  borderRadius: 5,
};

const EditButton = styled.TouchableOpacity({
  ...buttonStyles,
  backgroundColor: "#00A2FF",
});

const ActionText = styled.Text({
  color: "#FFF",
  fontSize: 14,
});

const DisabledText = styled.Text({
  flex: 1,
  color: "#888",
  fontSize: 14,
});

export default PlayTime;
