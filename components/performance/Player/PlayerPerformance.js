import React, { useState, useEffect, useContext } from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../../context/GameContext";
import { calculatePlayerPerformance } from "../../../functions/calculatePlayerPerformance";
import MedalDisplay from "../MedalDisplay";
import PlayerDetails from "./PlayerDetails";
import { AntDesign } from "@expo/vector-icons";
import { getPlayersToUpdate } from "../../../functions/getPlayersToUpdate";

//UPDATE 25/09/2021 Current component is setup to retrieve the new player data from
//firestore players list, so will not run until players list uses new data structure
// - Need to restart all players and run the new algo to update the player stats

const PlayerPerformance = () => {
  const {
    games,
    setGames,
    retrieveGames,
    players,
    retrievePlayers,
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

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playersData, setPlayersData] = useState([]);

  // console.log("games", JSON.stringify(playerStats, null, 2));

  const player = players.find((player) => player.id === playerName);
  const memberSince = player ? player.memberSince : null;

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
    const fetchPlayers = async () => {
      const retrievedPlayers = await retrievePlayers();

      // Sort the players based on the sum of XP + totalPoints
      const sortedPlayers = retrievedPlayers.sort((a, b) => {
        const totalA = a.XP + a.totalPoints;
        const totalB = b.XP + b.totalPoints;

        // Sort in descending order
        return totalB - totalA;
      });

      setPlayersData(sortedPlayers);
    };

    fetchPlayers();
  }, [retrievePlayers]);

  // console.log("playersData✅", JSON.stringify(playersData, null, 2));
  // console.log("playersStats🙂", JSON.stringify(playerStats, null, 2));

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

  console.log("selectedPlayer🚫", JSON.stringify(selectedPlayer, null, 2));

  // const runGetPlayersToUpdate = async () => {
  //   // Reverse the array to process the last game first
  //   const reversedGames = [...games].reverse();

  //   for (const game of reversedGames) {
  //     const playersToUpdate = await getPlayersToUpdate(game, retrievePlayers);
  //     await updatePlayers(playersToUpdate);
  //   }
  //   // console.log("All players updated successfully");
  // };

  // console.log("playerstats", JSON.stringify(playerStats, null, 2));
  // console.log("games🫵", JSON.stringify(games, null, 2));

  const renderPlayer = ({ item: player, index }) => {
    const totalPointsAndXP = player.XP + player.totalPoints;

    return (
      <TableRow
        key={player}
        onPress={() => {
          // setSelectedPlayerStats(playerStats[playerName]);
          // setShowPlayerDetails(true);
          // setPlayerName(playerName);
          setSelectedPlayer(player);
        }}
      >
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
          <Stat>{totalPointsAndXP.toFixed(0)}</Stat>
        </TableCell>
        <TableCell>
          <MedalDisplay xp={totalPointsAndXP.toFixed(0)} size={45} />
        </TableCell>
      </TableRow>
    );
  };

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
