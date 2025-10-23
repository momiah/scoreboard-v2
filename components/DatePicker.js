import React, { useEffect, useState } from "react";
import { View, Text, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { calculateEndDate } from "../helpers/calculateEndDate";
import { formatDateForDatePicker } from "../helpers/formatDateForDatePicker";
import { formatDateForStorage } from "../helpers/formatDateForStorage";
import { Ionicons } from "@expo/vector-icons";
import OptionSelector from "./OptionSelector";

const DatePicker = ({ setValue, watch, errorText, hasEndDate = true }) => {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const startDate = watch("startDate");
  const leagueLengthInMonths = watch("leagueLengthInMonths");

  const handleTempDateChange = (selectedDate) => {
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const confirmDateChange = () => {
    if (selectedDate) {
      const formattedStartDate = formatDateForStorage(selectedDate);

      setValue("startDate", formattedStartDate);

      if (hasEndDate) {
        const endDate = calculateEndDate(
          formattedStartDate,
          leagueLengthInMonths
        );
        setValue("endDate", endDate);
      } else {
        setValue("endDate", null);
      }

      setDatePickerVisible(false);
      setSelectedDate(null);
    }
  };

  const showDatePicker = () => {
    if (startDate) {
      const [day, month, year] = startDate.split("-").map(Number);
      setSelectedDate(new Date(year, month - 1, day));
    } else {
      setSelectedDate(new Date());
    }
    setDatePickerVisible(true);
  };

  useEffect(() => {
    if (!hasEndDate) {
      setValue("endDate", null);
      return;
    }

    if (startDate && leagueLengthInMonths) {
      const nextEndDate = calculateEndDate(startDate, leagueLengthInMonths);
      setValue("endDate", nextEndDate);
    }
  }, [hasEndDate, leagueLengthInMonths, startDate, setValue]);

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

      {hasEndDate && (
        <LengthContainer>
          <OptionSelector
            setValue={setValue}
            watch={watch}
            name="leagueLengthInMonths"
            label="Length (Months)"
            options={["1", "2", "3"]}
            containerMarginTop={0}
            roundButtons
          />
        </LengthContainer>
      )}

      <Modal animationType="fade" transparent visible={datePickerVisible}>
        <ModalContainer>
          <DatePickerModalContent>
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              dateFormat="dayofweek day month"
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

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={"#00A2FF"}
              />
              <DisclaimerText>
                Please select a date within the next 3 months.
              </DisclaimerText>
            </View>

            <ButtonContainer>
              <CancelButton onPress={() => setDatePickerVisible(false)}>
                <CancelText>Cancel</CancelText>
              </CancelButton>
              <ConfirmButton onPress={confirmDateChange}>
                <CreateText>Confirm Date</CreateText>
              </ConfirmButton>
            </ButtonContainer>
          </DatePickerModalContent>
        </ModalContainer>
      </Modal>
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
