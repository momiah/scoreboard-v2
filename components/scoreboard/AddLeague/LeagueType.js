import { leagueTypes } from "../../Leagues/leagueMocks";
import React, { useState } from "react";
import styled from "styled-components/native";
import { TouchableOpacity } from "react-native";

const LeagueType = () => {
  const [leagueType, setLeagueType] = useState(null);

  return (
    <Container>
      <Label>League Type</Label>
      <LeagueTypeContainer>
        {leagueTypes.map((type, index) => (
          <LeagueTypeButton
            key={index}
            onPress={() => setLeagueType(type)}
            isSelected={leagueType === type}
          >
            <LeagueTypeText isSelected={leagueType === type}>
              {type}
            </LeagueTypeText>
          </LeagueTypeButton>
        ))}
      </LeagueTypeContainer>
    </Container>
  );
};

const Container = styled.View({
  padding: 5,

  marginTop: 10,
  width: "100%",
});

const LeagueTypeContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between", // Evenly distribute buttons
  alignItems: "center",
  width: "100%",
});

const LeagueTypeButton = styled.TouchableOpacity(({ isSelected }) => ({
  flex: 1, // Ensures equal size for all buttons
  marginHorizontal: 5, // Add spacing between buttons
  paddingVertical: 10, // Vertical padding for better UI
  paddingHorizontal: 15, // Horizontal padding for text content
  minHeight: 50,
  backgroundColor: isSelected ? "#00284b" : "#00152B", // Highlight for selected
  borderWidth: 1,
  borderColor: isSelected ? "#004eb4" : "#414141",
  borderRadius: 5,
  alignItems: "center",
  justifyContent: "center",
}));

const LeagueTypeText = styled.Text(({ isSelected }) => ({
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

export default LeagueType;
