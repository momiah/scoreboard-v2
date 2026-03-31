import React from "react";
import { Dimensions, View } from "react-native";
import styled from "styled-components/native";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { calculateCompetitionStatus } from "../../helpers/calculateCompetitionStatus";
import Tag from "../Tag";
import { ccDefaultImage } from "../../mockImages/index";
import { NormalizedCompetition } from "@shared/types";

const { width } = Dimensions.get("window");

interface HorizontalLeagueCarouselProps {
  navigationRoute: string;
  leagues: NormalizedCompetition[];
}

const HorizontalLeagueCarousel = ({
  navigationRoute,
  leagues,
}: HorizontalLeagueCarouselProps) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const navigateTo = (leagueId: string) => {
    navigation.navigate(navigationRoute, { leagueId });
  };

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
      {(leagues ?? []).map((league, index) => {
        const leagueStatus = calculateCompetitionStatus(league);
        const participantsLength = (league.participants ?? []).length;
        const maxPlayers = league.maxPlayers;
        const location = `${league.location?.city}, ${league.location?.countryCode}`;
        const numberOfPlayers = `${participantsLength} / ${maxPlayers}`;

        return (
          <CarouselItem
            key={league.id || index}
            onPress={() => navigateTo(league.id)}
            style={{ width: itemWidth, marginRight: spacing }}
          >
            <ImageWrapper>
              <LeagueImage
                source={league.image ? { uri: league.image } : ccDefaultImage}
              >
                <Overlay />
                <LeagueDetailsContainer>
                  <TagContainer>
                    <Tag name={league.type} />
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

                  <LeagueName>{league.name}</LeagueName>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <LeagueLocation>
                      {league.location?.courtName || ""}
                    </LeagueLocation>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <LeagueLocation>{location || ""}</LeagueLocation>
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
  height: "100%",
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
  paddingBottom: 5,
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
  backgroundColor: "rgba(0, 0, 0, 0.2)",
  borderRadius: 10,
});

export default HorizontalLeagueCarousel;
