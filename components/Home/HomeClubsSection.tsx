import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import { collection, getCountFromServer } from "firebase/firestore";

import SubHeader from "../SubHeader";
import Tag from "../Tag";
import ActionPlaceholder from "../ActionPlaceholder";
import { HorizontalLeagueCarouselSkeleton } from "../Skeletons/HomeSkeleton";
import HorizontalCardCarousel, {
  CardTagContainer,
  CardTitle,
  CardSubtitle,
} from "./HorizontalCardCarousel";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { db } from "../../services/firebase.config";
import { ccImageEndpoint, COLLECTION_NAMES, type Club } from "@shared";

interface HomeClubsSectionProps {
  /** Opens the create-club flow (already gated on being signed in). */
  onCreatePress: () => void;
}

const HomeClubsSection: React.FC<HomeClubsSectionProps> = ({
  onCreatePress,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { upcomingClubs, upcomingClubsLoading } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const clubsToShow = useMemo(() => upcomingClubs.slice(0, 6), [upcomingClubs]);

  // Member count (participants subcollection size) per club, for the card tag.
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      const entries = await Promise.all(
        clubsToShow.map(async (club) => {
          if (!club.clubId) return [null, 0] as const;
          try {
            const snap = await getCountFromServer(
              collection(
                db,
                COLLECTION_NAMES.clubs,
                club.clubId,
                "participants",
              ),
            );
            return [club.clubId, snap.data().count] as const;
          } catch (e) {
            console.error("Error counting club members:", e);
            return [club.clubId, 0] as const;
          }
        }),
      );

      if (cancelled) return;
      setMemberCounts(
        Object.fromEntries(entries.filter(([id]) => id)) as Record<
          string,
          number
        >,
      );
    };

    if (clubsToShow.length > 0) fetchCounts();

    return () => {
      cancelled = true;
    };
  }, [clubsToShow]);

  const navigateToClub = useCallback(
    (club: Club) => {
      if (!club.clubId) return;
      navigation.navigate("Club", { clubId: club.clubId });
    },
    [navigation],
  );

  return (
    <>
      <SubHeader
        title="Clubs"
        actionText="Browse Clubs"
        navigationRoute={"Clubs"}
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
                  <Tag
                    name={`${memberCounts[club.clubId] ?? 0} ${
                      (memberCounts[club.clubId] ?? 0) === 1
                        ? "Member"
                        : "Members"
                    }`}
                    color="rgba(0, 0, 0, 0.7)"
                    iconColor="#00A2FF"
                    iconSize={13}
                    icon="person"
                    iconPosition="right"
                    bold
                  />
                </CardTagContainer>

                <CardTitle numberOfLines={1}>{club.clubName || ""}</CardTitle>
                <LocationRow>
                  <CardSubtitle numberOfLines={1}>
                    {`${club.clubLocation.city}, ${club.clubLocation.country}`}
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
        <ActionPlaceholder
          message={
            currentUser
              ? "No clubs to show yet. Create one for your community!"
              : "No clubs yet. Sign in to make one for your community!"
          }
          icon="add-circle-outline"
          height={200}
          onPress={() =>
            currentUser ? onCreatePress() : navigation.navigate("Login")
          }
        />
      )}
    </>
  );
};

const LocationRow = styled(View)({
  flexDirection: "row",
  alignItems: "center",
});

export default HomeClubsSection;
