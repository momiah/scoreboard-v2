import React, { memo, useMemo } from "react";
import { Modal, FlatList, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign } from "@expo/vector-icons";
import { Player } from "@shared/types";

interface SelectPlayerModalProps {
  dropdownVisible: boolean;
  closeDropdown: () => void;
  playerArray: Player[];
  handleSelect: (player: Player) => void;
  selectedPlayers: Record<string, (Player | null)[]>;
  selected: Player | null;
}

interface PlayerItemProps {
  player: Player;
  onSelect: (player: Player) => void;
  isSelected: boolean;
  isDisabled: boolean;
}

const PlayerItem = memo<PlayerItemProps>(
  ({ player, onSelect, isSelected, isDisabled }) => (
    <PlayerDropDown
      onPress={() => !isDisabled && onSelect(player)}
      disabled={isDisabled}
    >
      <PlayerText isSelected={isSelected} isDisabled={isDisabled}>
        {player.displayName}
      </PlayerText>
    </PlayerDropDown>
  ),
);

const SelectPlayerModal = memo<SelectPlayerModalProps>(
  ({
    dropdownVisible,
    closeDropdown,
    playerArray,
    handleSelect,
    selectedPlayers,
    selected,
  }) => {
    const sortedPlayers = useMemo(
      () =>
        [...playerArray].sort((a, b) =>
          (a.displayName ?? "").localeCompare(b.displayName ?? ""),
        ),
      [playerArray],
    );

    const renderItem = ({ item }: { item: Player }) => {
      const isSelected = selected?.userId === item.userId;
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
        animationType="slide"
        transparent
        visible={dropdownVisible}
        onRequestClose={closeDropdown}
      >
        <MenuOverlay intensity={50} tint="dark">
          <MenuContent>
            <MenuHeader>
              <MenuTitle>Select Player</MenuTitle>
              <TouchableOpacity onPress={closeDropdown}>
                <AntDesign name="closecircleo" size={30} color="red" />
              </TouchableOpacity>
            </MenuHeader>

            <FlatList
              data={sortedPlayers}
              renderItem={renderItem}
              keyExtractor={(item) => item.userId}
              scrollEnabled
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </MenuContent>
        </MenuOverlay>
      </Modal>
    );
  },
);

SelectPlayerModal.displayName = "SelectPlayerModal";

const MenuOverlay = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "flex-end",
});

const MenuContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  maxHeight: "80%",
});

const MenuHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: "#1a2b3d",
});

const MenuTitle = styled.Text({
  fontSize: 20,
  fontWeight: "600",
  color: "white",
});

const PlayerDropDown = styled.TouchableOpacity({
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: "#1a2b3d",
});

interface PlayerTextProps {
  isSelected: boolean;
  isDisabled: boolean;
}

const PlayerText = styled.Text<PlayerTextProps>(
  ({ isSelected, isDisabled }: PlayerTextProps) => ({
    fontSize: 16,
    fontWeight: isSelected ? "700" : "500",
    color: isDisabled ? "#555" : isSelected ? "#00A2FF" : "#fff",
  }),
);

export default memo(SelectPlayerModal);
