import React, { useEffect, useMemo, useState, memo } from "react";
import { Dimensions } from "react-native";
import Tooltip from "../Tooltip";
import { trophies, medals, ladders } from "../../mockImages/index";
import styled from "styled-components/native";
import { useImageLoader } from "../../utils/imageLoader";
import { CircleSkeleton, TextSkeleton } from "../Skeletons/SkeletonComponents";
import { COMPETITION_TYPES } from "@shared";
import { formatCurrency } from "../../helpers/formatCurrency";

const DEFAULT_TOOLTIP =
  "Prize Distribution is calculated by the total number of games played, number of players in the league and total number of winning points accumulated in the league";

const resolvePrizeImages = (competitionType) => {
  if (competitionType === COMPETITION_TYPES.LEAGUE) return trophies;
  if (competitionType === COMPETITION_TYPES.LADDER) return ladders;
  return medals;
};

const TrophyItem = memo(
  ({ trophySource, statValue, cashValue, currencyType, competitionType }) => {
    const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();
    const [showSkeleton, setShowSkeleton] = useState(true);

    useEffect(() => {
      setShowSkeleton(true);
    }, [trophySource]);

    useEffect(() => {
      if (imageLoaded) {
        const timer = setTimeout(() => setShowSkeleton(false), 100);
        return () => clearTimeout(timer);
      }
    }, [imageLoaded]);

    const ready = imageLoaded && !showSkeleton;

    return (
      <PrizeView>
        <CircleSkeleton show={showSkeleton} size={60}>
          <ImageWrapper>
            <PrizeImage
              source={trophySource}
              onLoad={handleImageLoad}
              onError={handleImageError}
              prizeType={competitionType}
              style={{ opacity: ready ? 1 : 0 }}
            />
          </ImageWrapper>
        </CircleSkeleton>

        {cashValue != null && (
          <TextSkeleton show={showSkeleton} height={14} width={34}>
            {ready ? (
              <CashText>{formatCurrency(cashValue, currencyType)}</CashText>
            ) : null}
          </TextSkeleton>
        )}

        <TextSkeleton show={showSkeleton} height={14} width={30}>
          {ready ? <PrizeText>{statValue} CP</PrizeText> : null}
        </TextSkeleton>
      </PrizeView>
    );
  },
);

TrophyItem.displayName = "TrophyItem";

const PrizeDistribution = ({
  prizePool,
  distribution,
  competitionType,
  cashPool,
  currencyType,
  tooltipMessage,
  onViewFullDistribution,
}) => {
  const isLadder = competitionType === COMPETITION_TYPES.LADDER;

  const prizes = useMemo(() => {
    const prizesType = resolvePrizeImages(competitionType);
    return distribution.map((percentage, index) => ({
      xp: Math.floor(prizePool * percentage),
      cash: cashPool != null ? Math.floor(cashPool * percentage) : null,
      trophy: prizesType[index],
    }));
  }, [prizePool, cashPool, distribution, competitionType]);

  return (
    <PrizeDistributionContainer>
      <SectionTitleContainer>
        <TitleGroup>
          <SectionTitle>Prize Distribution</SectionTitle>
          <Tooltip message={tooltipMessage || DEFAULT_TOOLTIP} />
        </TitleGroup>
        {isLadder && (
          <ViewAllButton
            activeOpacity={0.7}
            onPress={onViewFullDistribution}
            testID="view-full-distribution"
          >
            <ViewAllText>View Full Distribution</ViewAllText>
          </ViewAllButton>
        )}
      </SectionTitleContainer>
      <PrizeRow>
        {prizes.map((prize, index) => (
          <TrophyItem
            key={`trophy-${index}`}
            trophySource={prize.trophy}
            statValue={prize.xp ?? 0}
            cashValue={prize.cash}
            currencyType={currencyType}
            competitionType={competitionType}
          />
        ))}
      </PrizeRow>
    </PrizeDistributionContainer>
  );
};

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
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 10,
});

const TitleGroup = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
});

const ViewAllButton = styled.TouchableOpacity({});

const ViewAllText = styled.Text({
  color: "#00A2FF",
  fontSize: 13,
  fontWeight: "600",
});

const PrizeRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
});

const PrizeView = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  border: "1px solid rgb(26, 28, 54)",
  padding: screenWidth <= 400 ? 10 : 15,
  borderRadius: 8,
  alignItems: "center",
});

const PrizeImage = styled.Image(({ prizeType }) => ({
  width: prizeType === "league" || prizeType === "ladder" ? 60 : 40,
  height: 60,
}));

const PrizeText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
});

const CashText = styled.Text({
  color: "#00A2FF",
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 2,
});

const ImageWrapper = styled.View({
  width: 60,
  height: 60,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
});

export default PrizeDistribution;
