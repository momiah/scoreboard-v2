import React from "react";
import { TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";

import DatePicker from "../DatePicker";

const TIME_STEP_MINUTES = 15;
const MINUTES_IN_DAY = 24 * 60;

const pad = (n: number): string => n.toString().padStart(2, "0");

export const shiftMatchTime = (time: string, deltaMinutes: number): string => {
  const [hours, minutes] = time.split(":").map(Number);
  let total = hours * 60 + minutes + deltaMinutes;
  total = ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

export interface MatchDateTimeValues {
  startDate: string;
  startTime: string;
}

interface MatchDateTimeFieldsProps<T extends MatchDateTimeValues> {
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  dateError?: string;
  playoffStartDate?: Date | null;
  maxDate?: Date | null;
  testIDPrefix: string;
}

const MatchDateTimeFields = <T extends MatchDateTimeValues>({
  setValue,
  watch,
  dateError,
  playoffStartDate,
  maxDate,
  testIDPrefix,
}: MatchDateTimeFieldsProps<T>) => {
  const setField = setValue as unknown as UseFormSetValue<MatchDateTimeValues>;
  const startTime = (watch as unknown as UseFormWatch<MatchDateTimeValues>)(
    "startTime",
  );

  return (
    <>
      <DatePicker
        setValue={setValue}
        watch={watch}
        errorText={dateError}
        hasEndDate={false}
        labelStyle={{ marginLeft: -5, fontWeight: "bold" }}
        playoffStartDate={playoffStartDate}
        maxDate={maxDate}
      />

      <Label style={{ marginTop: 15, marginLeft: 5 }}>Start Time</Label>
      <TimeStepper>
        <TouchableOpacity
          testID={`${testIDPrefix}-start-minus`}
          onPress={() =>
            setField("startTime", shiftMatchTime(startTime, -TIME_STEP_MINUTES))
          }
        >
          <AntDesign name="minus" size={20} color="#ffffff" />
        </TouchableOpacity>
        <TimeText>{startTime}</TimeText>
        <TouchableOpacity
          testID={`${testIDPrefix}-start-plus`}
          onPress={() =>
            setField("startTime", shiftMatchTime(startTime, TIME_STEP_MINUTES))
          }
        >
          <AntDesign name="plus" size={20} color="#ffffff" />
        </TouchableOpacity>
      </TimeStepper>
    </>
  );
};

export default MatchDateTimeFields;

const Label = styled.Text({
  color: "#ccc",
  alignSelf: "flex-start",
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 6,
});

const TimeStepper = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  height: 40,
  borderRadius: 6,
  paddingHorizontal: 16,
  marginBottom: 10,
  marginHorizontal: 10,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
});

const TimeText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
