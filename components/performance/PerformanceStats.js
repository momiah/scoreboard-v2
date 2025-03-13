import React from "react";
import MedalProgress from "./MedalProgress";
import ResultLog from "./ResultLog";
import MatchMedals from "./MatchMedals";
import styled from "styled-components/native";
import { Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

const PerformanceStats = ({ statData, selectedPlayer }) => {
  return (
    <>
      {/* Player Stats */}
      <PlayerStat>
        {statData.map((data, index) => {
          return (
            <TableCell key={index}>
              <StatTitle>{data.statTitle}</StatTitle>
              {data.stat}
            </TableCell>
          );
        })}
      </PlayerStat>
    </>
  );
};

const Divider = styled.View({
  borderBottomColor: "#262626",
  borderBottomWidth: 1,
});

const PlayerStat = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
});

const TableCell = styled.View({
  width: "50%", // Adjust this to fit two cells per row
  justifyContent: "center",
  alignItems: "center",
  paddingTop: screenWidth <= 400 ? 15 : 20,
  paddingBottom: screenWidth <= 400 ? 15 : 20,
  borderTopWidth: 1,
  borderColor: "#262626",
});

const StatTitle = styled.Text({
  fontSize: screenWidth <= 400 ? 12 : 14,
  color: "#aaa",
});

export default PerformanceStats;
