import React from "react";
import styled from "styled-components/native";

const ClubFeed: React.FC = () => {
  return (
    <Container>
      <PlaceholderText>
        Recent club activity will appear here — new players invited, competition
        results, and newly created competitions.
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

export default ClubFeed;
