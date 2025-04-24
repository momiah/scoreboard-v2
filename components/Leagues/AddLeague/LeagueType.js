import { leagueTypes } from "../leagueMocks";
import React, { useState } from "react";
import styled from "styled-components/native";
import { TouchableOpacity } from "react-native";

const LeagueType = ({ setLeagueDetails, leagueDetails, errorText }) => {
  const [leagueType, setLeagueType] = useState(leagueDetails.leagueType);

  const handleSelectLeagueType = (type) => {
    setLeagueType(type);
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      leagueType: type,
    }));
  };

  return (
    <Container>
      <LabelContainer>
        <Label>League Type</Label>
        {errorText && <ErrorText>{errorText}</ErrorText>}
      </LabelContainer>
      <LeagueTypeContainer>
        {leagueTypes.map((type, index) => (
          <LeagueTypeButton
            key={index}
            onPress={() => handleSelectLeagueType(type)}
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
  flex: 1,
  marginHorizontal: 5,
  paddingVertical: 10,
  paddingHorizontal: 15,
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
  fontSize: 14,
});

const LabelContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: 5,
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 10,
  fontStyle: "italic",
});

export default LeagueType;
