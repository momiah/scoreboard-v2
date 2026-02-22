import React, { useCallback, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { Skeleton } from "moti/skeleton";
import Tag from "../Tag";
import Ionicons from "@expo/vector-icons/Ionicons";
import { calculateCompetitionStatus } from "../../helpers/calculateCompetitionStatus";
import { ccDefaultImage } from "../../mockImages/index";
import { SKELETON_THEMES } from "../Skeletons/skeletonConfig";

const { colors: skeletonColors } = SKELETON_THEMES.dark;

const LeagueItem = ({ league, onPress }) => {
  const [imageLoading, setImageLoading] = useState(true);

  const leagueStatus = calculateCompetitionStatus(league);
  const leagueParticipantsLength = league.leagueParticipants.length;
  const maxPlayers = league.maxPlayers;
  const location = `${league.location.city}, ${league.location.countryCode}`;
  const numberOfPlayers = `${leagueParticipantsLength} / ${maxPlayers}`;

  return (
    <CarouselContainer>
      <CarouselItem onPress={onPress}>
        <ImageWrapper>
          {imageLoading && (
            <ImageSkeletonOverlay>
              <Skeleton
                width="100%"
                height={200}
                radius={10}
                colors={skeletonColors}
              />
            </ImageSkeletonOverlay>
          )}
          <LeagueImage
            source={
              league.leagueImage ? { uri: league.leagueImage } : ccDefaultImage
            }
            onLoadEnd={() => setImageLoading(false)}
          >
            <Overlay />
            <LeagueDetailsContainer>
              <TagContainer>
                <Tag name={league.leagueType} />
                <Tag name={leagueStatus?.status} color={leagueStatus?.color} />
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
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <LeagueLocation>{location || ""}</LeagueLocation>
                  <Ionicons
                    name="location"
                    size={15}
                    color="#286EFA"
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
};

const VerticalLeagueCarousel = ({ navigationRoute, leagues }) => {
  const navigation = useNavigation();

  const navigateTo = useCallback(
    (leagueId) => navigation.navigate(navigationRoute, { leagueId }),
    [navigation, navigationRoute],
  );

  return (
    <FlatList
      data={leagues}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item: league }) => (
        <LeagueItem league={league} onPress={() => navigateTo(league.id)} />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 50 }}
    />
  );
};

const ImageSkeletonOverlay = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
});

const CarouselContainer = styled.ScrollView({});

const CarouselItem = styled(TouchableOpacity)({
  marginVertical: 15,
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

const Overlay = styled(View)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.2)",
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

export default VerticalLeagueCarousel;
