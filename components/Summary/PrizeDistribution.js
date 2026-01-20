import React, { useEffect, useMemo, useState } from "react";
import { Dimensions } from "react-native";
import Tooltip from "../Tooltip";
import { trophies, medals } from "../../mockImages/index";
import styled from "styled-components/native";
import { useImageLoader } from "../../utils/imageLoader";
import {
  CircleSkeleton,
  TextSkeleton,
  TrophyItemSkeleton,
} from "../../components/Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";

const PrizeDistribution = ({ prizePool, distribution, competitionType }) => {
  const prizes = useMemo(() => {
    const prizesType = competitionType === "league" ? trophies : medals;
    return distribution.map((percentage, index) => ({
      xp: Math.floor(prizePool * percentage),
      trophy: prizesType[index],
    }));
  }, [prizePool]);

  const TrophyItem = React.memo(({ trophySource, statValue, index }) => {
    const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();
    const [showSkeleton, setShowSkeleton] = useState(true);

    // Reset skeleton when image source changes or component mounts
    useEffect(() => {
      setShowSkeleton(true);
    }, [trophySource]);

    useEffect(() => {
      if (imageLoaded) {
        const timer = setTimeout(() => setShowSkeleton(false), 100);
        return () => clearTimeout(timer);
      }
    }, [imageLoaded]);

    return (
      <PrizeView>
        <CircleSkeleton
          show={showSkeleton}
          size={60}
          config={SKELETON_THEMES.dark}
        >
          <ImageWrapper>
            <PrizeImage
              source={trophySource}
              onLoad={handleImageLoad}
              onError={handleImageError}
              prizeType={competitionType}
              style={{ opacity: imageLoaded && !showSkeleton ? 1 : 0 }}
            />
          </ImageWrapper>
        </CircleSkeleton>

        <TextSkeleton
          show={showSkeleton}
          height={14}
          width={30}
          config={SKELETON_THEMES.dark}
        >
          {imageLoaded && !showSkeleton ? (
            <PrizeText>{statValue} XP</PrizeText>
          ) : null}
        </TextSkeleton>
      </PrizeView>
    );
  });

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
            index={index}
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
  justifyContent: "flex-start",
  gap: 10,
  marginBottom: 10,
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
  width: prizeType === "league" ? 60 : 40,
  height: 60,
}));
const PrizeText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
});

// ...

const ImageWrapper = styled.View({
  width: 60,
  height: 60,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
});

export default PrizeDistribution;
