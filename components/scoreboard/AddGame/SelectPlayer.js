import React, {
  useContext,
  useState,
  useCallback,
  memo,
  useEffect,
} from "react";
import { View, Dimensions } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../../context/UserContext";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import SelectPlayerModal from "../../Modals/SelectPlayerModal";

const SelectPlayer = ({
  onSelectPlayer,
  selectedPlayers,
  borderType,
  team,
  index,
  readonly = false,
  presetPlayer = null,
}) => {
  const [selected, setSelected] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { players } = useContext(UserContext);

  useEffect(() => {
    if (readonly && presetPlayer) {
      setSelected(presetPlayer);
    } else {
      const externalSelected = selectedPlayers[team]?.[index] || null;
      if (externalSelected?.userId !== selected?.userId) {
        setSelected(externalSelected);
      }
    }
  }, [selectedPlayers, team, index, readonly, presetPlayer]);

  const playerArray = React.useMemo(
    () =>
      players.map((player) => ({
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
    if (!readonly) {
      // Only allow dropdown if not readonly
      setDropdownVisible(true);
    }
  }, [readonly]);

  const closeDropdown = useCallback(() => {
    setDropdownVisible(false);
  }, []);

  const handleSelect = (player) => {
    const isSame = selected?.userId === player.userId;
    const newPlayer = isSame ? null : player;

    setSelected(newPlayer);
    onSelectPlayer(newPlayer);
    if (isSame) return;
    closeDropdown();
  };

  return (
    <View>
      <PlayerSelectContainer
        onPress={toggleDropdown}
        style={borderStyle}
        hasBorder={borderType !== "none"}
        readonly={readonly} // Pass readonly for styling
      >
        <PlayerSelect style={textStyle} readonly={readonly}>
          {selected?.displayName || (readonly ? "No Player" : "Select Player")}
        </PlayerSelect>
      </PlayerSelectContainer>

      {!readonly && ( // Only show modal if not readonly
        <SelectPlayerModal
          dropdownVisible={dropdownVisible}
          closeDropdown={closeDropdown}
          playerArray={playerArray}
          handleSelect={handleSelect}
          selectedPlayers={selectedPlayers}
          selected={selected}
        />
      )}
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

const PlayerSelect = styled.Text(({ readonly }) => ({
  fontSize: 12,
  color: readonly ? "#fff" : "#999", // White for readonly, grey for interactive
  width: screenWidth <= 400 ? 110 : 130,
  padding: screenWidth <= 400 ? 17 : 20,
  textAlign: "center",
}));

export default memo(SelectPlayer);
