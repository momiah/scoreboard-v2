import React from "react";
import { View } from "react-native";

import styled from "styled-components/native";
import { trophies } from "../../mockImages"; // adjust the import path accordingly

const LeagueStatsDisplay = ({ leagueStats }) => {
  // Define an array of keys matching your leagueStats structure.
  const statKeys = ["first", "second", "third", "fourth"];

  return (
    <View style={{ flexDirection: "column" }}>
      {/* <SectionTitle>League Stats</SectionTitle> */}
      <PrizeRow>
        {statKeys.map((key, index) => (
          <PrizeView key={index}>
            <PrizeImage source={trophies[index]} />
            <PrizeText>{leagueStats?.[key] ?? 0}</PrizeText>
          </PrizeView>
        ))}
      </PrizeRow>
    </View>
  );
};

export default LeagueStatsDisplay;

// Styled components for the display.
const PrizeRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 10,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
  marginVertical: 10,
});

const PrizeView = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  border: "1px solid rgb(26, 28, 54)",
  padding: 10, // you can adjust based on screen size if needed
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
