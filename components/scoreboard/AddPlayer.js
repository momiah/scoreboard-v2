import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import styled from "styled-components/native";

const AddPlayer = ({ onSelectPlayer }) => {
  const [selected, setSelected] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const players = {
    Mohsin: {
      wins: 0,
      losses: 0,
    },
    Yasin: {
      wins: 0,
      losses: 0,
    },
    Rayyan: {
      wins: 0,
      losses: 0,
    },
    Saiful: {
      wins: 0,
      losses: 0,
    },
    Raqeeb: {
      wins: 0,
      losses: 0,
    },
  };

  const playerArray = Object.keys(players).map((key) => ({
    key: key,
    value: key,
  }));

  const handleSelect = (value) => {
    setSelected(value);
    setDropdownVisible(false);
    onSelectPlayer(value);
  };

  return (
    <View>
      <SelectPlayer onPress={() => setDropdownVisible(true)}>
        <Text>{selected || "Select Player"}</Text>
      </SelectPlayer>

      <Modal
        transparent={true}
        animationType="none"
        visible={dropdownVisible}
        onRequestClose={() => setDropdownVisible(false)}
      >
        <ModalBackground>
          <Dropdown>
            <FlatList
              data={playerArray}
              renderItem={({ item }) => (
                <PlayerDropDown onPress={() => handleSelect(item.value)}>
                  <PlayerText>{item.value}</PlayerText>
                </PlayerDropDown>
              )}
              keyExtractor={(item) => item.key}
            />
          </Dropdown>
        </ModalBackground>
      </Modal>
    </View>
  );
};

const SelectPlayer = styled.Text({
  padding: 20,
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 20,
  width: 130, // Fixed width
});

const ModalBackground = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
});

const Dropdown = styled.View({
  width: 200,
  maxHeight: 300,
  backgroundColor: "#fff",
  borderRadius: 5,
  overflow: "hidden",
});

const PlayerDropDown = styled.TouchableOpacity({
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: "#ccc",
});

const PlayerText = styled.Text({
  fontSize: 16,
});

export default AddPlayer;
