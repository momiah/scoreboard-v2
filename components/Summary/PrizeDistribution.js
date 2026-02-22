import React, { useMemo } from "react";
import { Dimensions } from "react-native";
import Tooltip from "../Tooltip";
import { trophies, medals } from "../../mockImages/index";
import styled from "styled-components/native";
import {
  CircleSkeleton,
  TextSkeleton,
} from "../../components/Skeletons/UserProfileSkeleton";
import { COMPETITION_TYPES } from "../../schemas/schema";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";

const TrophyItem = React.memo(({ trophySource, statValue, isDataLoading }) => {
  return (
    <PrizeView>
      <CircleSkeleton
        show={isDataLoading}
        size={64}
        config={SKELETON_THEMES.dark}
      >
        {!isDataLoading ? <PrizeImage source={trophySource} /> : null}
      </CircleSkeleton>

      <XPWrapper>
        <TextSkeleton
          show={isDataLoading}
          height={16}
          width={50}
          config={SKELETON_THEMES.dark}
        >
          {!isDataLoading ? <PrizeText>{statValue} XP</PrizeText> : null}
        </TextSkeleton>
      </XPWrapper>
    </PrizeView>
  );
});

TrophyItem.displayName = "TrophyItem";


const PrizeDistribution = React.memo(({ prizePool, distribution, isDataLoading, competitionType }) => {
  const prizes = useMemo(() => {
    const prizesType =
      competitionType === COMPETITION_TYPES.LEAGUE ? trophies : medals;
    return distribution.map((percentage, index) => ({
      xp: Math.floor(prizePool * percentage),
      trophy: prizesType[index],
    }));
  }, [prizePool, distribution, competitionType]);


  return (
    <PrizeDistributionContainer>
      <SectionTitleContainer>
        <SectionTitle>Prize Distribution</SectionTitle>
        <Tooltip message="Prize Distribution is calculated by the total number of games played, number of players in the league and total number of winning points accumulated in the league" />
      </SectionTitleContainer>
      <PrizeRow>
        {prizes.map((prize, index) => (
          <TrophyItem
            key={index}
            trophySource={prize.trophy}
            statValue={prize.xp ?? 0}
            isDataLoading={isDataLoading}
          />
        ))}
      </PrizeRow>
    </PrizeDistributionContainer>
  );
});

PrizeDistribution.displayName = "PrizeDistribution";

const { width: screenWidth } = Dimensions.get("window");

const PrizeDistributionContainer = styled.View({
  marginBottom: 20,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
});

const SectionTitleContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 10,
  marginBottom: 10,
});

const PrizeRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 8,
});

const PrizeView = styled.View({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  padding: screenWidth <= 400 ? 10 : 15,
  borderRadius: 8,
  alignItems: "center",
});

const PrizeImage = styled.Image({
  width: 50,
  height: 50,
  resizeMode: "contain",
});

const PrizeText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  lineHeight: 16,
  fontWeight: "bold",
});

const XPWrapper = styled.View({
  marginTop: 4,
  alignItems: "center",
});

export default PrizeDistribution;
