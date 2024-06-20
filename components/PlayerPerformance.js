import React, { useState, useEffect, useContext } from "react";
import { View, Text } from "react-native";
import styled from "styled-components/native";
// import { retrieveGames } from "../services/retrieveGame";
import { GameContext } from "../context/GameContext";

const populatePlayerStats = (games) => {
  const players = {};

  function initializePlayer(player) {
    if (!players[player]) {
      players[player] = {
        numberOfWins: 0,
        numberOfLosses: 0,
        totalPoints: 0,
        numberOfGamesPlayed: 0,
        resultLog: [],
        XP: 0,
      };
    }
  }

  function updateResultLog(player, result) {
    players[player].resultLog.push(result);
    if (players[player].resultLog.length > 10) {
      players[player].resultLog.shift();
    }
  }

  games.forEach((game) => {
    const team1 = game.team1;
    const team2 = game.team2;

    if (team1 && team2) {
      initializePlayer(team1.player1);
      initializePlayer(team1.player2);
      initializePlayer(team2.player1);
      initializePlayer(team2.player2);

      players[team1.player1].totalPoints += team1.score;
      players[team1.player2].totalPoints += team1.score;
      players[team2.player1].totalPoints += team2.score;
      players[team2.player2].totalPoints += team2.score;

      players[team1.player1].numberOfGamesPlayed += 1;
      players[team1.player2].numberOfGamesPlayed += 1;
      players[team2.player1].numberOfGamesPlayed += 1;
      players[team2.player2].numberOfGamesPlayed += 1;

      if (team1.score > team2.score) {
        players[team1.player1].numberOfWins += 1;
        players[team1.player2].numberOfWins += 1;
        players[team2.player1].numberOfLosses += 1;
        players[team2.player2].numberOfLosses += 1;

        players[team1.player1].XP += 20;
        players[team1.player2].XP += 20;
        players[team2.player1].XP -= 10;
        players[team2.player2].XP -= 10;

        updateResultLog(team1.player1, "W");
        updateResultLog(team1.player2, "W");
        updateResultLog(team2.player1, "L");
        updateResultLog(team2.player2, "L");
      } else {
        players[team1.player1].numberOfLosses += 1;
        players[team1.player2].numberOfLosses += 1;
        players[team2.player1].numberOfWins += 1;
        players[team2.player2].numberOfWins += 1;

        players[team1.player1].XP -= 10;
        players[team1.player2].XP -= 10;
        players[team2.player1].XP += 20;
        players[team2.player2].XP += 20;

        updateResultLog(team1.player1, "L");
        updateResultLog(team1.player2, "L");
        updateResultLog(team2.player1, "W");
        updateResultLog(team2.player2, "W");
      }
    }
  });

  const playersArray = Object.entries(players).map(([player, stats]) => ({
    player,
    ...stats,
  }));

  // Sort the array by XP in descending order
  playersArray.sort((a, b) => b.XP - a.XP);

  // Convert the sorted array back into an object
  const sortedPlayers = {};
  playersArray.forEach((player) => {
    sortedPlayers[player.player] = {
      XP: player.XP,
      numberOfGamesPlayed: player.numberOfGamesPlayed,
      numberOfLosses: player.numberOfLosses,
      numberOfWins: player.numberOfWins,
      resultLog: player.resultLog,
      totalPoints: player.totalPoints,
    };
  });

  return sortedPlayers;
};

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
      const stats = populatePlayerStats(games);
      setPlayerStats(stats);

      // Optionally, sort players
      const sorted = Object.keys(stats).sort(
        (a, b) => stats[b].XP - stats[a].XP
      );
      setSortedPlayers(sorted);
    }
  }, [games]);

  // function sortPlayersByXP(players) {
  //   // Convert the players object into an array
  //   const playersArray = Object.entries(players).map(([player, stats]) => ({
  //     player,
  //     ...stats,
  //   }));

  //   // Sort the array by XP in descending order
  //   playersArray.sort((a, b) => b.XP - a.XP);

  //   // Convert the sorted array back into an object
  //   const sortedPlayers = {};
  //   playersArray.forEach((player) => {
  //     sortedPlayers[player.player] = {
  //       XP: player.XP,
  //       numberOfGamesPlayed: player.numberOfGamesPlayed,
  //       numberOfLosses: player.numberOfLosses,
  //       numberOfWins: player.numberOfWins,
  //       resultLog: player.resultLog,
  //       totalPoints: player.totalPoints,
  //     };
  //   });

  //   return sortedPlayers;
  // }

  // console.log("✅ player stats loaded", populatePlayerStats(games));
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
