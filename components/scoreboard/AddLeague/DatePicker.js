import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import styled from "styled-components/native";

const DatePicker = ({ setLeagueDetails, leagueDetails }) => {
  const [datePickerVisible, setDatePickerVisible] = useState({
    field: null,
    visible: false,
  });
  const [pickerInitialized, setPickerInitialized] = useState(false);

  const [tempDate, setTempDate] = useState(null);

  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();

    // Add suffix for day
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";

    return `${day}${suffix} ${month} ${year}`;
  };

  const handleTempDateChange = (selectedDate) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const confirmDateChange = () => {
    if (tempDate) {
      const formattedDate = formatDate(tempDate);
      setLeagueDetails((prevDetails) => ({
        ...prevDetails,
        [datePickerVisible.field]: formattedDate,
      }));
      setDatePickerVisible({ field: null, visible: false });
      setTempDate(null);
      setPickerInitialized(false);
    }
  };

  const showDatePicker = (field) => {
    console.log(`Opening date picker for ${field}`);
    const currentValue = leagueDetails[field];
    setTempDate(currentValue ? new Date(currentValue) : new Date());
    setDatePickerVisible({ field, visible: true });

    // Set a timeout to initialize the picker
    setPickerInitialized(false);
    setTimeout(() => {
      setPickerInitialized(true); // Mark picker as initialized after a short delay
    }, 50); // Adjust the delay as needed
  };

  return (
    <DatePickerContainer>
      {/* Start Date */}
      <DatePickerContent>
        <Label>Start Date</Label>
        <TouchableOpacity
          onPress={() => showDatePicker("startDate")}
          style={{
            width: "100%",
            padding: 10,
            backgroundColor:
              datePickerVisible.field === "startDate" &&
              datePickerVisible.visible
                ? "#003366" // Highlight dark blue
                : "#262626", // Default background color
            borderRadius: 5,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            {leagueDetails.startDate || "Select Date"}
          </Text>
        </TouchableOpacity>
      </DatePickerContent>

      {/* End Date */}
      <DatePickerContent>
        <Label>End Date</Label>
        <TouchableOpacity
          onPress={() => showDatePicker("endDate")}
          style={{
            width: "100%",
            padding: 10,
            backgroundColor:
              datePickerVisible.field === "endDate" && datePickerVisible.visible
                ? "#003366" // Highlight dark blue
                : "#262626", // Default background color
            borderRadius: 5,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", textAlign: "center" }}>
            {leagueDetails.endDate || "Select Date"}
          </Text>
        </TouchableOpacity>
      </DatePickerContent>

      {/* Centered DateTimePicker */}
      {datePickerVisible.visible && (
        <View
          style={{
            position: "absolute",
            top: "110%",
            left: "-3%",
            width: "110%",
            backgroundColor: "rgba(2, 13, 24, 1)",
            borderRadius: 10,
            padding: 30,
            zIndex: 1000,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/** Ensure DateTimePicker initializes first */}
          <DateTimePicker
            value={tempDate || new Date()}
            mode="date"
            display="spinner"
            themeVariant="dark"
            onChange={(event, selectedDate) => {
              handleTempDateChange(selectedDate);
              setPickerInitialized(true); // Mark picker as initialized
            }}
          />

          {/* Render Buttons After DateTimePicker */}
          {pickerInitialized && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {/* Confirm Button */}
              <ButtonContainer>
                <CancelButton>
                  <CancelText
                    onPress={() =>
                      setDatePickerVisible({ field: null, visible: false })
                    }
                  >
                    Cancel
                  </CancelText>
                </CancelButton>
                <ConfirmButton onPress={confirmDateChange}>
                  <CreateText>Confirm Date</CreateText>
                </ConfirmButton>
              </ButtonContainer>
            </View>
          )}
        </View>
      )}
    </DatePickerContainer>
  );
};

const DatePickerContainer = styled.View({
  flexDirection: "row",
  gap: 10,
  padding: 5,
  justifyContent: "space-between",
});

const DatePickerContent = styled.View({
  flex: 1,
  alignItems: "flex-start",
});

const Label = styled.Text({
  color: "#ccc",
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

export default DatePicker;
