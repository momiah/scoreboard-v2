import React, { useCallback, useContext, useEffect } from "react";
import { FlatList, TouchableOpacity, View, Text } from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";

import Tag from "../Tag";
import Ionicons from "@expo/vector-icons/Ionicons";

import { LeagueContext } from "../../context/LeagueContext";
import { calculateLeagueStatus } from "../../helpers/calculateLeagueStatus";
import { ccDefaultImage } from "../../mockImages/index";

const VerticalLeagueCarousel = ({ navigationRoute, leagues }) => {
  const navigation = useNavigation();

  // const publicLeagues = leagues.filter((league) => league.privacy === "Public");

  // Memoize navigation handler to prevent re-renders
  const navigateTo = useCallback(
    (leagueId) => {
      navigation.navigate(navigationRoute, { leagueId });
    },
    [navigation, navigationRoute]
  );

  // Render individual league items
  const renderLeagueItem = useCallback(
    ({ item: league, index }) => {
      const leagueStatus = calculateLeagueStatus(league);
      const leagueParticipantsLength = league.leagueParticipants.length;
      const maxPlayers = league.maxPlayers;

      const location = `${league.location.city}, ${league.location.countryCode}`;
      const numberOfPlayers = `${leagueParticipantsLength} / ${maxPlayers}`;

      return (
        <CarouselContainer>
          <CarouselItem key={index} onPress={() => navigateTo(league.id)}>
            <ImageWrapper>
              <LeagueImage
                source={
                  league.leagueImage
                    ? { uri: league.leagueImage }
                    : ccDefaultImage
                }
              >
                {/* Remove GradientOverlay, replacing it with a simple overlay */}
                <Overlay />
                <LeagueDetailsContainer>
                  <TagContainer>
                    <Tag name={league.leagueType} />
                    <Tag
                      name={leagueStatus?.status}
                      color={leagueStatus?.color}
                    />
                  </TagContainer>

                  <NumberOfPlayers>
                    <Tag
                      name={numberOfPlayers}
                      color="rgba(0, 0, 0, 0.7)"
                      iconColor="#00A2FF"
                      iconSize={15}
                      icon="person"
                      iconPosition="right"
                      bold
                    />
                  </NumberOfPlayers>

                  <LeagueName>{league.leagueName}</LeagueName>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <LeagueLocation>
                      {league.location.courtName || ""}
                    </LeagueLocation>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <LeagueLocation>{location || ""}</LeagueLocation>
                      <Ionicons
                        name={"location"}
                        size={15}
                        color={"#286EFA"}
                        padding={5}
                        borderRadius={15}
                      />
                    </View>
                  </View>
                </LeagueDetailsContainer>
              </LeagueImage>
            </ImageWrapper>
          </CarouselItem>
        </CarouselContainer>
      );
    },
    [navigateTo]
  );

  return (
    <FlatList
      data={leagues}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderLeagueItem}
      showsVerticalScrollIndicator={false}
    />
  );
};

const CarouselContainer = styled.ScrollView({
  // marginBottom: 20,
});

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

// Remove the gradient overlay
const Overlay = styled(View)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.2)", // A simple semi-transparent overlay
  borderRadius: 10,
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
  paddingBottom: 5,
  borderRadius: 5,
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
});

export default VerticalLeagueCarousel;
