import React from "react";
import { Text, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

const Tag = ({
  name,
  color = "#2F2F30",
  icon,
  iconColor = "white",
  onPress,
  iconSize = 12,
  bold,
  iconPosition,
}) => {
  const tagName = name ? name.toUpperCase() : "";
  const TagComponent = onPress ? InteractiveTagContainer : TagContainer;
  const flexDirection = iconPosition === "left" ? "row" : "row-reverse";

  return (
    <TagComponent
      backgroundColor={color}
      onPress={onPress}
      flexDirection={flexDirection}
    >
      {icon && (
        <TagIcon
          name={icon}
          size={iconSize}
          color={iconColor}
          flexDirection={flexDirection}
        />
      )}
      <TagText bold={bold}>{tagName}</TagText>
    </TagComponent>
  );
};

const TagContainer = styled.View(({ backgroundColor, flexDirection }) => ({
  flexDirection: flexDirection,
  justifyContent: "space-between",
  alignItems: "center",
  padding: 6,
  borderRadius: 6,
  // margin: 4,
  backgroundColor,
  // alignSelf: "flex-start",
}));

const InteractiveTagContainer = styled.TouchableOpacity(
  ({ backgroundColor, flexDirection }) => ({
    flexDirection: flexDirection,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 6,
    borderRadius: 6,
    // margin: 4,
    backgroundColor,
    // alignSelf: "flex-start",
  })
);

const TagIcon = styled(Ionicons)(({ flexDirection }) => ({
  paddingLeft: flexDirection === "row" ? 0 : 5,
  paddingRight: flexDirection === "row-reverse" ? 0 : 5,
}));

const TagText = styled.Text(({ bold }) => ({
  color: "white",
  fontSize: 10,
  fontWeight: bold ? "bold" : "normal",
}));

export default Tag;
