import React, { useCallback, useContext, useMemo, useState } from "react";
import { TouchableOpacity } from "react-native";
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

/**
 * Home “Clubs” block — mirrors SubHeader + 2× grid pattern used for upcoming tournaments.
 */
const HomeClubsSection: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { upcomingClubs, upcomingClubsLoading, fetchUpcomingClubs } =
    useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const [imageLoadedById, setImageLoadedById] = useState<Record<string, boolean>>(
    {},
  );

  const clubsToShow = useMemo(() => upcomingClubs.slice(0, 4), [upcomingClubs]);

  const navigateToClub = useCallback(
    (doc: Club) => {
      const id = doc.clubId;
      if (!id) return;
      navigation.navigate("Club", { clubId: id });
    },
    [navigation],
  );

  const markImageLoaded = useCallback((id: string) => {
    setImageLoadedById((prev) => ({ ...prev, [id]: true }));
  }, []);

  const placeholderAction = useCallback(() => {
    if (currentUser) {
      void fetchUpcomingClubs();
      return;
    }
    navigation.navigate("Login");
  }, [currentUser, fetchUpcomingClubs, navigation]);

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
        <Grid>
          {clubsToShow.map((doc) => {
            const rowId = doc.clubId || doc.id || doc.clubName;
            const name =
              doc.clubName.length > 18
                ? `${doc.clubName.slice(0, 18)}…`
                : doc.clubName;
            const imageUri = doc.clubImage || ccImageEndpoint;
            const loaded = imageLoadedById[rowId];

            return (
              <CardWrap key={rowId} onPress={() => navigateToClub(doc)}>
                <Card>
                  <ImageBox>
                    {!loaded && (
                      <ImageSkeletonOverlay>
                        <SkeletonPulse>
                          <SkeletonBlock width="100%" height={120} />
                        </SkeletonPulse>
                      </ImageSkeletonOverlay>
                    )}
                    <HeroImage
                      source={{ uri: imageUri }}
                      resizeMode="cover"
                      onLoadEnd={() => markImageLoaded(rowId)}
                    >
                      <TopTag>
                        <Tag name="Club" color="#FAB234" fontSize={9} bold />
                      </TopTag>
                    </HeroImage>
                  </ImageBox>
                  <Info>
                    <Name>{name}</Name>
                    <LocLine numberOfLines={2}>{doc.clubLocation || ""}</LocLine>
                  </Info>
                </Card>
              </CardWrap>
            );
          })}
        </Grid>
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

const Grid = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 15,
  paddingHorizontal: 10,
  marginBottom: 40,
});

const CardWrap = styled.TouchableOpacity({
  width: "47%",
});

const Card = styled.View({
  borderRadius: 12,
  overflow: "hidden",
});

const ImageBox = styled.View({
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

const HeroImage = styled.ImageBackground({
  width: "100%",
  height: "100%",
  alignItems: "flex-end",
});

const TopTag = styled.View({
  position: "absolute",
  top: 8,
  right: 8,
});

const Info = styled.View({
  padding: 10,
  border: "1px solid #192336",
});

const Name = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 4,
});

const LocLine = styled.Text({
  fontSize: 13,
  color: "#ccc",
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
