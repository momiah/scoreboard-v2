import React, { useState } from "react";
import { TouchableOpacity, Modal, Dimensions } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const AddPlayTimeModal = ({ isVisible, onClose, onConfirm }) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:00");

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const handleTimeChange = (time, setter, increment) => {
    const [hours, minutes] = time.split(":").map(Number);
    let newMinutes = minutes + increment;

    if (newMinutes >= 60) {
      setter(`${(hours + 1).toString().padStart(2, "0")}:00`);
    } else if (newMinutes < 0) {
      setter(`${(hours - 1).toString().padStart(2, "0")}:45`);
    } else {
      setter(
        `${hours.toString().padStart(2, "0")}:${newMinutes
          .toString()
          .padStart(2, "0")}`
      );
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedDay, startTime, endTime);
    setSelectedDay(null);
    setStartTime("00:00");
    setEndTime("00:00");
  };

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible}>
      <PopupModal>
        <GradientOverlay colors={["#191b37", "#001d2e"]}>
          <ModalContent>
            <CloseIconWrapper>
              <TouchableOpacity onPress={onClose}>
                <AntDesign name="closecircleo" size={30} color="red" />
              </TouchableOpacity>
            </CloseIconWrapper>

            {/* Days */}
            <DaysRow>
              {daysOfWeek.map((day, index) => (
                <DayButton
                  key={index}
                  selected={selectedDay === day}
                  onPress={() => setSelectedDay(day)}
                >
                  <DayButtonText>{day}</DayButtonText>
                </DayButton>
              ))}
            </DaysRow>

            {/* Time Adjustment */}
            <TimeAdjustmentRow>
              <TimePicker>
                <TouchableOpacity
                  onPress={() => handleTimeChange(startTime, setStartTime, -15)}
                >
                  <AntDesign name="minus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TimeText>{startTime}</TimeText>
                <TouchableOpacity
                  onPress={() => handleTimeChange(startTime, setStartTime, 15)}
                >
                  <AntDesign name="plus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </TimePicker>

              <TimePicker>
                <TouchableOpacity
                  onPress={() => handleTimeChange(endTime, setEndTime, -15)}
                >
                  <AntDesign name="minus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TimeText>{endTime}</TimeText>
                <TouchableOpacity
                  onPress={() => handleTimeChange(endTime, setEndTime, 15)}
                >
                  <AntDesign name="plus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </TimePicker>
            </TimeAdjustmentRow>

            {/* Confirm Button */}
            <ButtonContainer>
              <SubmitButton onPress={handleConfirm}>
                <SubmitButtonText>Confirm</SubmitButtonText>
              </SubmitButton>
            </ButtonContainer>
          </ModalContent>
        </GradientOverlay>
      </PopupModal>
    </Modal>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const PopupModal = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.8)",
});

const GradientOverlay = styled(LinearGradient)({
  padding: 2,
  borderRadius: 12,
  opacity: 0.9,
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  padding: 10, // Updated to match your requirement
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "center",
});

const CloseIconWrapper = styled.View({
  width: "100%",
  alignItems: "flex-end",
  marginBottom: 20,
});

const DaysRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  paddingHorizontal: 20,
  marginBottom: 20,
});

const DayButton = styled.TouchableOpacity(({ selected }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: selected ? "#00284b" : "#00152B", // Highlight for selected
  borderWidth: 1,
  borderColor: selected ? "#004eb4" : "#414141",
}));

const DayButtonText = styled.Text({
  color: "#FFFFFF",
  fontSize: 12,
});

const TimeAdjustmentRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  paddingHorizontal: 20,
  marginBottom: 20,
});

const TimePicker = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "45%", // 45% width for two containers
  backgroundColor: "#262626",
  borderRadius: 8,
  padding: 10,
});

const ButtonContainer = styled.View({
  alignItems: "center",
  marginTop: 20,
  marginBottom: 20,
});

const SubmitButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 8,
  width: screenWidth <= 400 ? 250 : 300,
  backgroundColor: "#00A2FF",
});

const SubmitButtonText = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "white",
});

const TimeText = styled.Text({
  color: "#FFFFFF",
  fontSize: 16,
});

export default AddPlayTimeModal;
