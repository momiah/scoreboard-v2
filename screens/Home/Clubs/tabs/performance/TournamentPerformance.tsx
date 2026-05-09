import React from "react";
import styled from "styled-components/native";

const TournamentPerformance: React.FC = () => {
  return (
    <Container>
      <PlaceholderText>
        All wins from all tournaments in this club will appear here.
      </PlaceholderText>
    </Container>
  );
};

const Container = styled.View({
  flex: 1,
  paddingVertical: 24,
});

const PlaceholderText = styled.Text({
  color: "#888",
  fontStyle: "italic",
  fontSize: 15,
  lineHeight: 22,
});

export default TournamentPerformance;
