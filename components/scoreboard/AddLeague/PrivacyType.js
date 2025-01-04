import { privacyTypes } from "../../Leagues/leagueMocks";
import React, { useState } from "react";
import styled from "styled-components/native";
import { TouchableOpacity } from "react-native";

const PrivacyType = () => {
  const [privacy, setPrivacy] = useState(null);

  return (
    <Container>
      <Label>Privacy</Label>
      <PrivacyTypeContainer>
        {privacyTypes.map((privacyType, index) => (
          <PrivacyButton
            key={index}
            onPress={() => setPrivacy(privacyType)}
            isSelected={privacy === privacyType}
          >
            <PrivacyTypeText isSelected={privacy === privacyType}>
              {privacyType}
            </PrivacyTypeText>
          </PrivacyButton>
        ))}
      </PrivacyTypeContainer>
    </Container>
  );
};

const Container = styled.View({
  padding: 5,

  marginTop: 10,
  width: "100%",
});

const PrivacyTypeContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between", // Ensure equal spacing between buttons
  alignItems: "stretch", // Ensure equal height
  width: "100%",
});

const PrivacyButton = styled.TouchableOpacity(({ isSelected }) => ({
  flex: 1, // Equal width for all buttons
  marginHorizontal: 5, // Spacing between buttons
  paddingVertical: 10, // Consistent vertical padding

  backgroundColor: isSelected ? "#00284b" : "#00152B", // Highlight for selected
  borderWidth: 1,
  borderColor: isSelected ? "#004eb4" : "#414141",
  borderRadius: 5,
  alignItems: "center",
  justifyContent: "center",
}));

const PrivacyTypeText = styled.Text(({ isSelected }) => ({
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "center",
  color: isSelected ? "white" : "#7b7b7b", // White for selected, grey for others
}));

const Label = styled.Text({
  color: "#ccc",
  alignSelf: "flex-start",
  marginBottom: 5,
  fontSize: 14,
});

export default PrivacyType;
