import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Tooltip from "../Tooltip"; // Import the Tooltip component
import { trophies } from "../../mockImages/index";
import styled from "styled-components/native";

const PrizeDistribution = ({ prizePool }) => {
  console.log("prize pool", prizePool);
  const prizeDistribution = (prizePool) => {
    const distribution = [0.5, 0.3, 0.2]; // Percentage splits for 1st, 2nd, and 3rd

    return distribution.map((percentage, index) => {
      return {
        xp: Math.floor(prizePool * percentage),
        trophy: trophies[index],
      };
    });
  };

  const prizes = prizeDistribution(prizePool);
  return (
    <PrizeDistributionContainer>
      <SectionTitleContainer>
        <SectionTitle>Prize Distribution</SectionTitle>
        <Tooltip
          message="Prize Distribution is calculated 3 days before league end date. 
          
          It considers total number of games played, max players of the league and total number of winning points accumulated in the league"
        />
      </SectionTitleContainer>
      <PrizeRow>
        {prizes.map((prize, index) => (
          <PrizeView key={index}>
            <PrizeImage source={prize.trophy} />
            <PrizeText>{prize.xp} XP</PrizeText>
          </PrizeView>
        ))}
      </PrizeRow>
    </PrizeDistributionContainer>
  );
};

const PrizeDistributionContainer = styled.View({
  marginBottom: 20,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
  // marginBottom: 10,
});

const SectionTitleContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 10,
  marginBottom: 10,
});

const PrizeRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
});

const PrizeView = styled.View({
  width: "30%",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  padding: 10,
  borderRadius: 8,
  alignItems: "center",
});

const PrizeImage = styled.Image({
  width: 60,
  height: 60,

  marginBottom: 5,
});

const PrizeText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
});

export default PrizeDistribution;
