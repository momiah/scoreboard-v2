import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  ImageBackground,
} from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";

const VerticalLeagueCarousel = ({ leagues, onItemPress }) => {
  return (
    <CarouselContainer>
      {leagues.map((league, index) => (
        <CarouselItem key={index} onPress={() => onItemPress(league)}>
          <ImageWrapper>
            <LeagueImage source={league.image}>
              <GradientOverlay
                colors={["rgba(0, 0, 0, 0.01)", "rgba(0, 0, 0, 0.7)"]}
                locations={[0.1, 1]}
              />
              <LeagueName>{league.name}</LeagueName>
            </LeagueImage>
          </ImageWrapper>
        </CarouselItem>
      ))}
    </CarouselContainer>
  );
};

const CarouselContainer = styled(ScrollView)({
  marginBottom: 20,
  paddingHorizontal: 15,
});

const CarouselItem = styled(TouchableOpacity)({
  marginHorizontal: 10,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#00152B",
  borderRadius: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.6,
  shadowRadius: 10,
  elevation: 5,
  height: 200,
  marginBottom: 30,
});

const ImageWrapper = styled.View({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden", // Ensures image respects border radius
});

const LeagueImage = styled(ImageBackground)({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end", // Positions text at the bottom
  alignItems: "center",
});

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 10, // Ensures the gradient follows the same border radius
});

const LeagueName = styled(Text)({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
  marginBottom: 15, // Adds spacing between text and the bottom
  zIndex: 2, // Ensures text appears above the gradient
  textShadowColor: "rgba(0, 0, 0, 0.75)",
  textShadowOffset: { width: -1, height: 1 },
  textShadowRadius: 10,
});

export default VerticalLeagueCarousel;