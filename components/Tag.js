import React from "react";
import { Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

const Tag = ({ name, color = "#2F2F30", icon }) => {
  const tagName = name ? name.toUpperCase() : "NO TAG NAME";
  return (
    <TagContainer backgroundColor={color}>
      {icon && <TagIcon name={icon} size={24} color="white" />}
      <TagText>{tagName}</TagText>
    </TagContainer>
  );
};
const TagContainer = styled.View(({ backgroundColor }) => ({
  flexDirection: "row",
  alignItems: "center",
  padding: 6,
  borderRadius: 6,
  margin: 4,
  backgroundColor,
  alignSelf: "flex-start",
}));

const TagIcon = styled(Ionicons)({
  marginRight: 8,
});

const TagText = styled.Text({
  color: "white",
  fontSize: 10,
});

export default Tag;
