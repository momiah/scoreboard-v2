import React, { useState, useEffect, useContext, useCallback } from "react";
import { FlatList, View, Text } from "react-native";
import styled from "styled-components/native";
import { GameContext } from "../../../context/GameContext";
import { UserContext } from "../../../context/UserContext";
import MedalDisplay from "../MedalDisplay";
import PlayerDetails from "../../Modals/PlayerDetailsModal";
import { enrichPlayers } from "../../../helpers/enrichPlayers";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import PlayerPerformanceSkeleton from "../../Skeletons/PlayerPerformanceSkeleton";

const SKELETON_ROWS = 5;

const PlayerPerformance = ({ playersData }) => {
  const { findRankIndex, recentGameResult } = useContext(GameContext);
  const { getUserById } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playersWithUserData, setPlayersWithUserData] = useState([]);

  useEffect(() => {
    const loadEnrichedPlayers = async () => {
      if (playersData.length > 0) {
        const enriched = await enrichPlayers(getUserById, playersData);
        setPlayersWithUserData(enriched);
      } else {
        setPlayersWithUserData([]);
      }
      setLoading(false);
    };

    loadEnrichedPlayers();
  }, [playersData, getUserById]);

  const renderPlayer = useCallback(
    ({ item: player, index }) => {
      const playerXp = player.XP || 0;
      const pointDifference = player.totalPointDifference || 0;
      const rankLevel = findRankIndex(playerXp) + 1;
      const displayName = formatDisplayName(player);

      return (
        <TableRow
          key={player.userId}
          onPress={() => {
            setShowPlayerDetails(true);
            setSelectedPlayer(player);
          }}
        >
          <RankCell>
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
          </RankCell>
          <PlayerNameCell>
            <PlayerName>{displayName}</PlayerName>
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
          <MedalCell>
            <MedalDisplay xp={playerXp.toFixed(0)} size={45} />
            <Stat style={{ fontSize: 12 }}>{rankLevel}</Stat>
          </MedalCell>
        </TableRow>
      );
    },
    [findRankIndex, recentGameResult]
  );

  if (playersData.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#aaa", fontSize: 14, textAlign: "center" }}>
          No players available for performance analysis.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <TableContainer>
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <PlayerPerformanceSkeleton key={i} />
        ))}
      </TableContainer>
    );
  }

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
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
  paddingLeft: 20,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  gap: 10,
});

const RankCell = styled.View({
  width: 35,
  justifyContent: "center",
  alignItems: "flex-start",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: 110,
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const MedalCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: 5,
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
  textAlign: "center",
});

export default PlayerPerformance;
