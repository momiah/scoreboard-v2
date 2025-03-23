import React, { useContext, useState, useEffect } from "react";
import { View, FlatList, Modal } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../../context/UserContext";
import { AntDesign } from "@expo/vector-icons";
import { Dimensions } from "react-native";

const SelectPlayer = ({ onSelectPlayer, selectedPlayers, borderType }) => {
  const [selected, setSelected] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { players } = useContext(UserContext);

  const playerArray = players.map((player) => ({
    key: player.userId, // Assuming each player has a unique ID
    value: player.id, // Adjust based on the structure of your player data
  }));

  const handleSelect = (value) => {
    setSelected(value);
    setDropdownVisible(false);
    onSelectPlayer(value);
  };

  const borderDirection = (borderType) => {
    switch (borderType) {
      case "topLeft":
        return { borderTopLeftRadius: 8 };
      case "topRight":
        return { borderTopRightRadius: 8 };
      case "bottomLeft":
        return { borderBottomLeftRadius: 8 };
      case "bottomRight":
        return { borderBottomRightRadius: 8 };
      default:
        return {};
    }
  };
  const textDirection = (borderType) => {
    switch (borderType) {
      case "topLeft":
        return { textAlign: "left" };
      case "topRight":
        return { textAlign: "right" };
      case "bottomLeft":
        return { textAlign: "left" };
      case "bottomRight":
        return { textAlign: "right" };
      default:
        return {};
    }
  };

  return (
    <View>
      <PlayerSelectContainer
        onPress={() => setDropdownVisible(true)}
        style={borderDirection(borderType)}
        hasBorder={borderType === "none" ? false : true}
      >
        <PlayerSelect style={textDirection(borderType)}>
          {selected || "Select Player"}
        </PlayerSelect>
      </PlayerSelectContainer>

      <Modal
        transparent={true}
        animationType="none"
        visible={dropdownVisible}
        onRequestClose={() => setDropdownVisible(false)}
      >
        <ModalBackground>
          <Dropdown>
            <CloseIconContainer>
              <AntDesign
                onPress={() => setDropdownVisible(false)}
                name="closecircleo"
                size={20}
                color="red"
              />
            </CloseIconContainer>
            <FlatList
              data={playerArray}
              renderItem={({ item }) => {
                const isDisabled =
                  selectedPlayers.team1.includes(item.value) ||
                  selectedPlayers.team2.includes(item.value);

                return (
                  <PlayerDropDown
                    onPress={() => !isDisabled && handleSelect(item.value)}
                    disabled={isDisabled}
                    style={{ backgroundColor: isDisabled ? "#ccc" : "#fff" }}
                  >
                    <PlayerText>{item.value}</PlayerText>
                  </PlayerDropDown>
                );
              }}
              keyExtractor={(item) => item.key}
            />
          </Dropdown>
        </ModalBackground>
      </Modal>
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");
const PlayerSelectContainer = styled.TouchableOpacity(({ hasBorder }) => ({
  width: screenWidth <= 400 ? 110 : 110,
  alignItems: "center",
  border: hasBorder ? "1px solid #262626" : "none",
}));

const PlayerSelect = styled.Text({
  fontSize: 12,
  color: "#999",
  width: screenWidth <= 400 ? 110 : 130,
  padding: screenWidth <= 400 ? 17 : 20,
  textAlign: "center",
});

const ModalBackground = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
});

const CloseIconContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "flex-end",
  padding: 5,
  backgroundColor: "#fff",
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

export default SelectPlayer;
