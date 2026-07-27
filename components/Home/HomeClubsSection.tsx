import React, { useCallback, useContext, useMemo } from "react";
import { View, TouchableOpacity } from "react-native";
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
import HorizontalCardCarousel, {
  CardTagContainer,
  CardTitle,
  CardSubtitle,
} from "./HorizontalCardCarousel";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { ccImageEndpoint, type Club } from "@shared";

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
        <HorizontalCardCarousel
          cards={clubsToShow.map((club, index) => ({
            key: club.clubId || String(index),
            source: { uri: club.clubImage || ccImageEndpoint },
            onPress: () => navigateToClub(club),
            content: (
              <>
                <CardTagContainer>
                  <Tag name="Club" color="#FAB234" bold />
                </CardTagContainer>

                <CardTitle numberOfLines={1}>{club.clubName || ""}</CardTitle>
                <LocationRow>
                  <CardSubtitle numberOfLines={1}>
                    {club.clubLocation || ""}
                  </CardSubtitle>
                  <Ionicons
                    name="location"
                    size={15}
                    color="#286EFA"
                    style={{ marginLeft: 5 }}
                  />
                </LocationRow>
              </>
            ),
          }))}
        />
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

const LocationRow = styled(View)({
  flexDirection: "row",
  alignItems: "center",
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
