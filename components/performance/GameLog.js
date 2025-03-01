import React from "react";
import styled from "styled-components/native";
import { Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

const GameLog = ({ userId }) => {
  return (
    <NonDeletableGameContainer>
      <TeamContainer>
        <TeamTextContainer style={{ borderTopLeftRadius: 8 }}>
          <Team>FFFF</Team>
        </TeamTextContainer>
        <TeamTextContainer style={{ borderBottomLeftRadius: 8 }}>
          <Team>AAA</Team>
        </TeamTextContainer>
      </TeamContainer>

      <ResultsContainer>
        <Date>21</Date>
        <ScoreContainer>
          <Score>21 - </Score>
          <Score>12</Score>
        </ScoreContainer>
      </ResultsContainer>

      <TeamContainer>
        <TeamTextContainer style={{ borderTopRightRadius: 8 }}>
          <Team style={{ textAlign: "right" }}>QQQQ</Team>
        </TeamTextContainer>
        <TeamTextContainer style={{ borderBottomRightRadius: 8 }}>
          <Team style={{ textAlign: "right" }}>QQQQ</Team>
        </TeamTextContainer>
      </TeamContainer>
    </NonDeletableGameContainer>
  );
};

const NonDeletableGameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  backgroundColor: "#001123",
  border: "1px solid rgb(9, 33, 62)",
  borderRadius: 8,
});

const ResultsContainer = styled.View({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  paddingBottom: 30,
});

const Score = styled.Text({
  fontSize: 30,
  fontWeight: "bold",
  color: "#00A2FF",
});

const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  marginTop: screenWidth <= 400 ? 20 : null,
});

const Team = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 15 : 16,
});

const TeamContainer = styled.View({
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});

const TeamTextContainer = styled.View({
  display: "flex",
  flexDirection: "column",
  padding: 15,
  paddingLeft: 20,
  paddingRight: 20,
  width: screenWidth <= 400 ? 125 : 140,
});

export default GameLog;
