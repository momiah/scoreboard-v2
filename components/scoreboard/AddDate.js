import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";

const AddDate = ({
  showDateSelector,
  setShowDateSelector,
  setSelectedDate,
  selectedDate,
}) => {
  const [selectedDay, setSelectedDay] = useState("01");
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedYear, setSelectedYear] = useState("2022");

  const setDate = () => {
    setSelectedDate(`${selectedDay}/${selectedMonth}/${selectedYear}`);
    console.log("selected date", selectedDate);
    setShowDateSelector(false);
  };

  const range = (start, end) => {
    return Array.from({ length: end - start + 1 }, (_, i) =>
      (start + i).toString().padStart(2, "0")
    );
  };

  const days = range(1, 31);
  const months = range(1, 12);
  const years = range(2022, 2030);

  return (
    <Modal visible={showDateSelector} transparent={true} animationType="slide">
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            padding: 20,
            borderRadius: 10,
            alignItems: "center", // Center content horizontally
          }}
        >
          <Text style={{ fontSize: 20 }}>Select Date:</Text>
          <View
            style={{
              flexDirection: "row",
              marginTop: 10,
              justifyContent: "center", // Center content horizontally
              height: 200,
            }}
          >
            <Picker
              selectedValue={selectedDay}
              onValueChange={(itemValue) => setSelectedDay(itemValue)}
              style={{ height: 50, width: 100 }}
            >
              {days.map((day) => (
                <Picker.Item label={day} value={day} key={day} />
              ))}
            </Picker>
            <Picker
              selectedValue={selectedMonth}
              onValueChange={(itemValue) => setSelectedMonth(itemValue)}
              style={{ height: 50, width: 100 }}
            >
              {months.map((month) => (
                <Picker.Item label={month} value={month} key={month} />
              ))}
            </Picker>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(itemValue) => setSelectedYear(itemValue)}
              style={{ height: 50, width: 100 }}
            >
              {years.map((year) => (
                <Picker.Item label={year} value={year} key={year} />
              ))}
            </Picker>
          </View>
          <TouchableOpacity style={{ marginTop: 10 }} onPress={() => setDate()}>
            <Text style={{ fontSize: 18, color: "#007BFF" }}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default AddDate;
