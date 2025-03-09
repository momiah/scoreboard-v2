import React, { useMemo, useCallback } from "react";
import { Dimensions } from "react-native";
import styled from "styled-components/native";
import MedalProgress from "../performance/MedalProgress";
import MatchMedals from "../performance/MatchMedals";
import LeagueStatsDisplay from "../performance/LeagueStatDisplay";
import PerformanceStats from "../performance/PerformanceStats";
import AnimateNumber from "../performance/AnimateNumber";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedStatFontSize = screenWidth <= 400 ? 20 : 25;

const ProfilePerformance = ({ profile }) => {
  const profileDetail = profile?.profileDetail;
  const leagueStats = profileDetail?.leagueStats;

  const statData = useMemo(() => {
    const wins = profileDetail?.numberOfWins || 0;
    const losses = profileDetail?.numberOfLosses || 0;

    return [
      {
        statTitle: "Wins",
        stat: (
          <AnimateNumber number={wins} fontSize={screenAdjustedStatFontSize} />
        ),
      },
      {
        statTitle: "Losses",
        stat: (
          <AnimateNumber
            number={losses}
            fontSize={screenAdjustedStatFontSize}
          />
        ),
      },
      {
        statTitle: "Win Ratio",
        stat: (
          <Stat>{losses ? (wins / losses).toFixed(2) : wins.toFixed(2)}</Stat>
        ),
      },
      {
        statTitle: "Highest Streak",
        stat: (
          <AnimateNumber
            number={profileDetail?.highestWinStreak || 0}
            fontSize={screenAdjustedStatFontSize}
          />
        ),
      },
    ];
  }, [profileDetail]);

  const renderPerformanceContent = useCallback(
    () => (
      <>
        <MedalProgress
          xp={profileDetail?.XP}
          prevGameXp={profileDetail?.prevGameXP}
        />
        <MatchMedals
          demonWin={profileDetail?.demonWin}
          winStreak3={profileDetail?.winStreak3}
          winStreak5={profileDetail?.winStreak5}
          winStreak7={profileDetail?.winStreak7}
        />
        <Divider />
        <LeagueStatsDisplay leagueStats={leagueStats} />
        <PerformanceStats statData={statData} selectedPlayer={profileDetail} />
      </>
    ),
    [profileDetail, leagueStats, statData]
  );

  return <Container>{renderPerformanceContent()}</Container>;
};

const Container = styled.ScrollView`
  padding-bottom: 40px;
  padding-horizontal: 5px;
`;

const Stat = styled.Text`
  font-size: ${screenAdjustedStatFontSize}px;
  font-weight: bold;
  color: white;
`;

const Divider = styled.View`
  height: 1px;
  background-color: #262626;
  margin-vertical: 10px;
`;

export default React.memo(ProfilePerformance);
