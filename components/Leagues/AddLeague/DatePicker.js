import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { calculateEndDate } from "../../../functions/calculateEndDate";
import { formatDateForDisplay } from "../../../functions/formatDateForDisplay";
import { formatDateForStorage } from "../../../functions/formatDateForStorage";

const DatePicker = ({ setLeagueDetails, leagueDetails, errorText }) => {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [leagueLengths, setLeagueLength] = useState(
    leagueDetails.leagueLengthInMonths
  );
  const [tempDate, setTempDate] = useState(null);

  const handleTempDateChange = (selectedDate) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const confirmDateChange = () => {
    if (tempDate) {
      const formattedStartDate = formatDateForStorage(tempDate);

      // Update leagueDetails with start date
      setLeagueDetails((prevDetails) => {
        // Calculate end date based on league length
        const lengthInMonths = prevDetails.leagueLengthInMonths || 1;
        const endDate = calculateEndDate(formattedStartDate, lengthInMonths);

        return {
          ...prevDetails,
          startDate: formattedStartDate,
          endDate,
        };
      });

      setDatePickerVisible(false);
      setTempDate(null);
    }
  };

  // Show the date picker
  const showDatePicker = () => {
    const currentValue = leagueDetails.startDate;

    // Convert the "DD-MM-YYYY" format back to a Date object
    if (currentValue) {
      const [day, month, year] = currentValue.split("-").map(Number);
      setTempDate(new Date(year, month - 1, day));
    } else {
      setTempDate(new Date());
    }

    setDatePickerVisible(true);
  };

  // Handle league length selection
  const handleSelectLeagueLength = (length) => {
    setLeagueLength(length);

    setLeagueDetails((prevDetails) => {
      // Recalculate the end date if start date is already selected
      if (prevDetails.startDate) {
        const endDate = calculateEndDate(prevDetails.startDate, length);

        return {
          ...prevDetails,
          leagueLengthInMonths: length,
          endDate,
        };
      } else {
        return {
          ...prevDetails,
          leagueLengthInMonths: length,
        };
      }
    });
  };

  return (
    <DatePickerContainer>
      {/* Start Date Picker */}
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
            {leagueDetails.startDate
              ? formatDateForDisplay(
                  new Date(
                    leagueDetails.startDate.split("-").reverse().join("-")
                  )
                )
              : "Select Date"}
          </Text>
        </DatePickerButton>
      </DatePickerContent>

      {/* Length Selector */}
      <LengthContainer>
        <Label>Length (Months)</Label>
        <LeagueLengthContainer>
          {["1", "2", "3"].map((length) => (
            <LeagueLengthButton
              key={length}
              onPress={() => handleSelectLeagueLength(length)}
              isSelected={leagueLengths === length}
            >
              <LeagueLengthText isSelected={leagueLengths === length}>
                {length}
              </LeagueLengthText>
            </LeagueLengthButton>
          ))}
        </LeagueLengthContainer>
      </LengthContainer>

      {/* Centered DateTimePicker */}
      {datePickerVisible && (
        <DatePickerModal>
          <DateTimePicker
            value={tempDate || new Date()}
            mode="date"
            display="spinner"
            themeVariant="dark"
            onChange={(event, selectedDate) => {
              handleTempDateChange(selectedDate);
            }}
            minimumDate={new Date()}
            maximumDate={
              new Date(new Date().setMonth(new Date().getMonth() + 3))
            }
          />

          <ButtonContainer>
            <CancelButton>
              <CancelText onPress={() => setDatePickerVisible(false)}>
                Cancel
              </CancelText>
            </CancelButton>
            <ConfirmButton onPress={confirmDateChange}>
              <CreateText>Confirm Date</CreateText>
            </ConfirmButton>
          </ButtonContainer>
        </DatePickerModal>
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

const DatePickerModal = styled(BlurView).attrs({
  intensity: 80,
  tint: "dark",
})({
  position: "absolute",
  top: "110%",
  left: "-3%",
  width: "110%",
  backgroundColor: "rgba(6, 6, 22, 0.7)",
  borderRadius: 50,
  padding: 25,
  zIndex: 1000,
  justifyContent: "center",
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

export default DatePicker;
