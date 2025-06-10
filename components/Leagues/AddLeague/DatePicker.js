import React, { useState } from "react";
import { View, Text, Modal, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import styled from "styled-components/native";
import { PlatformBlurView as BlurView } from "../../../components/PlatformBlurView";
import { calculateEndDate } from "../../../helpers/calculateEndDate";
import { formatDateForDatePicker } from "../../../helpers/formatDateForDatePicker";
import { formatDateForStorage } from "../../../helpers/formatDateForStorage";
import { Ionicons } from "@expo/vector-icons";

const platformDisplay = Platform.OS === "ios" ? "spinner" : "default";

const DatePicker = ({ setValue, watch, errorText }) => {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState(null);

  const startDate = watch("startDate");
  const leagueLengthInMonths = watch("leagueLengthInMonths");

  const handleTempDateChange = (selectedDate) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const confirmDateChange = () => {
    if (tempDate) {
      const formattedStartDate = formatDateForStorage(tempDate);
      const endDate = calculateEndDate(
        formattedStartDate,
        leagueLengthInMonths
      );

      setValue("startDate", formattedStartDate);
      setValue("endDate", endDate);

      setDatePickerVisible(false);
      setTempDate(null);
    }
  };

  const showDatePicker = () => {
    if (startDate) {
      const [day, month, year] = startDate.split("-").map(Number);
      setTempDate(new Date(year, month - 1, day));
    } else {
      setTempDate(new Date());
    }
    setDatePickerVisible(true);
  };

  const handleSelectLeagueLength = (length) => {
    setValue("leagueLengthInMonths", length);

    if (startDate) {
      const endDate = calculateEndDate(startDate, length);
      setValue("endDate", endDate);
    }
  };

  return (
    <DatePickerContainer>
      <DatePickerContent>
        <LabelContainer>
          <Label>Start Date</Label>
          {errorText && <ErrorText>{errorText}</ErrorText>}
        </LabelContainer>
        <DatePickerButton
          isVisible={datePickerVisible}
          onPress={showDatePicker}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            {startDate
              ? formatDateForDatePicker(
                  new Date(startDate.split("-").reverse().join("-"))
                )
              : "Select Date"}
          </Text>
        </DatePickerButton>
      </DatePickerContent>

      <LengthContainer>
        <Label>Length (Months)</Label>
        <LeagueLengthContainer>
          {["1", "2", "3"].map((length) => (
            <LeagueLengthButton
              key={length}
              onPress={() => handleSelectLeagueLength(length)}
              isSelected={leagueLengthInMonths === length}
            >
              <LeagueLengthText isSelected={leagueLengthInMonths === length}>
                {length}
              </LeagueLengthText>
            </LeagueLengthButton>
          ))}
        </LeagueLengthContainer>
      </LengthContainer>

      {Platform.OS === "ios" ? (
        <Modal animationType="fade" transparent visible={datePickerVisible}>
          <ModalContainer>
            <DatePickerModalContent>
              <DateTimePicker
                value={tempDate || new Date()}
                mode="date"
                display={platformDisplay}
                themeVariant="dark"
                onChange={(_, selected) => {
                  // always stash the latest
                  if (selected) setTempDate(selected);
                }}
                minimumDate={new Date()}
                maximumDate={
                  new Date(new Date().setMonth(new Date().getMonth() + 3))
                }
              />

              {/* … info text … */}

              <ButtonContainer>
                <CancelButton
                  onPress={() => {
                    setTempDate(null);
                    setDatePickerVisible(false);
                  }}
                >
                  <CancelText>Cancel</CancelText>
                </CancelButton>

                <ConfirmButton
                  onPress={() => {
                    if (!tempDate) return;
                    // apply exactly like our confirmDateChange()
                    const formatted = formatDateForStorage(tempDate);
                    const endDate = calculateEndDate(
                      formatted,
                      leagueLengthInMonths
                    );
                    setValue("startDate", formatted);
                    setValue("endDate", endDate);

                    setTempDate(null);
                    setDatePickerVisible(false);
                  }}
                >
                  <CreateText>Confirm Date</CreateText>
                </ConfirmButton>
              </ButtonContainer>
            </DatePickerModalContent>
          </ModalContainer>
        </Modal>
      ) : (
        // Android native
        datePickerVisible && (
          <DateTimePicker
            value={tempDate || new Date()}
            mode="date"
            display={platformDisplay}
            themeVariant="dark"
            onChange={(event, selected) => {
              if (event.type === "dismissed") {
                // user cancelled
                setTempDate(null);
                setDatePickerVisible(false);
              } else if (event.type === "set") {
                // user picked—apply immediately to avoid async state lag
                const picked = selected || tempDate;
                const formatted = formatDateForStorage(picked);
                const endDate = calculateEndDate(
                  formatted,
                  leagueLengthInMonths
                );

                setValue("startDate", formatted);
                setValue("endDate", endDate);

                setTempDate(null);
                setDatePickerVisible(false);
              }
            }}
            minimumDate={new Date()}
            maximumDate={
              new Date(new Date().setMonth(new Date().getMonth() + 3))
            }
          />
        )
      )}
    </DatePickerContainer>
  );
};

const DatePickerContainer = styled.View({
  flexDirection: "row",
  gap: 10,
  padding: 5,
  margin: 5,
  justifyContent: "space-between",
  alignItems: "center",
});

const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const DatePickerModalContent = styled.View({
  width: "90%",
  padding: 20,
  backgroundColor: "rgba(2, 13, 24, 0.9)",
  borderRadius: 20,
  alignItems: "center",
});

const DatePickerButton = styled.TouchableOpacity(({ isVisible }) => ({
  width: "100%",
  padding: 10,
  backgroundColor: isVisible ? "#003366" : "#243237",
  borderRadius: 5,
  alignItems: "center",
}));

const DatePickerContent = styled.View({
  flex: 1,
  alignItems: "flex-start",
});

const LengthContainer = styled.View({
  flex: 1,
});

const Label = styled.Text({
  color: "#ccc",
});

const LabelContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: 5,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  marginTop: 15,
});

const CancelButton = styled.TouchableOpacity({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 10,
});

const CancelText = styled.Text({
  color: "red",
});

const CreateText = styled.Text({
  color: "white",
});

const ConfirmButton = styled.TouchableOpacity({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  borderRadius: 5,
  backgroundColor: "#00A2FF",
});

const LeagueLengthContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
});

const LeagueLengthButton = styled.TouchableOpacity(({ isSelected }) => ({
  flex: 1,
  marginHorizontal: 5,
  aspectRatio: 1,
  borderRadius: 9999,
  backgroundColor: isSelected ? "#00284b" : "#00152B",
  borderWidth: 1,
  borderColor: isSelected ? "#004eb4" : "#414141",
  alignItems: "center",
  justifyContent: "center",
}));

const LeagueLengthText = styled.Text(({ isSelected }) => ({
  fontSize: 10,
  fontWeight: "bold",
  textAlign: "center",
  color: isSelected ? "white" : "#7b7b7b",
}));

const ErrorText = styled.Text({
  color: "red",
  fontSize: 10,
  fontStyle: "italic",
});

const DisclaimerText = styled.Text({
  color: "white",
  fontStyle: "italic",
  fontSize: 12,
});

export default DatePicker;
