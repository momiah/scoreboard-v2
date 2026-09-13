import React, { useState, useEffect, useMemo } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import TeamDetails from "../../Modals/TeamDetailsModal";
import PerformanceRow from "../Player/PerformanceRow";
import LoadingOverlay from "../../LoadingOverlay";

const PAGE_SIZE = 25;

/**
 * @param {{ leagueTeams?: any, ladder?: any }} props
 */
const TeamPerformance = ({ leagueTeams, ladder = null }) => {
  const navigation = useNavigation();
  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [team, setTeam] = useState({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loading = !leagueTeams;

  const sortedTeams = useMemo(() => {
    if (!leagueTeams) return [];
    return [...leagueTeams]
      .filter((t) => t.teamKey && Array.isArray(t.team)) // ← filters out user profiles
      .sort((a, b) => {
        if (b.numberOfWins !== a.numberOfWins)
          return b.numberOfWins - a.numberOfWins;
        if (b.totalPointDifference !== a.totalPointDifference)
          return b.totalPointDifference - a.totalPointDifference;
        return b.averagePointDifference - a.averagePointDifference;
      });
  }, [leagueTeams]);

  // Render 25 rows at a time and reveal more on scroll, so a 2000+ team ladder
  // doesn't mount every row at once.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortedTeams]);

  const visibleTeams = useMemo(
    () => sortedTeams.slice(0, visibleCount),
    [sortedTeams, visibleCount],
  );

  const handleLoadMore = () => {
    setVisibleCount((count) =>
      count < sortedTeams.length ? count + PAGE_SIZE : count,
    );
  };

  // On a ladder the tab shows only the top page; the full standings open in a
  // dedicated paginated screen. Leagues/tournaments keep loading inline.
  const showViewAll = !!ladder && sortedTeams.length > PAGE_SIZE;

  const handleViewAll = () => {
    navigation.navigate("LadderStandings", {
      ladderId: ladder.ladderId,
      mode: "teams",
      ladderName: ladder.name,
    });
  };

  const renderTeam = ({ item: team, index }) => (
    <PerformanceRow
      team={team}
      rank={index + 1}
      ladder={ladder}
      onPress={(pressed) => {
        if (ladder) {
          navigation.navigate("TeamDetails", { team: pressed });
        } else {
          setTeam(pressed);
          setShowTeamDetails(true);
        }
      }}
    />
  );

  return (
    <TableContainer>
      <LoadingOverlay visible={loading} loadingText="Teams" />

      {!loading && leagueTeams.length === 0 ? (
        <FallbackMessage>Add a game to see Team Performance 📈</FallbackMessage>
      ) : (
        <FlatList
          data={visibleTeams}
          renderItem={renderTeam}
          keyExtractor={(team, index) => (team.team ?? []).join("-") + index}
          onEndReached={showViewAll ? undefined : handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            showViewAll ? (
              <ViewAllButton onPress={handleViewAll} activeOpacity={0.85}>
                <ViewAllText>View all teams</ViewAllText>
              </ViewAllButton>
            ) : visibleTeams.length < sortedTeams.length ? (
              <FooterSpinner color="#00A2FF" />
            ) : null
          }
        />
      )}

      {showTeamDetails && (
        <TeamDetails
          showTeamDetails={showTeamDetails}
          setShowTeamDetails={setShowTeamDetails}
          teamStats={team}
        />
      )}
    </TableContainer>
  );
};

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
});

const FallbackMessage = styled.Text({
  color: "#aaa",
  fontStyle: "italic",
  fontSize: 16,
  textAlign: "center",
  marginTop: 50,
});

const FooterSpinner = styled(ActivityIndicator)({
  paddingVertical: 16,
});

const ViewAllButton = styled.TouchableOpacity({
  marginTop: 12,
  marginHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#00A2FF",
  alignItems: "center",
});

const ViewAllText = styled.Text({
  color: "#00A2FF",
  fontSize: 14,
  fontWeight: "bold",
});

export default TeamPerformance;
