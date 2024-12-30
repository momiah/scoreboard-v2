import React, { useCallback, useContext, useEffect } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

import Tag from "../Tag";
import Ionicons from "@expo/vector-icons/Ionicons";

import { LeagueContext } from "../../context/LeagueContext";

const VerticalLeagueCarousel = ({ navigationRoute }) => {
  const navigation = useNavigation();
  const { leagues, fetchLeagues } = useContext(LeagueContext);

  // Memoize navigation handler to prevent re-renders
  const navigateTo = useCallback(
    (leagueId) => {
      navigation.navigate(navigationRoute, { leagueId });
    },
    [navigation, navigationRoute]
  );

  // useEffect(() => {
  //   fetchLeagues();
  // }, []);

  // Render individual league items
  const renderLeagueItem = useCallback(
    ({ item: league, index }) => (
      <CarouselContainer>
        <CarouselItem key={index} onPress={() => navigateTo(league.id)}>
          <ImageWrapper>
            <LeagueImage source={league.image}>
              <GradientOverlay
                colors={["rgba(0, 0, 0, 0.01)", "rgba(0, 0, 0, 0.8)"]}
                locations={[0.1, 1]}
              />
              <LeagueDetailsContainer>
                <TagContainer>
                  <Tag
                    name={league.leagueStatus.status}
                    color={league.leagueStatus.color}
                  />
                </TagContainer>
                <LeagueName>{league.leagueName}</LeagueName>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <LeagueLocation>{league.centerName}</LeagueLocation>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
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
      </CarouselContainer>
    ),
    [navigateTo]
  );

  return (
    <FlatList
      data={leagues}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderLeagueItem}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

const CarouselContainer = styled.ScrollView({
  marginBottom: 20,
  paddingHorizontal: 15,
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

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
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
});

export default VerticalLeagueCarousel;
