import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import styled from "styled-components/native";

const Popup = ({ visible, message, onClose }) => {
  if (!visible) return null;

  return (
    <PopupContainer>
      <PopupContent>
        <MessageText>{message}</MessageText>
        <CloseButton onPress={onClose}>
          <ButtonText>Close</ButtonText>
        </CloseButton>
      </PopupContent>
    </PopupContainer>
  );
};

export default Popup;

const PopupContainer = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,

  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 60,
});

const PopupContent = styled.View({
  backgroundColor: "#fff",
  padding: 20,
  width: 300,
  borderRadius: 10,
  alignItems: "center",
});

const MessageText = styled.Text({
  fontSize: 18,
  marginBottom: 10,
  textAlign: "center",
});

const CloseButton = styled.TouchableOpacity({
  backgroundColor: "#2196F3",
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 5,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 10,
});

const ButtonText = styled.Text({
  color: "#fff",
  fontSize: 16,
});
