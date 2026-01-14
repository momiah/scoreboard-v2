// components/Tag.tsx
import React from "react";
import { ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

interface TagProps {
  name?: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
  iconSize?: number;
  bold?: boolean;
  iconPosition?: "left" | "right";
  width?: number | string;
  fontSize?: number;
  disabled?: boolean;
  loading?: boolean;
}

const Tag = ({
  name,
  color = "#2F2F30",
  icon,
  iconColor = "white",
  onPress,
  iconSize = 12,
  bold,
  iconPosition,
  width = undefined,
  fontSize = 10,
  disabled = false,
  loading = false,
}: TagProps) => {
  const tagName = name ? name.toUpperCase() : "";
  const TagComponent = onPress ? InteractiveTagContainer : TagContainer;
  const flexDirection = iconPosition === "left" ? "row" : "row-reverse";

  return (
    <TagComponent
      backgroundColor={color}
      onPress={onPress}
      flexDirection={flexDirection}
      disabled={disabled}
      style={{
        width,
      }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color="white"
          style={{ marginHorizontal: 4 }}
        />
      ) : (
        icon && (
          <TagIcon
            name={icon}
            size={iconSize}
            color={iconColor}
            flexDirection={flexDirection}
          />
        )
      )}
      <TagText bold={bold} fontSize={fontSize}>
        {tagName}
      </TagText>
    </TagComponent>
  );
};

const TagContainer = styled.View(
  ({
    backgroundColor,
    flexDirection,
    width,
  }: {
    backgroundColor: string;
    flexDirection: string;
    width?: number | string;
  }) => ({
    flexDirection,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 6,
    borderRadius: 6,
    width,
    backgroundColor,
  })
);

const InteractiveTagContainer = styled.TouchableOpacity(
  ({
    backgroundColor,
    flexDirection,
    width,
  }: {
    backgroundColor: string;
    flexDirection: string;
    width?: number | string;
  }) => ({
    flexDirection,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 6,
    borderRadius: 6,
    width,
    backgroundColor,
  })
);

const TagIcon = styled(Ionicons)(
  ({ flexDirection }: { flexDirection: string }) => ({
    paddingLeft: flexDirection === "row" ? 0 : 5,
    paddingRight: flexDirection === "row-reverse" ? 0 : 5,
  })
);

const TagText = styled.Text(
  ({ bold, fontSize }: { bold?: boolean; fontSize: number }) => ({
    color: "white",
    fontSize,
    fontWeight: bold ? "bold" : "normal",
  })
);

export default Tag;
