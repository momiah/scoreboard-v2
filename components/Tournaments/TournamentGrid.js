import React from "react";
import { Text } from "react-native";
import styled from "styled-components/native";

const TournamentGrid = ({ tournaments }) => {
  return (
    <Container>
      {tournaments.slice(0, 4).map((tournament) => (
        <TournamentContainer key={tournament.id}>
          <Tournament>
            <ItemText>{tournament.name}</ItemText>
          </Tournament>
          <TournamentDetails>{tournament.name}</TournamentDetails>
        </TournamentContainer>
      ))}
    </Container>
  );
};

// Styled components
const Container = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-evenly", // Ensures items are evenly spaced
  alignItems: "center",
  // borderWidth: 1,
  // borderColor: "#ccc",
});

const TournamentContainer = styled.TouchableOpacity({
  flexBasis: "42%",
  // marginBottom: 30,
});

const Tournament = styled.View({
  height: 150,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#ccc",
  marginBottom: 30,
  borderTopEndRadius: 20,
  borderTopStartRadius: 20,
  backgroundColor: "#f9f9f9", // Optional: Adds a background color
});

const ItemText = styled.Text({
  textAlign: "center",
  fontWeight: "bold",
});
const TournamentDetails = styled.Text({
  color: "white",
  textAlign: "center",
  fontWeight: "bold",
});

export default TournamentGrid;
