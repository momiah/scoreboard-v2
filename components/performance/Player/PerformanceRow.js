import React, { useContext } from "react";
import styled from "styled-components/native";

import { GameContext } from "../../../context/GameContext";
import MedalDisplay from "../MedalDisplay";
import { formatDisplayName } from "../../../helpers/formatDisplayName";

const getOrdinalSuffix = (num) => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const teamLabel = (team) =>
  team.teamName?.trim() || (team.team ?? []).join(" & ");

/**
 * Ladder/competition standings row, rendered for either a player or a team.
 * A team shows its name and no rank medal (teams only earn per-ladder CP).
 * @param {{ player?: any, team?: any, rank: number, onPress?: any, ladder?: any }} props
 */
const PerformanceRow = ({
  player,
  team,
  rank,
  onPress = null,
  ladder = null,
}) => {
  const { findRankIndex, recentGameResult, recentMatchResult } =
    useContext(GameContext);

  const isTeam = !!team;
  const entity = team || player;
  const isLadder = !!ladder;
  const pointDifference = entity.totalPointDifference || 0;
  // Ladders name their teams; leagues/tournaments don't, so show the players.
  const displayName = isTeam
    ? isLadder
      ? teamLabel(team)
      : (team.team ?? []).join(" & ")
    : formatDisplayName(player) || player.username || "";
  const playerXp = player?.XP || 0;
  const rankLevel = findRankIndex(playerXp) + 1;

  return (
    <TableRow
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress ? () => onPress(entity) : undefined}
    >
      <TableCell>
        <Rank>{rank > 0 ? `${rank}${getOrdinalSuffix(rank)}` : "-"}</Rank>
      </TableCell>

      <PlayerNameCell>
        <PlayerName numberOfLines={1}>{displayName}</PlayerName>
        {isLadder
          ? recentMatchResult(entity.matchResultLog ?? [])
          : recentGameResult(entity.resultLog ?? [])}
      </PlayerNameCell>

      <TableCell>
        <StatTitle>Wins</StatTitle>
        <Stat>{entity.numberOfWins ?? 0}</Stat>
      </TableCell>

      <TableCell>
        <StatTitle>PD</StatTitle>
        <Stat style={{ color: pointDifference < 0 ? "red" : "green" }}>
          {pointDifference}
        </Stat>
      </TableCell>

      {isLadder && (
        <TableCell>
          <StatTitle>CP</StatTitle>
          <Stat>{entity.competitionXP ?? 0}</Stat>
        </TableCell>
      )}

      {!isTeam && (
        <TableCell>
          <MedalDisplay xp={playerXp.toFixed(0)} size={45} />
          <Stat style={{ fontSize: 12 }}>{rankLevel}</Stat>
        </TableCell>
      )}
    </TableRow>
  );
};

export default PerformanceRow;

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
