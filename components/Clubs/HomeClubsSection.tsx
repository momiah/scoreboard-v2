import React, { useCallback, useContext, useMemo, useState } from "react";
import { Dimensions, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";

import SubHeader from "../SubHeader";
import Tag from "../Tag";
import { TournamentGridSkeleton } from "../Skeletons/HomeSkeleton";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { ccImageEndpoint, type Club } from "@shared";
import { SkeletonPulse, SkeletonBlock } from "../Skeletons/skeletonConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const NAME_CLIP_LENGTH = IS_SMALL_SCREEN ? 11 : 15;

const HomeClubsSection: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { upcomingClubs, upcomingClubsLoading } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const clubsToShow = useMemo(() => upcomingClubs.slice(0, 4), [upcomingClubs]);

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
        <TournamentGridSkeleton />
      ) : clubsToShow.length > 0 ? (
        <Container>
          {clubsToShow.map((club, index) => (
            <ClubCardItem
              key={club.clubId || index}
              club={club}
              onPress={() => navigateToClub(club)}
            />
          ))}
        </Container>
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

// ── ClubCardItem

interface ClubCardItemProps {
  club: Club;
  onPress: () => void;
}

const ClubCardItem: React.FC<ClubCardItemProps> = ({ club, onPress }) => {
  const [imageLoading, setImageLoading] = useState(true);

  const nameClipped = club.clubName
    ? club.clubName.length > NAME_CLIP_LENGTH
      ? club.clubName.slice(0, NAME_CLIP_LENGTH) + "..."
      : club.clubName
    : "";

  return (
    <ClubContainer onPress={onPress}>
      <ClubCard>
        <ClubImageContainer>
          {imageLoading && (
            <ImageSkeletonOverlay>
              <SkeletonPulse>
                <SkeletonBlock width="100%" height={120} />
              </SkeletonPulse>
            </ImageSkeletonOverlay>
          )}
          <ClubImage
            source={{ uri: club.clubImage || ccImageEndpoint }}
            resizeMode="cover"
            onLoadEnd={() => setImageLoading(false)}
          >
            <StatusTagContainer>
              <Tag name="Club" color="#FAB234" fontSize={9} bold />
            </StatusTagContainer>
          </ClubImage>
        </ClubImageContainer>

        <ClubInfo>
          <ClubName numberOfLines={1}>{nameClipped}</ClubName>
          <ClubLocation numberOfLines={1}>
            {club.clubLocation || ""}
          </ClubLocation>
        </ClubInfo>
      </ClubCard>
    </ClubContainer>
  );
};

// ── Styles

const Container = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: IS_SMALL_SCREEN ? 8 : 15,
  paddingHorizontal: 10,
  marginBottom: 40,
});

const ClubContainer = styled.TouchableOpacity({
  width: "47%",
});

const ClubCard = styled.View({
  borderRadius: 12,
  overflow: "hidden",
});

const ClubImageContainer = styled.View({
  height: 120,
  position: "relative",
});

const ImageSkeletonOverlay = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
});

const ClubImage = styled.ImageBackground({
  width: "100%",
  height: "100%",
  alignItems: "flex-end",
});

const StatusTagContainer = styled.View({
  position: "absolute",
  top: 8,
  right: 8,
});

const ClubInfo = styled.View({
  padding: 10,
  borderWidth: 1,
  borderColor: "#192336",
});

const ClubName = styled.Text({
  color: "white",
  fontSize: IS_SMALL_SCREEN ? 13 : 16,
  fontWeight: "bold",
  marginBottom: 4,
});

const ClubLocation = styled.Text({
  fontSize: IS_SMALL_SCREEN ? 11 : 13,
  color: "white",
  borderRadius: 5,
});

const EmptyArea = styled(TouchableOpacity)({
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#0A1F33",
  borderRadius: 10,
  minHeight: 160,
  width: "100%",
  marginVertical: 10,
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
