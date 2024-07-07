import React from "react";
import { View, FlatList } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";

const TeamPerformance = () => {
  const exampleTeamData = [
    {
      team: ["Mohsin", "Yasin"],
      numberOfWins: 20,
      numberOfLosses: 19,
      resultLog: ["W", "W", "W", "W"],
      numberOfGamesPlayed: 39,
      winRatio: 2,
      currentStreak: 2,
      highestStreak: 3,
      demonWins: 2,
      winStreak3: 2,
      winStreak5: 5,
      winStreak7: 1,
      pointEfficiency: 90,
    },
    {
      team: ["Saiful", "Yasin"],
      numberOfWins: 20,
      numberOfLosses: 19,
      resultLog: ["W", "W", "W", "L"],
      numberOfGamesPlayed: 39,
      winRatio: 2,
      currentStreak: 2,
      highestStreak: 3,
      demonWins: 2,
      winStreak3: 2,
      winStreak5: 5,
      winStreak7: 1,
      pointEfficiency: 90,
    },
    {
      team: ["Mohsin", "Saiful"],
      numberOfWins: 20,
      numberOfLosses: 19,
      resultLog: ["W", "W", "W", "L"],
      numberOfGamesPlayed: 39,
      winRatio: 2,
      currentStreak: 2,
      highestStreak: 3,
      demonWins: 2,
      winStreak3: 2,
      winStreak5: 5,
      winStreak7: 1,
      pointEfficiency: 90,
    },
  ];

  const recentGameResult = (resultLog) => {
    const lastResult = resultLog[resultLog.length - 1]; // Get the last element without modifying the array

    const icon = lastResult === "W" ? "caretup" : "caretdown";
    const color = lastResult === "W" ? "green" : "red";

    return <AntDesign name={icon} size={10} color={color} />;
  };

  const renderPlayer = ({ item: team, index }) => (
    <TableRow>
      <TableCell>
        <Rank>
          {index + 1}
          {index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}
        </Rank>
      </TableCell>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingRight: 40,
          width: 150,
          borderTopWidth: 1,
          borderColor: "#262626",
        }}
      >
        <TeamNameCell>
          {team.team.map((player, idx) => (
            <PlayerName key={`${player}-${idx}`}>{player}</PlayerName>
          ))}
        </TeamNameCell>
        {recentGameResult(team.resultLog)}
      </View>
      <TableCell>
        <StatTitle>Win Ratio</StatTitle>
        <Stat>{team.winRatio}</Stat>
      </TableCell>
      <TableCell>
        <StatTitle>Wins</StatTitle>
        <Stat>{team.numberOfWins}</Stat>
      </TableCell>
      {/* Add more TableCell components here to display other stats */}
    </TableRow>
  );

  return (
    <TableContainer>
      <FlatList
        data={exampleTeamData}
        renderItem={renderPlayer}
        keyExtractor={(team, index) => team.team.join("-") + index}
      />
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

const TeamNameCell = styled.View({
  justifyContent: "flex-start",
  alignItems: "flex-start",
  paddingTop: 20,
  paddingBottom: 20,
  paddingRight: 20,
  gap: 20,
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
  fontSize: 25,
  fontWeight: "bold",
  color: "white",
});

export default TeamPerformance;
