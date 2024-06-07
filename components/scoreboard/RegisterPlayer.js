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

const AddPlayer = () => {
  const [selected, setSelected] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const data = [
    { key: "2", value: "Appliances" },
    { key: "3", value: "Cameras" },
    { key: "5", value: "Vegetables" },
    { key: "6", value: "Dairy Products" },
    { key: "7", value: "Drinks" },
  ];

  const handleSelect = (value) => {
    setSelected(value);
    setDropdownVisible(false);
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
              data={data}
              renderItem={({ item }) => (
                <Item onPress={() => handleSelect(item.value)}>
                  <ItemText>{item.value}</ItemText>
                </Item>
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

const Item = styled.TouchableOpacity({
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: "#ccc",
});

const ItemText = styled.Text({
  fontSize: 16,
});

export default AddPlayer;
