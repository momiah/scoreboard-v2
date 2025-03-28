import React, {
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import { GameContext } from "../../context/GameContext";
import MedalDisplay from "../../components/performance/MedalDisplay";
import { FlatList, RefreshControl } from "react-native";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";
import { useNavigation } from "@react-navigation/native";

const iconSize = 45;

const TopPlayers = ({ topPlayers, fetchUsers }) => {
  // const { getAllUsers } = useContext(UserContext);
  const { findRankIndex } = useContext(GameContext);
  // const [sortedUsers, setSortedUsers] = useState([]);
  const navigation = useNavigation();

  const renderPlayer = useCallback(
    ({ item: player, index }) => {
      const playerXp = player.profileDetail.XP;
      const pointDifference = player.profileDetail.totalPointDifference || 0;
      const rankLevel = findRankIndex(playerXp) + 1;

      return (
        <PlayerRow
          key={player.id}
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
            <RankLevel>{rankLevel}</RankLevel>
          </TableCell>
        </PlayerRow>
      );
    },
    [findRankIndex]
  );

  // const topPlayers = useMemo(() => sortedUsers.slice(0, 5), [sortedUsers]);

  return (
    <FlatList
      data={topPlayers}
      renderItem={renderPlayer}
      keyExtractor={(player) => player.id}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={5}
      scrollEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={fetchUsers}
          tintColor="white"
        />
      }
    />
  );
};

// Styled components
const Container = styled.ScrollView({
  width: "100%",
});

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  border: "1px solid rgb(9, 33, 62)",
  marginBottom: 10,
  borderRadius: 10,
});

const Avatar = styled.Image({
  width: iconSize,
  height: iconSize,
  borderRadius: 30,
  borderWidth: 2,
  borderColor: "#00A2FF",
  marginBottom: 5,
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

export default TopPlayers;
