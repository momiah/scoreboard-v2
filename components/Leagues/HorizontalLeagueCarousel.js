import React, { useContext, useEffect } from "react";
import { ScrollView, Dimensions, View, Text } from "react-native";
import styled from "styled-components/native";
import { generatedLeagues } from "./leagueMocks";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

import { LeagueContext } from "../../context/LeagueContext";
import Tag from "../Tag";
import Ionicons from "@expo/vector-icons/Ionicons";
import { calculateLeagueStatus } from "../../functions/calculateLeagueStatus";

const { width } = Dimensions.get("window");

const HorizontalLeagueCarousel = ({ navigationRoute }) => {
  const navigation = useNavigation();
  const { leagues, leagueIdForDetail } = useContext(LeagueContext);

  // console.log("leagues", leagues);

  const navigateTo = (leagueId) => {
    navigation.navigate(navigationRoute, { leagueId });
  };

  useEffect(() => {
    if (leagueIdForDetail !== "") {
      navigateTo(leagueIdForDetail);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueIdForDetail]);

  const itemWidth = width - 80; // Width of each item (adjusted for partial display)
  const spacing = 20; // Space between items
  return (
    <CarouselContainer
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      snapToInterval={itemWidth + spacing} // Snap to item width + spacing
      snapToAlignment="start" // Align items to the start
      decelerationRate="fast" // Faster snapping
      // contentContainerStyle={{
      //   paddingHorizontal: 20, // Adjust padding for partial display
      // }}
    >
      {leagues.map((league, index) => {
        const leagueStatus = calculateLeagueStatus(league);
        const leagueParticipantsLength = league.leagueParticipants.length;
        const maxPlayers = league.maxPlayers;
        return (
          <CarouselItem
            key={index}
            onPress={() => navigateTo(league.id)}
            style={{ width: itemWidth, marginRight: spacing }}
          >
            <ImageWrapper>
              <LeagueImage source={league.image}>
                <GradientOverlay
                  colors={["rgba(0, 0, 0, 0.01)", "rgba(0, 0, 0, 0.7)"]}
                  locations={[0.1, 1]}
                />
                <LeagueDetailsContainer>
                  <TagContainer>
                    <Tag name={league.leagueType} />
                    <Tag
                      name={leagueStatus?.status}
                      color={leagueStatus?.color}
                    />
                  </TagContainer>
                  <NumberOfPlayers>
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                      }}
                    >
                      {leagueParticipantsLength} / {maxPlayers}
                    </Text>
                    <Ionicons name="person" size={15} color={"#00A2FF"} />
                  </NumberOfPlayers>

                  <LeagueName>{league.leagueName}</LeagueName>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <LeagueLocation>{league.centerName}</LeagueLocation>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <LeagueLocation>{league.location}</LeagueLocation>
                      <Ionicons
                        name={"location"}
                        size={15}
                        color={"#286EFA"}
                        backgroundColor={"rgba(0, 0, 0, 0.3)"}
                        padding={5}
                        borderRadius={15}
                      />
                    </View>
                  </View>
                </LeagueDetailsContainer>
              </LeagueImage>
            </ImageWrapper>
          </CarouselItem>
        );
      })}
    </CarouselContainer>
  );
};

// Styled components
const CarouselContainer = styled.ScrollView({
  height: 200,
  marginBottom: 20,
});

const CarouselItem = styled.TouchableOpacity({
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
});

const LeagueLocation = styled.Text({
  fontSize: 13,
  color: "white",
  borderRadius: 5,
});

const LeagueDetailsContainer = styled.View({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden",
  justifyContent: "flex-end",
  padding: 10,
  borderWidth: 1,
  borderColor: "#192336",
});

const TagContainer = styled.View({
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 2, // Ensures the tag appears above other elements
  flexDirection: "row",
  gap: 5,
});

const NumberOfPlayers = styled.View({
  paddingBottom: 10,
  borderRadius: 5,
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
});

export default HorizontalLeagueCarousel;
