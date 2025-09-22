import React, {
  useContext,
  useState,
  useCallback,
  memo,
  useEffect,
} from "react";
import {
  View,
  FlatList,
  Modal,
  TouchableOpacity,
  Text,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../../context/UserContext";
import { AntDesign } from "@expo/vector-icons";
import { formatDisplayName } from "../../../helpers/formatDisplayName";

// Memoized player item component
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

const SelectPlayer = ({
  onSelectPlayer,
  selectedPlayers,
  borderType,
  team,
  index,
}) => {
  const [selected, setSelected] = useState(null); // Store full player object, not string
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { players } = useContext(UserContext);

  useEffect(() => {
    const externalSelected = selectedPlayers[team]?.[index] || null;
    if (externalSelected?.userId !== selected?.userId) {
      setSelected(externalSelected);
    }
  }, [selectedPlayers, team, index]);

  const playerArray = React.useMemo(
    () =>
      players.map((player) => ({
        // key: player.userId,
        // value: formatDisplayName(player), // Display name
        userId: player.userId,
        firstName: player.firstName,
        lastName: player.lastName,
        username: player.username,
        displayName: formatDisplayName(player),
      })),
    [players]
  );

  // Get border and text direction styles based on borderType
  const borderStyle = React.useMemo(() => {
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
  }, [borderType]);

  const textStyle = React.useMemo(() => {
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
  }, [borderType]);

  const toggleDropdown = useCallback(() => {
    setDropdownVisible(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setDropdownVisible(false);
  }, []);

  const handleSelect = (player) => {
    const isSame = selected?.userId === player.userId;
    const newPlayer = isSame ? null : player;

    setSelected(newPlayer);
    onSelectPlayer(newPlayer); // Pass full player object or null
    if (isSame) return; // Don't close dropdown if deselecting
    closeDropdown();
  };

  // FlatList render item function
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
    <View>
      <PlayerSelectContainer
        onPress={toggleDropdown}
        style={borderStyle}
        hasBorder={borderType !== "none"}
      >
        <PlayerSelect style={textStyle}>
          {selected?.displayName || "Select Player"}
        </PlayerSelect>
      </PlayerSelectContainer>

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
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");

// Styled components
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

export default memo(SelectPlayer);
