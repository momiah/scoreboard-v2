import React, { useState, useEffect, useContext } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../../context/GameContext";
import { calculatePlayerPerformance } from "../../../functions/calculatePlayerPerformance";
import MedalDisplay from "../MedalDisplay";
import PlayerDetails from "./PlayerDetails";
import { AntDesign } from "@expo/vector-icons";
import { getPlayersToUpdate } from "../../../functions/getPlayersToUpdate";

const PlayerPerformance = () => {
  const {
    games,
    setGames,
    retrieveGames,
    retrievePlayers,
    players,
    updatePlayers,
    resetAllPlayerStats,
    resetPlayerStats,
    refreshing,
  } = useContext(GameContext);
  const [playerStats, setPlayerStats] = useState({});
  const [sortedPlayers, setSortedPlayers] = useState([]);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState(null);
  const [playerName, setPlayerName] = useState("");

  const player = players.find((player) => player.id === playerName);
  const memberSince = player ? player.newPlayer.memberSince : null;

  useEffect(() => {
    const fetchData = async () => {
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };

    fetchData();
  }, [setGames]);

  const handleRefresh = async () => {
    const fetchData = async () => {
      // await fetchPlayers();
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };
    fetchData();
  };

  useEffect(() => {
    if (games.length > 0) {
      const stats = calculatePlayerPerformance(games);
      setPlayerStats(stats);

      // Sort players based on XP
      const sorted = Object.keys(stats).sort((a, b) => {
        const xpA = stats[a].XP + stats[a].totalPoints;
        const xpB = stats[b].XP + stats[b].totalPoints;
        return xpB - xpA;
      });
      setSortedPlayers(sorted);
    }
  }, [games]);

  const recentGameResult = (resultLog) => {
    const lastResult = resultLog[resultLog.length - 1]; // Get the last element without modifying the array

    const icon = lastResult === "W" ? "caretup" : "caretdown";
    const color = lastResult === "W" ? "green" : "red";

    return <AntDesign name={icon} size={10} color={color} />;
  };

  const runGetPlayersToUpdate = async () => {
    // Reverse the array to process the last game first
    const reversedGames = [...games].reverse();

    for (const game of reversedGames) {
      const playersToUpdate = await getPlayersToUpdate(game, retrievePlayers);
      await updatePlayers(playersToUpdate);
    }
    console.log("All players updated successfully");
  };

  // console.log("playerstats", JSON.stringify(playerStats, null, 2));
  // console.log("games🫵", JSON.stringify(games, null, 2));

  const renderPlayer = ({ item: playerName, index }) => (
    <TableRow
      key={playerName}
      onPress={() => {
        setSelectedPlayerStats(playerStats[playerName]);
        setShowPlayerDetails(true);
        setPlayerName(playerName);
      }}
    >
      <TableCell>
        <Rank>
          {index + 1}
          {index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}
        </Rank>
      </TableCell>
      <PlayerNameCell>
        <PlayerName>{playerName}</PlayerName>
        {recentGameResult(playerStats[playerName].resultLog)}
      </PlayerNameCell>
      <TableCell>
        <StatTitle>Wins</StatTitle>
        <Stat>{playerStats[playerName].numberOfWins}</Stat>
      </TableCell>
      <TableCell>
        <StatTitle>XP</StatTitle>
        <Stat>
          {playerStats[playerName].XP + playerStats[playerName].totalPoints}
        </Stat>
      </TableCell>
      <TableCell>
        <MedalDisplay
          xp={playerStats[playerName].XP + playerStats[playerName].totalPoints}
          size={45}
        />
      </TableCell>
    </TableRow>
  );

  return (
    <TableContainer>
      <ResetPlayerStats onPress={() => resetPlayerStats()}>
        <Text>Reset Player Stats</Text>
      </ResetPlayerStats>
      <ResetPlayerStats onPress={() => resetAllPlayerStats()}>
        <Text>Reset All Players</Text>
      </ResetPlayerStats>
      <ResetPlayerStats onPress={() => runGetPlayersToUpdate()}>
        <Text>Run New Algo</Text>
      </ResetPlayerStats>
      <FlatList
        data={sortedPlayers}
        renderItem={renderPlayer}
        keyExtractor={(playerName) => playerName}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {showPlayerDetails && (
        <PlayerDetails
          showPlayerDetails={showPlayerDetails}
          setShowPlayerDetails={setShowPlayerDetails}
          playerStats={selectedPlayerStats}
          playerName={playerName}
          memberSince={memberSince}
        />
      )}
    </TableContainer>
  );
};

const ResetPlayerStats = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 24,
  fontWeight: "bold",
  marginBottom: 15,
  marginTop: 15,
  padding: 10,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
});

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
});

const TableRow = styled.TouchableOpacity({
  flexDirection: "row",
  backgroundColor: "#001123",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 20,
  paddingBottom: 20,
  borderTopWidth: 1,
  borderColor: "#262626",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 10,
  paddingRight: 20,
  borderTopWidth: 1,
  width: 150,
  borderColor: "#262626",
});

const PlayerName = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "white",
});

const Rank = styled.Text({
  fontSize: 14,
  color: "#00A2FF",
  fontWeight: "bold",
});

const StatTitle = styled.Text({
  fontSize: 14,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "white",
});

export default PlayerPerformance;
