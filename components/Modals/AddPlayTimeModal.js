import React, { useState, useContext, useEffect } from "react";
import { TouchableOpacity, Modal, Dimensions } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Popup from "../popup/Popup";
import { PopupContext } from "../../context/PopupContext";

const AddPlayTimeModal = ({ isVisible, onClose, onConfirm, defaultValues }) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:00");

  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);

  const daysOfWeek = [
    "Mondays",
    "Tuesdays",
    "Wednesdays",
    "Thursdays",
    "Fridays",
    "Saturdays",
    "Sundays",
  ];

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");
  };

  // Apply default values when modal is opened
  useEffect(() => {
    if (defaultValues) {
      setSelectedDay(defaultValues.day || null);
      setStartTime(defaultValues.startTime || "00:00");
      setEndTime(defaultValues.endTime || "00:00");
    } else {
      setSelectedDay(null);
      setStartTime("00:00");
      setEndTime("00:00");
    }
  }, [defaultValues, isVisible]);

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
    if (!selectedDay) {
      alert("Please select a day."); // Alert if no day is selected
      return;
    }

    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    if (endTotalMinutes <= startTotalMinutes) {
      handleShowPopup("End time must be after the start time.");
      return;
    }

    onConfirm(selectedDay, startTime, endTime);
    setSelectedDay(null);
    setStartTime("00:00");
    setEndTime("00:00");
  };

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible}>
      <Popup
        visible={showPopup}
        message={popupMessage}
        onClose={handleClosePopup}
        type="error"
      />
      <ModalContainer>
        <GradientOverlay colors={["#191b37", "#001d2e"]}>
          <ModalContent>
            <CloseIconWrapper>
              <TouchableOpacity onPress={onClose}>
                <AntDesign name="closecircleo" size={30} color="red" />
              </TouchableOpacity>
            </CloseIconWrapper>

            {/* Days */}
            <DaysRow>
              {daysOfWeek.map((day, index) => {
                const shortHandDay = day.slice(0, 3);
                return (
                  <DayButton
                    key={index}
                    selected={selectedDay === day}
                    onPress={() => setSelectedDay(day)}
                  >
                    <DayButtonText>{shortHandDay}</DayButtonText>
                  </DayButton>
                );
              })}
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
              <SubmitButton
                onPress={handleConfirm}
                disabled={!selectedDay} // Disable if no day is selected
              >
                <SubmitButtonText disabled={!selectedDay}>
                  Confirm
                </SubmitButtonText>
              </SubmitButton>
            </ButtonContainer>
          </ModalContent>
        </GradientOverlay>
      </ModalContainer>
    </Modal>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const ModalContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
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

const SubmitButton = styled.TouchableOpacity(({ disabled }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 8,
  width: screenWidth <= 400 ? 250 : 300,
  backgroundColor: disabled ? "#444" : "#00A2FF", // Greyed out when disabled
}));

const SubmitButtonText = styled.Text(({ disabled }) => ({
  fontSize: 16,
  fontWeight: "bold",
  color: disabled ? "#888" : "white", // Adjust color when disabled
}));

const TimeText = styled.Text({
  color: "#FFFFFF",
  fontSize: 16,
});

export default AddPlayTimeModal;
