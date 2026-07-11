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
import { Player } from "@shared/types";

// ── Types

interface SelectPlayerProps {
  onSelectPlayer: (player: Player | null) => void;
  selectedPlayers: Record<string, (Player | null)[]>;
  borderType: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "none";
  team: string;
  index: number;
  readonly?: boolean;
  presetPlayer?: Player | null;
}

interface BorderStyle {
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
}

interface TextStyle {
  textAlign?: "left" | "right" | "center";
}

// ── Component

const SelectPlayer = memo<SelectPlayerProps>(
  ({
    onSelectPlayer,
    selectedPlayers,
    borderType,
    team,
    index,
    readonly = false,
    presetPlayer = null,
  }) => {
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
    }, [
      selectedPlayers[team]?.[index]?.userId,
      readonly,
      presetPlayer?.userId,
    ]);

    const borderStyle = useMemo<BorderStyle>(() => {
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

    const textStyle = useMemo<TextStyle>(() => {
      switch (borderType) {
        case "topLeft":
        case "bottomLeft":
          return { textAlign: "left" };
        case "topRight":
        case "bottomRight":
          return { textAlign: "right" };
        default:
          return { textAlign: "center" };
      }
    }, [borderType]);

    const toggleDropdown = useCallback(() => {
      if (!readonly) {
        setDropdownVisible(true);
      }
    }, [readonly]);

    const closeDropdown = useCallback(() => {
      setDropdownVisible(false);
    }, []);

    const handleSelect = useCallback(
      (player: Player) => {
        const isSame = selected?.userId === player.userId;
        const newPlayer = isSame ? null : player;

        setSelected(newPlayer);
        onSelectPlayer(newPlayer);
        if (!isSame) {
          closeDropdown();
        }
      },
      [selected?.userId, onSelectPlayer, closeDropdown],
    );

    return (
      <View>
        <PlayerSelectContainer
          onPress={toggleDropdown}
          style={borderStyle}
          hasBorder={borderType !== "none"}
          readonly={readonly}
        >
          <PlayerSelect style={textStyle} readonly={readonly}>
            {selected?.displayName ||
              (readonly ? "No Player" : "Select Player")}
          </PlayerSelect>
        </PlayerSelectContainer>

        {!readonly && (
          <SelectPlayerModal
            dropdownVisible={dropdownVisible}
            closeDropdown={closeDropdown}
            playerArray={players}
            handleSelect={handleSelect}
            selectedPlayers={selectedPlayers}
            selected={selected}
          />
        )}
      </View>
    );
  },
);

SelectPlayer.displayName = "SelectPlayer";

const { width: screenWidth } = Dimensions.get("window");

// ── Styled Components

interface PlayerSelectContainerProps {
  hasBorder: boolean;
  readonly: boolean;
}

const PlayerSelectContainer =
  styled.TouchableOpacity<PlayerSelectContainerProps>(
    ({ hasBorder, readonly }: PlayerSelectContainerProps) => ({
      width: screenWidth <= 400 ? 110 : 110,
      alignItems: "center",
      border: hasBorder && !readonly ? "1px solid #262626" : "none",
    }),
  );

interface PlayerSelectProps {
  readonly: boolean;
}

const PlayerSelect = styled.Text<PlayerSelectProps>(
  ({ readonly }: PlayerSelectProps) => ({
    fontSize: 12,
    color: readonly ? "#fff" : "#999",
    width: screenWidth <= 400 ? 110 : 130,
    padding: screenWidth <= 400 ? 17 : 20,
    textAlign: "center",
  }),
);

export default SelectPlayer;
