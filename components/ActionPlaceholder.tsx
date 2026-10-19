import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

interface ActionPlaceholderProps {
  message: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  height?: number;
  disabled?: boolean;
  accentColor?: string;
  backgroundColor?: string;
  testID?: string;
}

const ActionPlaceholder: React.FC<ActionPlaceholderProps> = ({
  message,
  onPress,
  icon = "add-circle-outline",
  height = 150,
  disabled = false,
  accentColor = "#00A2FF",
  backgroundColor = "#0A1F33",
  testID,
}) => (
  <Container
    testID={testID}
    onPress={onPress}
    style={{ height, borderColor: accentColor, backgroundColor }}
    disabled={disabled}
  >
    <Ionicons name={icon} size={40} color={accentColor} />
    <PlaceholderText>{message}</PlaceholderText>
  </Container>
);

const Container = styled.TouchableOpacity<{ disabled?: boolean }>(
  ({ disabled }: { disabled?: boolean }) => ({
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A1F33",
    borderRadius: 10,
    width: "100%",
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#00A2FF",
    borderStyle: "dashed",
    gap: 10,
    paddingHorizontal: 30,
    paddingVertical: 20,
    opacity: disabled ? 0.5 : 1,
  }),
);

const PlaceholderText = styled.Text({
  color: "#aaa",
  fontSize: 14,
  fontStyle: "italic",
  textAlign: "center",
});

export default ActionPlaceholder;
