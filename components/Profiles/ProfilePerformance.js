import React, { useMemo, useCallback } from "react";
import { Dimensions } from "react-native";
import styled from "styled-components/native";
import MedalProgress from "../performance/MedalProgress";
import MatchMedals from "../performance/MatchMedals";
import CompetitionStatsDisplay from "../performance/CompetitionStatsDisplay";
import PerformanceStats from "../performance/PerformanceStats";
import { COMPETITION_TYPES } from "../../schemas/schema";
import AnimateNumber from "../performance/AnimateNumber";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedStatFontSize = screenWidth <= 400 ? 20 : 25;
const screenAdjustedHeadingFontSize = screenWidth <= 400 ? 15 : 17;

const ProfilePerformance = ({ profile }) => {
  const profileDetail = profile?.profileDetail;
  const leagueStats = profileDetail?.leagueStats;

  const statData = useMemo(() => {
    const wins = profileDetail?.numberOfWins || 0;
    const losses = profileDetail?.numberOfLosses || 0;
    const winRatio = wins / losses;

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
        stat: <Stat>{isNaN(winRatio) ? 0 : winRatio.toFixed(2)}</Stat>,
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
        <Divider />

        <Heading>Match Medals</Heading>
        <MatchMedals
          demonWin={profileDetail?.demonWin}
          winStreak3={profileDetail?.winStreak3}
          winStreak5={profileDetail?.winStreak5}
          winStreak7={profileDetail?.winStreak7}
        />
        <Divider />
        <Heading>League Victories</Heading>
        <CompetitionStatsDisplay
          stats={profileDetail.leagueStats}
          competitionType={COMPETITION_TYPES.LEAGUE}
        />
        <Divider />
        <Heading>Tournament Victories</Heading>
        <CompetitionStatsDisplay
          stats={profileDetail.tournamentStats}
          competitionType={COMPETITION_TYPES.TOURNAMENT}
        />
        <PerformanceStats statData={statData} selectedPlayer={profileDetail} />
      </>
    ),
    [profileDetail, leagueStats, statData]
  );

  return <Container>{renderPerformanceContent()}</Container>;
};

const Container = styled.ScrollView({
  paddingBottom: 40,
  paddingHorizontal: 5,
});

const Heading = styled.Text({
  fontSize: screenAdjustedHeadingFontSize,
  fontWeight: "bold",
  color: "white",
  marginBottom: 10,
});

const Stat = styled.Text({
  fontSize: screenAdjustedStatFontSize,
  fontWeight: "bold",
  color: "white",
});

const Divider = styled.View({
  height: 1,
  backgroundColor: "#262626",
  marginVertical: 10,
});

export default React.memo(ProfilePerformance);
