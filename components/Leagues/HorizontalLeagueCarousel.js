import React, { useContext, useEffect } from "react";
import { ScrollView, Dimensions, View, Text } from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { LeagueContext } from "../../context/LeagueContext";

import Ionicons from "@expo/vector-icons/Ionicons";
import { calculateLeagueStatus } from "../../functions/calculateLeagueStatus";
import Tag from "../Tag";
import { UserContext } from "../../context/UserContext";
import { ccDefaultImage } from "../../mockImages/index";

const { width } = Dimensions.get("window");

const HorizontalLeagueCarousel = ({ navigationRoute }) => {
  const navigation = useNavigation();
  const { leagues, leagueIdForDetail } = useContext(LeagueContext);

  const navigateTo = (leagueId) => {
    navigation.navigate(navigationRoute, { leagueId });
  };

  useEffect(() => {
    if (leagueIdForDetail !== "") {
      navigateTo(leagueIdForDetail);
    }
  }, [leagueIdForDetail]);

  const itemWidth = width - 80;
  const spacing = 20;

  return (
    <CarouselContainer
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      snapToInterval={itemWidth + spacing}
      snapToAlignment="start"
      decelerationRate="fast"
    >
      {leagues.map((league, index) => {
        const leagueStatus = calculateLeagueStatus(league);
        const leagueParticipantsLength = league.leagueParticipants.length;
        const maxPlayers = league.maxPlayers;

        return (
          <CarouselItem
            key={league.id || index}
            onPress={() => navigateTo(league.id)}
            style={{ width: itemWidth, marginRight: spacing }}
          >
            <ImageWrapper>
              <LeagueImage
                source={
                  league.leagueImage
                    ? { uri: league.leagueImage }
                    : ccDefaultImage
                }
              >
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
                    <Text style={{ color: "white", fontSize: 12 }}>
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
                        style={{ marginLeft: 5 }}
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
  overflow: "hidden",
});

const LeagueImage = styled.ImageBackground.attrs({
  imageStyle: {
    resizeMode: "cover",
  },
})({
  width: "100%",
  height: "100%", // or any fixed height
  justifyContent: "flex-end",
  alignItems: "center",
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
  zIndex: 2,
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

const Overlay = styled(View)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.2)", // A simple semi-transparent overlay
  borderRadius: 10,
});

export default HorizontalLeagueCarousel;
