import React, { useContext, useMemo } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";

import SubHeader from "../SubHeader";
import Tag from "../Tag";
import ActionPlaceholder from "../ActionPlaceholder";
import { HorizontalLeagueCarouselSkeleton } from "../Skeletons/HomeSkeleton";
import HorizontalCardCarousel, {
  CardTagContainer,
  CardTitle,
  CardSubtitle,
  CardRow,
} from "./HorizontalCardCarousel";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { calculateCompetitionStatus } from "../../helpers/calculateCompetitionStatus";
import { getLocalFirstCompetitions } from "../../helpers/getLocalFirstCompetitions";
import { normalizeCompetitionData } from "../../helpers/normalizeCompetitionData";
import { ccDefaultImage } from "../../mockImages/index";
import type { League, NormalizedCompetition } from "@shared/types";

interface HomeLeagueSectionProps {
  loading: boolean;
  /** Opens the create-league flow (already gated on being signed in). */
  onCreatePress: () => void;
}

const HomeLeagueSection: React.FC<HomeLeagueSectionProps> = ({
  loading,
  onCreatePress,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { upcomingLeagues } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const publicLeagues = useMemo(
    () =>
      getLocalFirstCompetitions({
        competitions: (upcomingLeagues ?? []).map((league: League) =>
          normalizeCompetitionData({
            rawData: league,
            competitionType: "league",
          }),
        ) as NormalizedCompetition[],
        checkEndDate: true,
        currentUser,
      }),
    [upcomingLeagues, currentUser],
  );

  return (
    <>
      <SubHeader
        title="Upcoming Leagues"
        actionText="Browse Leagues"
        navigationRoute={"Leagues"}
      />
      {loading ? (
        <HorizontalLeagueCarouselSkeleton />
      ) : publicLeagues.length > 0 ? (
        <HorizontalCardCarousel
          cards={publicLeagues.map((league, index) => {
            const status = calculateCompetitionStatus(league);
            const numberOfPlayers = `${(league.participants ?? []).length} / ${league.maxPlayers}`;
            const location = `${league.location?.city}, ${league.location?.countryCode}`;

            return {
              key: league.id || String(index),
              source: league.image
                ? { uri: league.image }
                : ccDefaultImage,
              onPress: () =>
                navigation.navigate("League", { leagueId: league.id }),
              content: (
                <>
                  <CardTagContainer>
                    <Tag name={league.type} />
                    <Tag name={status?.status} color={status?.color} />
                  </CardTagContainer>

                  <PlayersRow>
                    <Tag
                      name={numberOfPlayers}
                      color="rgba(0, 0, 0, 0.7)"
                      iconColor="#00A2FF"
                      iconSize={15}
                      icon="person"
                      iconPosition="right"
                      bold
                    />
                  </PlayersRow>

                  <CardTitle>{league.name}</CardTitle>
                  <CardRow>
                    <CardSubtitle>
                      {league.location?.courtName || ""}
                    </CardSubtitle>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <CardSubtitle>{location || ""}</CardSubtitle>
                      <Ionicons
                        name={"location"}
                        size={15}
                        color={"#286EFA"}
                        style={{ marginLeft: 5 }}
                      />
                    </View>
                  </CardRow>
                </>
              ),
            };
          })}
        />
      ) : (
        <ActionPlaceholder
          message="No upcoming leagues in your area. Create one for your community!"
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

const PlayersRow = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      paddingBottom: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    }}
  >
    {children}
  </View>
);

export default HomeLeagueSection;
