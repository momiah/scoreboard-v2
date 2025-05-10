import React, { useState, useEffect, useContext } from "react";
import { View, FlatList, Text } from "react-native";
import styled from "styled-components/native";

import { GameContext } from "../../../context/GameContext";
import { calculatTeamPerformance } from "../../../helpers/calculateTeamPerformance";
import TeamDetails from "../../Modals/TeamDetailsModal";
import { Dimensions } from "react-native";
import { UserContext } from "../../../context/UserContext";

const TeamPerformance = ({ leagueTeams }) => {
  const { recentGameResult } = useContext(GameContext);

  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [team, setTeam] = useState({});

  const renderTeam = ({ item: team, index }) => (
    <TableRow
      onPress={() => {
        setShowTeamDetails(true);
        setTeam(team);
      }}
    >
      <TableCell>
        <Rank>
          {index + 1}
          {index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"}
        </Rank>
      </TableCell>
      <TeamCell>
        <TeamNameCell>
          {team.team.map((player, idx) => (
            <PlayerName key={`${player}-${idx}`}>{player}</PlayerName>
          ))}
        </TeamNameCell>
        {recentGameResult(team.resultLog)}
      </TeamCell>
      <TableCell>
        <StatTitle>Win Ratio</StatTitle>
        <Stat>{(team.numberOfWins / team.numberOfLosses).toFixed(2)}</Stat>
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
      {leagueTeams.length === 0 ? (
        <FallbackMessage>Add a game to see Team Performance 📈</FallbackMessage>
      ) : (
        <FlatList
          data={leagueTeams}
          renderItem={renderTeam}
          keyExtractor={(team, index) => team.team.join("-") + index}
        />
      )}
      {showTeamDetails && (
        <TeamDetails
          showTeamDetails={showTeamDetails}
          setShowTeamDetails={setShowTeamDetails}
          teamStats={team}
        />
      )}
    </TableContainer>
  );
};

const { width: screenWidth } = Dimensions.get("window");

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

const TeamCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingRight: 40,
  width: 150,
  borderTopWidth: 1,
  borderColor: "#262626",
});

const TeamNameCell = styled.View({
  justifyContent: "flex-start",
  alignItems: "flex-start",
  paddingTop: 20,
  paddingBottom: 20,
  paddingRight: 20,
  width: 110,
  gap: 20,
});

const PlayerName = styled.Text({
  fontSize: 15,
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
  fontSize: screenWidth <= 400 ? 20 : 25,
  fontWeight: "bold",
  color: "white",
});

const FallbackMessage = styled.Text({
  color: "#696969",
  fontStyle: "italic",
  fontSize: 16,
  textAlign: "center",
  marginTop: 50,
});

export default TeamPerformance;
