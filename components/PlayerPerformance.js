import React, { useState, useEffect, useContext } from "react";
import { View, Text } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../context/GameContext";
import { calculatePlayerPerformance } from "../functions/calculatePlayerPerformance";

const PlayerPerformance = () => {
  const { games, setGames, retrieveGames } = useContext(GameContext);
  console.log("games in player performance", games);
  const [playerStats, setPlayerStats] = useState({});
  const [sortedPlayers, setSortedPlayers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };

    fetchData();
  }, [setGames]);

  // Use effect to update playerStats whenever games update
  useEffect(() => {
    if (games.length > 0) {
      const stats = calculatePlayerPerformance(games);
      setPlayerStats(stats);

      // Optionally, sort players
      const sorted = Object.keys(stats).sort(
        (a, b) => stats[b].XP - stats[a].XP
      );
      setSortedPlayers(sorted);
    }
  }, [games]);

  return (
    <TableContainer>
      <Table>
        <TableRow>
          <TableHeader>
            <TableText>Player</TableText>
          </TableHeader>
          <TableHeader>
            <TableText>Wins</TableText>
          </TableHeader>
          <TableHeader>
            <TableText>XP</TableText>
          </TableHeader>
        </TableRow>
        {sortedPlayers.map((player) => (
          <TableRow key={player}>
            <TableCell>
              <TableText>{player}</TableText>
            </TableCell>
            <TableCell>
              <TableText>{playerStats[player].numberOfWins}</TableText>
            </TableCell>
            <TableCell>
              <TableText>{playerStats[player].XP}</TableText>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </TableContainer>
  );
};

const TableContainer = styled.ScrollView({
  padding: 16,
});

const Table = styled.View({
  borderWidth: 1,
  borderColor: "#000",
});

const TableRow = styled.View({
  flexDirection: "row",
});

const TableHeader = styled.View({
  flex: 1,
  padding: 8,
  backgroundColor: "#f1f1f1",
  borderWidth: 1,
  borderColor: "#000",
});

const TableCell = styled.View({
  flex: 1,
  padding: 8,
  borderWidth: 1,
  borderColor: "#000",
});

const TableText = styled.Text({
  fontSize: 14,
});

export default PlayerPerformance;
