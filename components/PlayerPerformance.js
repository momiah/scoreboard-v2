import React, { useState, useEffect, useContext } from "react";
import { View, Text, FlatList } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../context/GameContext";
import { calculatePlayerPerformance } from "../functions/calculatePlayerPerformance";
import MedalDisplay from "../functions/rankingBadges";

const PlayerPerformance = () => {
  const { games, setGames, retrieveGames } = useContext(GameContext);
  const [playerStats, setPlayerStats] = useState({});
  const [sortedPlayers, setSortedPlayers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
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

  const renderPlayer = ({ item: playerName, index }) => (
    <TableRow key={playerName}>
      <TableCell>
        <Rank>
          {index + 1}
          {index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}
        </Rank>
      </TableCell>
      <PlayerNameCell>
        <PlayerName>{playerName}</PlayerName>
      </PlayerNameCell>
      <TableCell>
        <StatTitle>Wins</StatTitle>
        <Stat>{playerStats[playerName].numberOfWins}</Stat>
      </TableCell>
      <TableCell>
        <StatTitle>XP</StatTitle>
        <Stat>{playerStats[playerName].XP}</Stat>
      </TableCell>
      <TableCell>
        <MedalDisplay
          xp={playerStats[playerName].XP + playerStats[playerName].totalPoints}
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
    </TableContainer>
  );
};

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
});

const TableRow = styled.View({
  flexDirection: "row",

  borderBottomColor: "#ccc",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 20,
  paddingBottom: 20,
  borderBottomWidth: 1,
  borderColor: "#ccc",
});
const PlayerNameCell = styled.View({
  flex: 1,
  justifyContent: "center",

  paddingTop: 20,
  paddingBottom: 20,
  borderBottomWidth: 1,
  borderColor: "#ccc",
});

const TableText = styled.Text({
  fontSize: 14,
});
const PlayerName = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
});
const Rank = styled.Text({
  fontSize: 14,
});
const StatTitle = styled.Text({
  fontSize: 14,
  color: "#aaa",
});
const Stat = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
});

export default PlayerPerformance;
