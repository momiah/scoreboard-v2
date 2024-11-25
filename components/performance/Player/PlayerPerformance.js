import React, { useState, useEffect, useContext } from "react";
import { FlatList, RefreshControl } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../../context/GameContext";
import MedalDisplay from "../MedalDisplay";
import PlayerDetails from "./PlayerDetails";
import { AntDesign } from "@expo/vector-icons";

const PlayerPerformance = () => {
  const { setGames, retrieveGames, retrievePlayers, refreshing } =
    useContext(GameContext);

  const [showPlayerDetails, setShowPlayerDetails] = useState(false);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playersData, setPlayersData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };

    fetchData();
  }, [setGames]);

  const handleRefresh = async () => {
    const fetchData = async () => {
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

  const recentGameResult = (resultLog) => {
    const lastResult = resultLog[resultLog.length - 1]; // Get the last element without modifying the array

    const icon = lastResult === "W" ? "caretup" : "caretdown";
    const color = lastResult === "W" ? "green" : "red";

    return <AntDesign name={icon} size={10} color={color} />;
  };

  // const runGetPlayersToUpdate = async () => {
  //   // Reverse the array to process the last game first
  //   const reversedGames = [...games].reverse();

  //   for (const game of reversedGames) {
  //     const playersToUpdate = await getPlayersToUpdate(game, retrievePlayers);
  //     await updatePlayers(playersToUpdate);
  //   }
  // };

  const renderPlayer = ({ item: player, index }) => {
    const totalPointsAndXP = player.XP + player.totalPoints;

    return (
      <TableRow
        key={player}
        onPress={() => {
          setShowPlayerDetails(true);
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
      {/* <ResetPlayerStats onPress={() => resetPlayerStats()}>
        <Text>Reset Player Stats</Text>
      </ResetPlayerStats>
      <ResetPlayerStats onPress={() => resetAllPlayerStats()}>
        <Text>Reset All Players</Text>
      </ResetPlayerStats>
      <ResetPlayerStats onPress={() => runGetPlayersToUpdate()}>
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
