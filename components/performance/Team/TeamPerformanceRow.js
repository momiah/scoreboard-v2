import React, { useContext } from "react";
import styled from "styled-components/native";

import { GameContext } from "../../../context/GameContext";

const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

/**
 * Ladder standings row for a doubles team. Mirrors PerformanceRow's layout,
 * without the global rank medal (teams only earn per-ladder CP).
 * @param {{ team: any, rank: number, onPress?: any }} props
 */
const TeamPerformanceRow = ({ team, rank, onPress = null }) => {
  const { recentMatchResult } = useContext(GameContext);
  const pointDifference = team.totalPointDifference || 0;
  const names = team.team ?? [];

  return (
    <TableRow
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress ? () => onPress(team) : undefined}
    >
      <TableCell>
        <Rank>{rank > 0 ? `${rank}${getOrdinalSuffix(rank)}` : "-"}</Rank>
      </TableCell>

      <PlayerNameCell>
        <TeamNames>
          {names.map((name, idx) => (
            <PlayerName key={`${name}-${idx}`} numberOfLines={1}>
              {name}
            </PlayerName>
          ))}
        </TeamNames>
        {recentMatchResult(team.matchResultLog ?? [])}
      </PlayerNameCell>

      <TableCell>
        <StatTitle>Wins</StatTitle>
        <Stat>{team.numberOfWins ?? 0}</Stat>
      </TableCell>

      <TableCell>
        <StatTitle>PD</StatTitle>
        <Stat style={{ color: pointDifference < 0 ? "red" : "green" }}>
          {pointDifference}
        </Stat>
      </TableCell>

      <TableCell>
        <StatTitle>CP</StatTitle>
        <Stat>{team.competitionXP ?? 0}</Stat>
      </TableCell>
    </TableRow>
  );
};

export default TeamPerformanceRow;

const TableRow = styled.TouchableOpacity({
  flexDirection: "row",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  paddingRight: 5,
  width: 130,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
});

const TeamNames = styled.View({
  flexShrink: 1,
  gap: 4,
});

const PlayerName = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: "white",
  flexShrink: 1,
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
