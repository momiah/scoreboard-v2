import React, { useState, useEffect, useContext } from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import styled from "styled-components/native";
import { GameContext } from "../../../context/GameContext";
import { UserContext } from "../../../context/UserContext";
import MedalDisplay from "../MedalDisplay";
import PlayerDetails from "../../Modals/PlayerDetailsModal";

const PlayerPerformance = ({ playersData, leagueId }) => {
  const { refreshing, findRankIndex, recentGameResult } =
    useContext(GameContext);
  const { fetchPlayersToSort, loading, setLoading } = useContext(UserContext);

  const [showPlayerDetails, setShowPlayerDetails] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchPlayersToSort(leagueId);
  };

  useEffect(() => {
    fetchPlayersToSort(leagueId);
  }, []);

  // const runcalculatePlayerPerformance = async () => {
  // Reverse the array to process the last game first
  //   const reversedGames = [...games].reverse();

  //   for (const game of reversedGames) {
  //     const playersToUpdate = await calculatePlayerPerformance(game, retrievePlayers);
  //     await updatePlayers(playersToUpdate);
  //   }
  // };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#00152B",
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const renderPlayer = ({ item: player, index }) => {
    const playerXp = player.XP;
    const rankLevel = findRankIndex(playerXp) + 1;

    return (
      <TableRow
        key={player}
        onPress={() => {
          setShowPlayerDetails(true);
          setSelectedPlayer(player);
        }}
      >
        {/* <GradientOverlay
          colors={["rgba(0, 0, 0, 0.6)", "rgba(0, 0, 0, 0.1)"]}
          end={{ x: 0.8, y: 3 }}
          locations={[0.1, 0.4]}
        /> */}
        <TableCell>
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
        </TableCell>
        <PlayerNameCell>
          <PlayerName>{player.id}</PlayerName>
          {recentGameResult(player.resultLog)}
        </PlayerNameCell>
        <TableCell>
          <StatTitle>Wins</StatTitle>
          <Stat>{player.numberOfWins}</Stat>
        </TableCell>
        <TableCell>
          <StatTitle>XP</StatTitle>
          <Stat>{playerXp.toFixed(0)}</Stat>
        </TableCell>
        <TableCell>
          <MedalDisplay xp={playerXp.toFixed(0)} size={45} />
          {/* </TableCell>
        <TableCell> */}
          <Stat style={{ fontSize: 12 }}>{rankLevel}</Stat>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <TableContainer>
      {/* <ResetPlayerStats onPress={() => resetPlayerStats()}>
        <Text>Reset Player Stats</Text>
      </ResetPlayerStats>
      <ResetPlayerStats onPress={() => resetAllPlayerStats()}>
        <Text>Reset All Players</Text>
      </ResetPlayerStats>
      <ResetPlayerStats onPress={() => runcalculatePlayerPerformance()}>
        <Text>Run New Algo</Text>
      </ResetPlayerStats> */}
      <FlatList
        data={playersData}
        renderItem={renderPlayer}
        keyExtractor={(player) => player.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {showPlayerDetails && (
        <PlayerDetails
          playersData={playersData}
          selectedPlayer={selectedPlayer}
          showPlayerDetails={showPlayerDetails}
          setShowPlayerDetails={setShowPlayerDetails}
        />
      )}
    </TableContainer>
  );
};

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

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
});

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
});

const TableRow = styled.TouchableOpacity({
  flexDirection: "row",
  // backgroundColor: "#001123",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
  borderTopWidth: 1,
  borderColor: "1px solid rgb(9, 33, 62)",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  paddingLeft: 10,
  paddingRight: 20,
  borderTopWidth: 1,
  width: 130,
  borderColor: "1px solid rgb(9, 33, 62)",
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
});

export default PlayerPerformance;
