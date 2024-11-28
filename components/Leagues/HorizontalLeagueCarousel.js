import React from "react";
import { ScrollView, Dimensions } from "react-native";
import styled from "styled-components/native";

const { width } = Dimensions.get("window");

const HorizontalLeagueCarousel = ({ leagues, direction }) => {
  return (
    <CarouselContainer
      horizontal={direction === "horizontal"}
      vertical={direction === "vertical"}
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20, // Adjust padding for partial display
      }}
    >
      {leagues.map((league, index) => (
        <CarouselItem key={index}>
          <LeagueName>{league.name}</LeagueName>
        </CarouselItem>
      ))}
    </CarouselContainer>
  );
};

// Styled components
const CarouselContainer = styled.ScrollView({
  height: 175,
  marginBottom: 20,
});

const CarouselItem = styled.TouchableOpacity({
  width: width - 80, // Reduce width for partial display
  marginHorizontal: 10, // Space between items
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#fff",
  borderRadius: 10,
  padding: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.8,
  shadowRadius: 2,
  elevation: 5,
});

const LeagueName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
});

export default HorizontalLeagueCarousel;
