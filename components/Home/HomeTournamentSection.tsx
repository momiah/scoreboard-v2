import React, { useContext, useMemo } from "react";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";

import SubHeader from "../SubHeader";
import ActionPlaceholder from "../ActionPlaceholder";
import TournamentGrid from "../Tournaments/TournamentGrid";
import { TournamentGridSkeleton } from "../Skeletons/HomeSkeleton";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { getLocalFirstCompetitions } from "../../helpers/getLocalFirstCompetitions";
import { normalizeCompetitionData } from "../../helpers/normalizeCompetitionData";
import type { Tournament, NormalizedCompetition } from "@shared/types";

interface HomeTournamentSectionProps {
  loading: boolean;
  /** Opens the create-tournament flow (already gated on being signed in). */
  onCreatePress: () => void;
}

// Tournaments keep the existing grid layout (also used on the Tournaments
// screen); this component only encapsulates the home-section wiring.
const HomeTournamentSection: React.FC<HomeTournamentSectionProps> = ({
  loading,
  onCreatePress,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { upcomingTournaments } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const publicTournaments = useMemo(
    () =>
      getLocalFirstCompetitions({
        competitions: (upcomingTournaments ?? []).map(
          (tournament: Tournament) =>
            normalizeCompetitionData({
              rawData: tournament,
              competitionType: "tournament",
            }),
        ) as NormalizedCompetition[],
        currentUser,
      }),
    [upcomingTournaments, currentUser],
  );

  return (
    <>
      <SubHeader
        title="Upcoming Tournaments"
        actionText="Browse Tournaments"
        navigationRoute={"Tournaments"}
      />
      {loading ? (
        <TournamentGridSkeleton />
      ) : publicTournaments.length > 0 ? (
        <TournamentGrid
          tournaments={publicTournaments}
          navigationRoute={"Tournament"}
        />
      ) : (
        <ActionPlaceholder
          message="No upcoming tournaments in your area. Create one for your community!"
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

export default HomeTournamentSection;
