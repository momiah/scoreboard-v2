import React, { useCallback, useContext, useMemo, useState } from "react";
import { Dimensions, View, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";

import SubHeader from "../SubHeader";
import Tag from "../Tag";
import { HorizontalLeagueCarouselSkeleton } from "../Skeletons/HomeSkeleton";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { ccImageEndpoint, type Club } from "@shared";
import { SkeletonPulse, SkeletonBlock } from "../Skeletons/skeletonConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Full-width card with a peek of the next one, mirroring the league carousel.
const ITEM_WIDTH = SCREEN_WIDTH - 80;
const ITEM_SPACING = 20;

const HomeClubsSection: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { upcomingClubs, upcomingClubsLoading } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const clubsToShow = useMemo(() => upcomingClubs.slice(0, 6), [upcomingClubs]);

  const navigateToClub = useCallback(
    (club: Club) => {
      if (!club.clubId) return;
      navigation.navigate("Club", { clubId: club.clubId });
    },
    [navigation],
  );

  const placeholderAction = useCallback(() => {
    if (!currentUser) navigation.navigate("Login");
  }, [currentUser, navigation]);

  return (
    <>
      <SubHeader
        title="Clubs"
        onIconPress={() => {}}
        actionText=""
        navigationRoute=""
      />
      {upcomingClubsLoading ? (
        <HorizontalLeagueCarouselSkeleton />
      ) : clubsToShow.length > 0 ? (
        <CarouselContainer
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH + ITEM_SPACING}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          {clubsToShow.map((club, index) => (
            <ClubCarouselItem
              key={club.clubId || index}
              club={club}
              onPress={() => navigateToClub(club)}
            />
          ))}
        </CarouselContainer>
      ) : (
        <EmptyArea onPress={placeholderAction}>
          <Ionicons name="people-outline" size={40} color="#00A2FF" />
          <EmptyText>
            {currentUser
              ? "No clubs to show yet. Create one from the + menu!"
              : "Sign in to discover clubs for your community."}
          </EmptyText>
        </EmptyArea>
      )}
    </>
  );
};

// ── ClubCarouselItem

interface ClubCarouselItemProps {
  club: Club;
  onPress: () => void;
}

const ClubCarouselItem: React.FC<ClubCarouselItemProps> = ({
  club,
  onPress,
}) => {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <CarouselItem
      onPress={onPress}
      style={{ width: ITEM_WIDTH, marginRight: ITEM_SPACING }}
    >
      <ImageWrapper>
        <ClubImage
          source={{ uri: club.clubImage || ccImageEndpoint }}
          onLoadEnd={() => setImageLoading(false)}
        >
          <Overlay />
          <ClubDetailsContainer>
            <TagContainer>
              <Tag name="Club" color="#FAB234" bold />
            </TagContainer>

            <ClubName numberOfLines={1}>{club.clubName || ""}</ClubName>
            <LocationRow>
              <ClubLocation numberOfLines={1}>
                {club.clubLocation || ""}
              </ClubLocation>
              <Ionicons
                name="location"
                size={15}
                color="#286EFA"
                style={{ marginLeft: 5 }}
              />
            </LocationRow>
          </ClubDetailsContainer>
        </ClubImage>

        {imageLoading && (
          <ImageSkeletonOverlay>
            <SkeletonPulse>
              <SkeletonBlock width="100%" height={200} />
            </SkeletonPulse>
          </ImageSkeletonOverlay>
        )}
      </ImageWrapper>
    </CarouselItem>
  );
};

// ── Styles (mirror the horizontal league carousel)

const CarouselContainer = styled.ScrollView({
  height: 200,
  marginBottom: 40,
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

const ClubImage = styled.ImageBackground.attrs({
  imageStyle: {
    resizeMode: "cover",
  },
})({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end",
  alignItems: "center",
});

const ClubDetailsContainer = styled.View({
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

const LocationRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
});

const ClubName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

const ClubLocation = styled.Text({
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

const ImageSkeletonOverlay = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
});

const EmptyArea = styled(TouchableOpacity)({
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#0A1F33",
  borderRadius: 10,
  minHeight: 160,
  width: "100%",
  marginVertical: 10,
  marginBottom: 40,
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderStyle: "dashed",
  gap: 10,
  paddingHorizontal: 24,
});

const EmptyText = styled.Text({
  color: "#aaa",
  fontSize: 14,
  fontStyle: "italic",
  textAlign: "center",
});

export default HomeClubsSection;
