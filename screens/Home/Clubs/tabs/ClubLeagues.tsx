import React from "react";
import styled from "styled-components/native";

const ClubLeagues: React.FC = () => {
  return (
    <Container>
      <PlaceholderText>
        Club leagues and the ability to create new leagues will appear here.
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

export default ClubLeagues;
