import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { ActivityIndicator, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import { sortLadderParticipantsByPlacement } from "@shared/helpers";
import { UserContext } from "../../../context/UserContext";
import PlayerDetails from "../../Modals/PlayerDetailsModal";
import PerformanceRow from "./PerformanceRow";
import { enrichPlayers } from "../../../helpers/enrichPlayers";
import LoadingOverlay from "../../LoadingOverlay";

const PAGE_SIZE = 25;

/**
 * @param {{ playersData: any[], ladder?: any }} props
 */
const PlayerPerformance = ({ playersData, ladder = null }) => {
  const { getUserById } = useContext(UserContext);
  const navigation = useNavigation();
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playersWithUserData, setPlayersWithUserData] = useState([]);
  const [rankedCount, setRankedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [requestedCount, setRequestedCount] = useState(PAGE_SIZE);

  // Rank the raw participants once. For a ladder the per-ladder XP is the CP, so
  // the shared comparator ranks on raw data before enrichPlayers overwrites XP
  // with the global rank XP the medal needs; 0-win players are unranked below.
  // Sorting on raw data (no per-player fetch) lets us enrich only the visible
  // page — enrichPlayers reads one user doc per player, so enriching all of a
  // 2000+ ladder up front is what makes the tab lag.
  const sorted = useMemo(() => {
    if (!playersData || playersData.length === 0) {
      return { list: [], rankedCount: 0 };
    }
    if (ladder) {
      const ranked = sortLadderParticipantsByPlacement(playersData);
      const rankedIds = new Set(ranked.map((p) => p.userId));
      const unranked = playersData.filter((p) => !rankedIds.has(p.userId));
      return { list: [...ranked, ...unranked], rankedCount: ranked.length };
    }
    const list = [...playersData].sort((a, b) => {
      if ((b.numberOfWins || 0) !== (a.numberOfWins || 0)) {
        return (b.numberOfWins || 0) - (a.numberOfWins || 0);
      }
      if ((b.totalPointDifference || 0) !== (a.totalPointDifference || 0)) {
        return (b.totalPointDifference || 0) - (a.totalPointDifference || 0);
      }
      return (b.competitionXP || 0) - (a.competitionXP || 0);
    });
    return { list, rankedCount: list.length };
  }, [playersData, ladder]);

  // Cursor tracks which dataset we've enriched and how far into it, so a data
  // change restarts from the top and scrolling only fetches the new slice.
  const cursorRef = useRef({ key: null, count: 0 });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cursorRef.current.key !== sorted) {
        cursorRef.current = { key: sorted, count: 0 };
        setPlayersWithUserData([]);
        setRankedCount(sorted.rankedCount);
        setLoading(true);
      }

      if (sorted.list.length === 0) {
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const from = cursorRef.current.count;
      const target = Math.min(requestedCount, sorted.list.length);
      if (target <= from) {
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const chunk = await enrichPlayers(
        getUserById,
        sorted.list.slice(from, target),
      );
      if (cancelled) return;

      cursorRef.current.count = target;
      setPlayersWithUserData((prev) =>
        from === 0 ? chunk : [...prev, ...chunk],
      );
      setLoading(false);
      setLoadingMore(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sorted, requestedCount, getUserById]);

  const handleLoadMore = () => {
    if (loading || loadingMore) return;
    if (cursorRef.current.count >= sorted.list.length) return;
    setLoadingMore(true);
    setRequestedCount((count) => count + PAGE_SIZE);
  };

  // On a ladder the tab shows only the top page; the full standings open in a
  // dedicated paginated screen. Leagues/tournaments keep loading inline.
  const showViewAll = !!ladder && sorted.list.length > PAGE_SIZE;

  const handleViewAll = () => {
    navigation.navigate("LadderStandings", {
      ladderId: ladder.ladderId,
      mode: "players",
      ladderName: ladder.name,
    });
  };

  const renderPlayer = ({ item: player, index }) => (
    <PerformanceRow
      key={player.userId}
      player={player}
      rank={index < rankedCount ? index + 1 : 0}
      ladder={ladder}
      onPress={(p) => {
        setSelectedPlayer(p);
        setShowPlayerDetails(true);
      }}
    />
  );

  return (
    <TableContainer>
      <LoadingOverlay visible={loading} />

      {!loading && playersWithUserData.length === 0 && (
        <EmptyState>No players available for performance analysis.</EmptyState>
      )}

      <FlatList
        data={playersWithUserData}
        renderItem={renderPlayer}
        keyExtractor={(player) => player.userId}
        onEndReached={showViewAll ? undefined : handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          showViewAll ? (
            <ViewAllButton onPress={handleViewAll} activeOpacity={0.85}>
              <ViewAllText>View all players</ViewAllText>
            </ViewAllButton>
          ) : loadingMore ? (
            <FooterSpinner color="#00A2FF" />
          ) : null
        }
      />

      {showPlayerDetails && (
        <PlayerDetails
          selectedPlayer={selectedPlayer}
          showPlayerDetails={showPlayerDetails}
          setShowPlayerDetails={setShowPlayerDetails}
        />
      )}
    </TableContainer>
  );
};

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
});

const EmptyState = styled.Text({
  color: "#aaa",
  fontSize: 14,
  textAlign: "center",
  flex: 1,
  marginTop: 40,
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

export default PlayerPerformance;

// const runcalculatePlayerPerformance = async () => {
// Reverse the array to process the last game first
//   const reversedGames = [...games].reverse();

//   for (const game of reversedGames) {
//     const playersToUpdate = await calculatePlayerPerformance(game, retrievePlayersFromLeague);
//     await updatePlayers(playersToUpdate);
//   }
// };

{
  /* <ResetPlayerStats onPress={() => resetPlayerStats()}>
  <Text>Reset Player Stats</Text>
  </ResetPlayerStats>
  <ResetPlayerStats onPress={() => resetAllPlayerStats()}>
  <Text>Reset All Players</Text>
  </ResetPlayerStats>
  <ResetPlayerStats onPress={() => runcalculatePlayerPerformance()}>
  <Text>Run New Algo</Text>
  </ResetPlayerStats> */
}

// const ResetPlayerStats = styled.TouchableOpacity({
//   display: "flex",
//   justifyContent: "center",
//   alignItems: "center",
//   fontSize: 24,
//   fontWeight: "bold",
//   marginBottom: 15,
//   marginTop: 15,
//   padding: 10,
//   borderRadius: 8,
//   backgroundColor: "#00A2FF",
// });
