import React, { useState, useEffect, useContext, useMemo } from "react";
import { View, FlatList, Text } from "react-native";
import styled from "styled-components/native";

import { GameContext } from "../../../context/GameContext";
import { calculatTeamPerformance } from "../../../helpers/calculateTeamPerformance";
import TeamDetails from "../../Modals/TeamDetailsModal";
import { Dimensions } from "react-native";
import { UserContext } from "../../../context/UserContext";
import { SkeletonWrapper } from "../../Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../../Skeletons/skeletonConfig";

const TeamPerformance = ({ leagueTeams }) => {
  const { recentGameResult } = useContext(GameContext);

  const [showTeamDetails, setShowTeamDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState({});

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  const renderTeam = ({ item: team, index }) => {
    const pointDifference = team.totalPointDifference || 0;
    return (
      <TableRow
        onPress={() => {
          setShowTeamDetails(true);
          setTeam(team);
        }}
      >
        <SkeletonWrapper show={loading} radius={8} config={SKELETON_THEMES.dark}>
          <TableCellPlayerGroup>
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
            <TeamCell>
              <TeamNameCell>
                {team.team.map((player, idx) => (
                  <PlayerName key={`${player}-${idx}`}>{player}</PlayerName>
                ))}
              </TeamNameCell>
              {recentGameResult(team.resultLog)}
            </TeamCell>
          </TableCellPlayerGroup>
        </SkeletonWrapper>
        <TableCellStatsGroupContainer>
          <SkeletonWrapper show={loading} radius={8} config={SKELETON_THEMES.dark}>
            <TableCellStatsGroup>
              <TableCell>
                <StatTitle>PD</StatTitle>
                <Stat style={{ color: pointDifference < 0 ? "red" : "green" }}>
                  {pointDifference}
                </Stat>
              </TableCell>
              <TableCell>
                <StatTitle>Wins</StatTitle>
                <Stat>{team.numberOfWins}</Stat>
              </TableCell>
            </TableCellStatsGroup>
          </SkeletonWrapper>
        </TableCellStatsGroupContainer>
        {/* Add more TableCell components here to display other stats */}
      </TableRow>
    );
  };

  const sortedTeams = useMemo(() => {
    return [...leagueTeams].sort((a, b) => {
      if (b.numberOfWins !== a.numberOfWins) {
        return b.numberOfWins - a.numberOfWins;
      }
      if (b.totalPointDifference !== a.totalPointDifference) {
        return b.totalPointDifference - a.totalPointDifference;
      }
      return b.averagePointDifference - a.averagePointDifference;
    });
  }, [leagueTeams]);

  console.log("League Teams:", JSON.stringify(leagueTeams, null, 2));

  return (
    <TableContainer>
      {leagueTeams.length === 0 ? (
        <FallbackMessage>Add a game to see Team Performance 📈</FallbackMessage>
      ) : (
        <FlatList
          data={sortedTeams}
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
  alignItems: "stretch",
  backgroundColor: "#001123",
  borderTopWidth: 1,
  borderColor: "#262626",
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 10,
  paddingRight: 5,
  gap: 10,
});

const TableCellPlayerGroup = styled.View({
  width: 220,
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",

});

const TableCellStatsGroupContainer = styled.View({
  flex: 1,
  flexDirection: "row",
  justifyContent: "stretch",
  alignItems: "stretch",
  alignSelf: "stretch",
});

const TableCellStatsGroup = styled.View({
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",

});

const TeamCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingRight: 30,
  width: 150,
});

const TeamNameCell = styled.View({
  justifyContent: "flex-start",
  alignItems: "flex-start",
  paddingRight: 20,
  width: 130,
  gap: 20,
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
  fontSize: 14,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: screenWidth <= 400 ? 20 : 25,
  fontWeight: "bold",
  color: "white",
});

const FallbackMessage = styled.Text({
  color: "#aaa",
  fontStyle: "italic",
  fontSize: 16,
  textAlign: "center",
  marginTop: 50,
});

export default TeamPerformance;
