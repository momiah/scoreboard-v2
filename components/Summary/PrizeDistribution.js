import React, { useEffect, useContext } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Tooltip from "../Tooltip"; // Import the Tooltip component
import { trophies } from "../../mockImages/index";
import styled from "styled-components/native";
import moment from "moment";
import { calculatePrizeAllocation } from "../../functions/calculatePrizeAllocation";
import { UserContext } from "../../context/UserContext";

const PrizeDistribution = ({ prizePool, endDate, leagueParticipants }) => {
  const { updatePlacementStats } = useContext(UserContext);
  const distribution = [0.4, 0.3, 0.2, 0.1]; // Percentage splits for 1st, 2nd, and 3rd

  const prizeDistribution = (prizePool) => {
    return distribution.map((percentage, index) => {
      return {
        xp: Math.floor(prizePool * percentage),
        trophy: trophies[index],
      };
    });
  };

  useEffect(() => {
    const todaysDate = moment().format("DD-MM-YYYY");
    if (todaysDate === endDate) {
      calculatePrizeAllocation(
        leagueParticipants,
        prizePool,
        updatePlacementStats,
        distribution
      );
    }
  }, [endDate]);

  const prizes = prizeDistribution(prizePool);
  return (
    <PrizeDistributionContainer>
      <SectionTitleContainer>
        <SectionTitle>Prize Distribution</SectionTitle>
        <Tooltip message="Prize Distribution is calculated by the total number of games played, max players of the league and total number of winning points accumulated in the league" />
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

const { width: screenWidth } = Dimensions.get("window");

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
  // width: "25%",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  border: "1px solid rgb(26, 28, 54)",
  padding: screenWidth <= 400 ? 10 : 15,
  borderRadius: 8,
  alignItems: "center",
  // marginHorizontal: 5,
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
