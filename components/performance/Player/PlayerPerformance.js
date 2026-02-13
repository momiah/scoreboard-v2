import React, { useState, useEffect, useContext } from "react";
import { FlatList, ActivityIndicator, View, Text } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../../context/GameContext";
import { UserContext } from "../../../context/UserContext";
import MedalDisplay from "../MedalDisplay";
import PlayerDetails from "../../Modals/PlayerDetailsModal";
import { enrichPlayers } from "../../../helpers/enrichPlayers";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import { CircleSkeleton, SkeletonWrapper, TextSkeleton } from "../../Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../../Skeletons/skeletonConfig";

const PlayerPerformance = ({ playersData }) => {
  const { findRankIndex, recentGameResult } = useContext(GameContext);
  const { getUserById } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playersWithUserData, setPlayersWithUserData] = useState([]);

  useEffect(() => {
    const loadEnrichedPlayers = async () => {
      setLoading(true);
      if (playersData.length > 0) {
        const enriched = await enrichPlayers(getUserById, playersData);
        setPlayersWithUserData(enriched);
      } else {
        setPlayersWithUserData([]);
      }

      setLoading(false);
    };

    loadEnrichedPlayers();
  }, [playersData, getUserById]);



  const renderPlayer = ({ item: player, index }) => {
    const playerXp = player.XP || 0;
    const pointDifference = player.totalPointDifference || 0;
    const rankLevel = findRankIndex(playerXp) + 1;
    const displayName = formatDisplayName(player);

    return (
      <TableRow
        key={player.userId}
        onPress={() => {
          setShowPlayerDetails(true);
          setSelectedPlayer(player);
        }}
      >
        <SkeletonWrapper show={loading} height={30} radius={8} config={SKELETON_THEMES.dark}>
          <TableCellPlayerGroup>
            <RankCell>
              <Rank>
                {index + 1}
                {index === 0
                  ? "st"
                  : index === 1
                    ? "nd"
                    : index === 2
                      ? "rd"
                      : "th"}
              </Rank>
            </RankCell>
            <PlayerNameCell>
              <PlayerName>{displayName}</PlayerName>
              {recentGameResult(player.resultLog)}
            </PlayerNameCell>
          </TableCellPlayerGroup>
        </SkeletonWrapper>
        <TableCellStatsGroupContainer>
          <SkeletonWrapper show={loading} height={30} radius={8} config={SKELETON_THEMES.dark}>
            <TableCellStatsGroupContent>
              <TableCell>
                <StatTitle>Wins</StatTitle>
                <Stat>{player.numberOfWins}</Stat>
              </TableCell>
              <TableCell>
                <StatTitle>PD</StatTitle>
                <Stat style={{ color: pointDifference < 0 ? "red" : "green" }}>
                  {pointDifference}
                </Stat>
              </TableCell>
            </TableCellStatsGroupContent>
          </SkeletonWrapper>
        </TableCellStatsGroupContainer>

        <TableCellMedal>
          <CircleSkeleton show={loading} size={45} config={SKELETON_THEMES.dark}>
            <MedalDisplay xp={playerXp.toFixed(0)} size={45} />
          </CircleSkeleton>
          <StatContainer>
            <SkeletonWrapper show={loading} width={20} radius={4} config={SKELETON_THEMES.dark}>
              <Stat style={{ fontSize: 12 }}>{rankLevel}</Stat>
            </SkeletonWrapper>
          </StatContainer>
        </TableCellMedal>
      </TableRow>
    );
  };

  if (playersData.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#aaa", fontSize: 14, textAlign: "center" }}>
          No players available for performance analysis.
        </Text>
      </View>
    );
  }

  // Use playersData while loading to show skeletons, otherwise use enriched data
  const displayData = loading ? playersData : playersWithUserData;

  return (
    <TableContainer>
      <FlatList
        data={displayData}
        renderItem={renderPlayer}
        keyExtractor={(player) => player.userId}
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

const TableRow = styled.TouchableOpacity({
  flexDirection: "row",
  borderTopWidth: 1,
  borderColor: "1px solid rgb(9, 33, 62)",
  paddingTop: 15,
  paddingBottom: 15,
  alignItems: "center",
  gap: 10,
  paddingLeft: 20,

  // backgroundColor: "#001123",
});

const TableCellPlayerGroup = styled.View({
  width: 180,
  height: 30,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",

});

const TableCellStatsGroupContainer = styled.View({
  flex: 2,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
});

const TableCellStatsGroupContent = styled.View({
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});


const TableCellMedal = styled.View({
  flex: 1,
  gap: 5,
  justifyContent: "center",
  alignItems: "center",

});

const StatContainer = styled.View({


});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",

});

const RankCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "flex-start",

})

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: 140,


});

const PlayerName = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: "white",
});

const Rank = styled.Text({
  fontSize: 14,
  color: "#00A2FF",
  fontWeight: "bold",
});

const StatTitle = styled.Text({
  fontSize: 12,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: "white",
  textAlign: "center",
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
