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

/**
 * A single performance-table row: rank · name (+recent-result caret) · Wins ·
 * PD · [CP on ladders] · rank medal. Shared by PlayerPerformance (list) and the
 * ladder Summary (single row).
 *
 * - `rank`: 1-based position; 0 renders as a "-" dash (unranked, no wins yet).
 * - `ladder`: when set, uses the per-MATCH result caret and shows a CP cell.
 * - `cp`: the per-ladder Court Points value shown in the CP cell.
 */
/**
 * @param {{ player: any, rank: number, onPress?: any, ladder?: any, cp?: number }} props
 */
const PerformanceRow = ({
  player,
  rank,
  onPress = null,
  ladder = null,
  cp = 0,
}) => {
  const { findRankIndex, recentGameResult, recentMatchResult } =
    useContext(GameContext);

  const isLadder = !!ladder;
  const playerXp = player.XP || 0;
  const pointDifference = player.totalPointDifference || 0;
  const rankLevel = findRankIndex(playerXp) + 1;
  const displayName = formatDisplayName(player) || player.username || "";

  return (
    <TableRow
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress ? () => onPress(player) : undefined}
    >
      <TableCell>
        <Rank>{rank > 0 ? `${rank}${getOrdinalSuffix(rank)}` : "-"}</Rank>
      </TableCell>

      <PlayerNameCell>
        <PlayerName numberOfLines={1}>{displayName}</PlayerName>
        {isLadder
          ? recentMatchResult(player.ladderResultLog ?? [])
          : recentGameResult(player.resultLog ?? [])}
      </PlayerNameCell>

      <TableCell>
        <StatTitle>Wins</StatTitle>
        <Stat>{player.numberOfWins ?? 0}</Stat>
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
          <Stat>{cp ?? 0}</Stat>
        </TableCell>
      )}

      <TableCell>
        <MedalDisplay xp={playerXp.toFixed(0)} size={45} />
        <Stat style={{ fontSize: 12 }}>{rankLevel}</Stat>
      </TableCell>
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
