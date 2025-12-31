import React, {
  useContext,
  useState,
  useCallback,
  memo,
  useEffect,
  useMemo,
} from "react";
import { View, Dimensions } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../../context/UserContext";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import SelectPlayerModal from "../../Modals/SelectPlayerModal";
import { Player } from "../../../types/game";

interface SelectPlayerProps {
  onSelectPlayer: (player: Player | null) => void;
  selectedPlayers: Record<string, (Player | null)[]>;
  borderType: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "none";
  team: string;
  index: number;
  readonly?: boolean;
  presetPlayer?: Player | null;
}

const SelectPlayer = ({
  onSelectPlayer,
  selectedPlayers,
  borderType,
  team,
  index,
  readonly = false,
  presetPlayer = null,
}: SelectPlayerProps) => {
  const [selected, setSelected] = useState<Player | null>(null);
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

  const playerArray: Player[] = useMemo(
    () =>
      players.map((player: Player) => ({
        userId: player.userId,
        firstName: player.firstName,
        lastName: player.lastName,
        username: player.username,
        displayName: formatDisplayName(player),
      })),
    [players]
  );

  // Get border and text direction styles based on borderType
  const borderStyle = useMemo(() => {
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

  const textStyle = useMemo(() => {
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

  const handleSelect = (player: Player) => {
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
const PlayerSelectContainer = styled.TouchableOpacity(
  ({ hasBorder }: { hasBorder: boolean }) => ({
    width: screenWidth <= 400 ? 110 : 110,
    alignItems: "center",
    border: hasBorder ? "1px solid #262626" : "none",
  })
);

const PlayerSelect = styled.Text(({ readonly }: { readonly: boolean }) => ({
  fontSize: 12,
  color: readonly ? "#fff" : "#999", // White for readonly, grey for interactive
  width: screenWidth <= 400 ? 110 : 130,
  padding: screenWidth <= 400 ? 17 : 20,
  textAlign: "center",
}));

export default memo(SelectPlayer);
