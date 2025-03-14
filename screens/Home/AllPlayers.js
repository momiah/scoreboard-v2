import React, { useState, useEffect, useContext } from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View,
  Text,
} from "react-native";

import styled from "styled-components/native";

import MedalDisplay from "../../components/performance/MedalDisplay";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";

import { sortTopPlayers } from "../../functions/sortTopPlayers";
import { GameContext } from "../../context/GameContext";
import { UserContext } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";

const iconSize = 45;

const AllPlayers = () => {
  const { findRankIndex } = useContext(GameContext);
  const { getAllUsers } = useContext(UserContext);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [sortedUsers, setSortedUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      if (!refreshing) setLoading(true);
      const users = await getAllUsers();
      setSortedUsers(sortTopPlayers(users));
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const renderPlayer = ({ item: player, index }) => {
    const playerXp = player.profileDetail.XP;
    const pointDifference = player.profileDetail.totalPointDifference || 0;
    const rankLevel = findRankIndex(playerXp) + 1;

    return (
      <PlayerRow
        key={player}
        onPress={() => {
          navigation.navigate("UserProfile", {
            userId: player.userId,
          });
        }}
      >
        <Avatar source={CourtChampsLogo} />
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
        </PlayerNameCell>
        <TableCell>
          <StatTitle>Wins</StatTitle>
          <Stat>{player.profileDetail.numberOfWins}</Stat>
        </TableCell>
        <TableCell>
          <StatTitle>PD</StatTitle>
          <Stat style={{ color: pointDifference < 0 ? "red" : "green" }}>
            {pointDifference}
          </Stat>
        </TableCell>
        <TableCell>
          <MedalDisplay xp={playerXp.toFixed(0)} size={iconSize} />
          <Stat style={{ fontSize: 12 }}>{rankLevel}</Stat>
        </TableCell>
      </PlayerRow>
    );
  };

  return (
    <TableContainer>
      {loading && (
        <LoadingContainer>
          <ActivityIndicator size="large" color="#00A2FF" />
        </LoadingContainer>
      )}
      <FlatList
        data={sortedUsers}
        renderItem={renderPlayer}
        keyExtractor={(player) => player.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />
        }
      />
    </TableContainer>
  );
};

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
  backgroundColor: " rgb(3, 16, 31)",
});

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,

  borderTopWidth: 1,
  borderColor: "1px solid rgb(9, 33, 62)",
  borderRadius: 10,
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  width: 110,
});
const Avatar = styled.Image({
  width: iconSize,
  height: iconSize,
  borderRadius: 30,
  borderWidth: 2,
  borderColor: "#00A2FF",
  marginBottom: 5,
});

const PlayerName = styled.Text({
  fontSize: 13,
  fontWeight: "bold",
  color: "white",
});

const Rank = styled.Text({
  fontSize: 13,
  color: "#00A2FF",
  fontWeight: "bold",
});

const StatTitle = styled.Text({
  fontSize: 11,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 13,
  fontWeight: "bold",
  color: "white",
});

const RankLevel = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
});
const LoadingContainer = styled.View({
  position: "absolute",
  top: 10, // Adjusts position near the top
  left: 0,
  right: 0,
  alignItems: "center",
  zIndex: 10, // Keeps it above other elements
});

export default AllPlayers;
