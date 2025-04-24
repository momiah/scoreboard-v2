import { maxPlayers } from "../../Leagues/leagueMocks";
import React, { useState } from "react";
import styled from "styled-components/native";
import { TouchableOpacity } from "react-native";

const MaxPlayersPicker = ({ setLeagueDetails, errorText, leagueDetails }) => {
  const [maximumPlayers, setMaximumPlayers] = useState(
    leagueDetails.maxPlayers
  );

  const handleSelectPlayers = (players) => {
    setMaximumPlayers(players);
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      maxPlayers: players,
    }));
  };

  return (
    <Container>
      <LabelContainer>
        <Label>Max Players</Label>
        {errorText && <ErrorText>{errorText}</ErrorText>}
      </LabelContainer>
      <MaxPlayersPickerContainer>
        {maxPlayers.map((players, index) => (
          <PlayerButton
            key={index}
            onPress={() => handleSelectPlayers(players)}
            isSelected={maximumPlayers === players}
          >
            <MaxPlayerNumber isSelected={maximumPlayers === players}>
              {players}
            </MaxPlayerNumber>
          </PlayerButton>
        ))}
      </MaxPlayersPickerContainer>
    </Container>
  );
};

const Container = styled.View({
  padding: 5,

  marginTop: 10,
  width: "100%",
});

const MaxPlayersPickerContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between", // Ensures equal spacing between buttons
  alignItems: "center",
  width: "100%",
});

const PlayerButton = styled.TouchableOpacity(({ isSelected }) => ({
  flex: 1, // Makes each button take equal space
  marginHorizontal: 5, // Adds spacing between buttons
  paddingVertical: 10,
  backgroundColor: isSelected ? "#00284b" : "#00152B", // Highlight for selected
  borderWidth: 1,
  borderColor: isSelected ? "#004eb4" : "#414141",
  borderRadius: 5,
  alignItems: "center",
}));

const MaxPlayerNumber = styled.Text(({ isSelected }) => ({
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

export default MaxPlayersPicker;
