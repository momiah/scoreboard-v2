import React, { useState, useEffect, useContext } from "react";
import { View, FlatList } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../../context/GameContext";
import { calculatePlayerPerformance } from "../../../functions/calculatePlayerPerformance";
import MedalDisplay from "../MedalDisplay";
import PlayerDetails from "./PlayerDetails";
import { AntDesign } from "@expo/vector-icons";

const PlayerPerformance = () => {
  const { games, setGames, retrieveGames, players, fetchPlayers } =
    useContext(GameContext);
  const [playerStats, setPlayerStats] = useState({});
  const [sortedPlayers, setSortedPlayers] = useState([]);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState(null);
  const [playerName, setPlayerName] = useState("");

  const player = players.find((player) => player.id === playerName);
  const memberSince = player ? player.newPlayer.memberSince : null;

  useEffect(() => {
    const fetchData = async () => {
      await fetchPlayers();
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };

    fetchData();
  }, [setGames]);

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

  console.log("games", JSON.stringify(playerStats, null, 2));
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
          size={35}
        />
      </TableCell>
    </TableRow>
  );

  return (
    <TableContainer>
      <FlatList
        data={sortedPlayers}
        renderItem={renderPlayer}
        keyExtractor={(playerName) => playerName}
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
