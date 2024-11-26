import React from "react";
import styled from "styled-components/native";

const TopPlayers = ({ topPlayers }) => {
  return (
    <Container>
      {topPlayers.slice(0, 3).map((player) => (
        <PlayerContainer key={player.id}>
          <PlayerName>{player.name}</PlayerName>
          <PlayerScore>{player.score}</PlayerScore>
        </PlayerContainer>
      ))}
    </Container>
  );
};

// Styled components
const Container = styled.View({
  flex: 1,
  padding: 20,
});

const PlayerContainer = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  padding: 20,
  borderWidth: 1,
  borderColor: "#ccc",
  marginBottom: 10,
  borderRadius: 50,
});

const PlayerName = styled.Text({
  fontSize: 18,
  color: "white",
});

const PlayerScore = styled.Text({
  fontSize: 18,
  color: "white",
});

export default TopPlayers;
