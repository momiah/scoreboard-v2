import React, { useState, useEffect, useContext } from "react";
import { View, FlatList } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../context/GameContext";
import { calculatePlayerPerformance } from "../../functions/calculatePlayerPerformance";
import MedalDisplay from "../../components/performance/MedalDisplay";
import PlayerDetails from "./PlayerDetails";

const PlayerPerformance = () => {
  const { games, setGames, retrieveGames } = useContext(GameContext);
  const [playerStats, setPlayerStats] = useState({});
  const [sortedPlayers, setSortedPlayers] = useState([]);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState(null);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const retrievedGames = await retrieveGames();
      setGames(retrievedGames);
    };

    fetchData();
  }, [setGames]);

  // console.log(JSON.stringify(games, null, 2));

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

  // console.log("🔥sorted players", JSON.stringify(sortedPlayers, null, 2));
  console.log("stats", JSON.stringify(playerStats, null, 2));

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
  justifyContent: "center",
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 10,
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
  color: "white",
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
