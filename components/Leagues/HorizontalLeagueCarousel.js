import React from "react";
import { ScrollView, Dimensions } from "react-native";
import styled from "styled-components/native";
import { generatedLeagues } from "./leagueMocks";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const HorizontalLeagueCarousel = ({ navigationRoute }) => {
  const navigation = useNavigation();

  const navigateTo = (leagueId) => {
    // Pass leagueId to the target league page
    navigation.navigate(navigationRoute, { leagueId });
  };
  return (
    <CarouselContainer
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20, // Adjust padding for partial display
      }}
    >
      {generatedLeagues.map((league, index) => (
        <CarouselItem key={index} onPress={() => navigateTo(league.id)}>
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

  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.8,
  shadowRadius: 2,
  elevation: 5,
});

const ImageWrapper = styled.View({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden", // Ensures image respects border radius
});

const LeagueImage = styled.ImageBackground({
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

const LeagueName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
  marginBottom: 15, // Adds spacing between text and the bottom
  zIndex: 2, // Ensures text appears above the gradient
  textShadowColor: "rgba(0, 0, 0, 0.75)",
  textShadowOffset: { width: -1, height: 1 },
  textShadowRadius: 10,
});

export default HorizontalLeagueCarousel;
