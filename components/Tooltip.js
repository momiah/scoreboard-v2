import React, { useState } from "react";
import { Modal, TouchableOpacity, View, Text } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

const Tooltip = ({ message, iconColor = "#00A2FF", position = "right" }) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <View>
      {/* Info Icon to Trigger Tooltip */}
      <TouchableOpacity onPress={() => setTooltipVisible(true)}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={iconColor}
        />
      </TouchableOpacity>

      {/* Tooltip Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={tooltipVisible}
        onRequestClose={() => setTooltipVisible(false)}
      >
        <TooltipContainer>
          <TooltipContent>
            <TooltipText>{message}</TooltipText>
            <CloseButton onPress={() => setTooltipVisible(false)}>
              <CloseButtonText>Close</CloseButtonText>
            </CloseButton>
          </TooltipContent>
        </TooltipContainer>
      </Modal>
    </View>
  );
};

export default Tooltip;

const TooltipContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
});

const TooltipContent = styled.View({
  width: "80%",
  backgroundColor: "#262626",
  borderRadius: 12,
  padding: 20,
  alignItems: "center",
});

const TooltipText = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  marginBottom: 20,
  textAlign: "center",
});

const CloseButton = styled.TouchableOpacity({
  backgroundColor: "#00A2FF",
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 8,
});

const CloseButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
});
