import React, { memo } from "react";
import { FlatList, Modal, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";

const PlayerItem = memo(({ player, onSelect, isSelected, isDisabled }) => (
  <PlayerDropDown
    onPress={() => !isDisabled && onSelect(player)}
    style={{
      backgroundColor: isSelected ? "#e6f7ff" : isDisabled ? "#f0f0f0" : "#fff",
    }}
  >
    <PlayerText
      style={{
        fontWeight: isSelected ? "bold" : "normal",
        color: isDisabled ? "#999" : "#000",
      }}
    >
      {player.displayName}
    </PlayerText>
  </PlayerDropDown>
));

const SelectPlayerModal = ({
  dropdownVisible,
  closeDropdown,
  playerArray,
  handleSelect,
  selectedPlayers,
  selected,
}) => {
  const renderItem = ({ item }) => {
    const isSelected = selected?.userId === item.userId;

    // Check if player is already selected by someone else
    const isSelectedByOthers =
      selectedPlayers.team1.some((p) => p?.userId === item.userId) ||
      selectedPlayers.team2.some((p) => p?.userId === item.userId);

    const isDisabled = !isSelected && isSelectedByOthers;

    return (
      <PlayerItem
        player={item}
        onSelect={handleSelect}
        isSelected={isSelected}
        isDisabled={isDisabled}
      />
    );
  };
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={dropdownVisible}
      onRequestClose={closeDropdown}
    >
      <ModalBackground>
        <Dropdown>
          <CloseIconContainer>
            <TouchableOpacity
              onPress={closeDropdown}
              style={{ paddingHorizontal: 10, paddingVertical: 5 }}
            >
              <AntDesign name="closecircleo" size={20} color="red" />
            </TouchableOpacity>
          </CloseIconContainer>
          <FlatList
            data={playerArray}
            renderItem={renderItem}
            keyExtractor={(item) => item.userId}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </Dropdown>
      </ModalBackground>
    </Modal>
  );
};

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

export default SelectPlayerModal;
