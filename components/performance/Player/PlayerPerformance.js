import React, { useState, useEffect, useContext } from "react";
import { FlatList, ActivityIndicator, View, Text } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../../context/GameContext";
import { UserContext } from "../../../context/UserContext";
import MedalDisplay from "../MedalDisplay";
import PlayerDetails from "../../Modals/PlayerDetailsModal";

const PlayerPerformance = ({ playersData }) => {
  const { findRankIndex, recentGameResult } = useContext(GameContext);
  const { loading, setLoading, getUserById } = useContext(UserContext);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playersWithUserData, setPlayersWithUserData] = useState([]);

  useEffect(() => {
    const enrichPlayers = async () => {
      const enriched = await Promise.all(
        playersData.map(async (player) => {
          const user = await getUserById(player.userId);
          const XP = user.profileDetail.XP;
          return {
            ...player,
            XP,
          };
        })
      );

      enriched.sort((a, b) => {
        if (b.numberOfWins !== a.numberOfWins) {
          return b.numberOfWins - a.numberOfWins;
        }
        if (b.totalPointDifference !== a.totalPointDifference) {
          return b.totalPointDifference - a.totalPointDifference;
        }
        return (b.XP || 0) - (a.XP || 0); // fallback: highest XP wins
      });

      setPlayersWithUserData(enriched);
      setLoading(false);
    };

    if (playersData.length > 0) {
      enrichPlayers();
    }
  }, [playersData]);

  useEffect(() => {
    if (playersData.length > 0) {
      setLoading(false);
    }
  }, [playersData]);

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
    const playerXp = player.XP || 0;
    const pointDifference = player.totalPointDifference || 0;
    const rankLevel = findRankIndex(playerXp) + 1;

    return (
      <TableRow
        key={player.userId}
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
          <PlayerName>{player.username}</PlayerName>
          {recentGameResult(player.resultLog)}
        </PlayerNameCell>
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
        <TableCell>
          <MedalDisplay xp={playerXp.toFixed(0)} size={45} />
          <Stat style={{ fontSize: 12 }}>{rankLevel}</Stat>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <TableContainer>
      <FlatList
        data={playersWithUserData}
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
  paddingRight: 5,
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
