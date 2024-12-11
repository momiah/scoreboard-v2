import React, { useCallback } from "react";
import { FlatList, TouchableOpacity, Text, View } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { generatedLeagues } from "./leagueMocks";

const VerticalLeagueCarousel = ({ navigationRoute }) => {
  const navigation = useNavigation();

  // Memoize navigation handler to prevent re-renders
  const navigateTo = useCallback(
    (leagueId) => {
      navigation.navigate(navigationRoute, { leagueId });
    },
    [navigation, navigationRoute]
  );

  // Render individual league items
  const renderLeagueItem = useCallback(
    ({ item }) => (
      <CarouselItem onPress={() => navigateTo(item.id)}>
        <ImageWrapper>
          <LeagueImage source={item.image}>
            <GradientOverlay
              colors={["rgba(0, 0, 0, 0.01)", "rgba(0, 0, 0, 0.7)"]}
              locations={[0.1, 1]}
            />
            <LeagueName>{item.name}</LeagueName>
          </LeagueImage>
        </ImageWrapper>
      </CarouselItem>
    ),
    [navigateTo]
  );

  return (
    <FlatList
      data={generatedLeagues}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderLeagueItem}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

const CarouselItem = styled(TouchableOpacity)({
  marginVertical: 10,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#00152B",
  borderRadius: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 5,
  elevation: 3,
  height: 200,
});

const ImageWrapper = styled(View)({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden",
});

const LeagueImage = styled.ImageBackground({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end",
  alignItems: "center",
});

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 10,
});

const LeagueName = styled(Text)({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
  marginBottom: 15,
  zIndex: 2,
  textShadowColor: "rgba(0, 0, 0, 0.75)",
  textShadowOffset: { width: -1, height: 1 },
  textShadowRadius: 10,
});

export default VerticalLeagueCarousel;
