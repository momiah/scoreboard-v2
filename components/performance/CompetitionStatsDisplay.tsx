import React from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import { trophies, medals } from "../../mockImages";
import { useImageLoader } from "../../utils/imageLoader";
import {
  CircleSkeleton,
  TextSkeleton,
} from "../../components/Skeletons/UserProfileSkeleton";
import { skeletonConfig } from "../../components/Skeletons/skeletonConfig";
import { COMPETITION_TYPES } from "../../schemas/schema";

type CompetitionType =
  (typeof COMPETITION_TYPES)[keyof typeof COMPETITION_TYPES];

interface PlacementStats {
  first: number;
  second: number;
  third: number;
  fourth: number;
}

interface CompetitionStatsDisplayProps {
  stats: PlacementStats;
  competitionType: CompetitionType;
}

interface TrophyItemProps {
  imageSource: number;
  statValue: number;
}

const TrophyItem: React.FC<TrophyItemProps> = ({ imageSource, statValue }) => {
  const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();

  return (
    <PrizeView>
      <CircleSkeleton show={!imageLoaded} size={60} config={skeletonConfig}>
        <PrizeImage
          source={imageSource}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />
      </CircleSkeleton>

      <TextSkeleton
        show={!imageLoaded}
        height={14}
        width={30}
        config={skeletonConfig}
      >
        <PrizeText style={{ opacity: imageLoaded ? 1 : 0 }}>
          {statValue}
        </PrizeText>
      </TextSkeleton>
    </PrizeView>
  );
};

const STAT_KEYS: (keyof PlacementStats)[] = [
  "first",
  "second",
  "third",
  "fourth",
];

const CompetitionStatsDisplay: React.FC<CompetitionStatsDisplayProps> = ({
  stats,
  competitionType,
}) => {
  const images =
    competitionType === COMPETITION_TYPES.LEAGUE ? trophies : medals;

  return (
    <View style={{ flexDirection: "column" }}>
      <PrizeRow>
        {STAT_KEYS.map((key, index) => (
          <TrophyItem
            key={key}
            imageSource={images[index]}
            statValue={stats?.[key] ?? 0}
          />
        ))}
      </PrizeRow>
    </View>
  );
};

export default React.memo(
  CompetitionStatsDisplay,
  (prevProps, nextProps) =>
    prevProps.competitionType === nextProps.competitionType &&
    JSON.stringify(prevProps.stats) === JSON.stringify(nextProps.stats)
);

const PrizeRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 10,
});

const PrizeView = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  padding: 10,
  borderRadius: 8,
  alignItems: "center",
  minWidth: 80,
});

const PrizeImage = styled.Image({
  width: 60,
  height: 60,
  marginBottom: 5,
  resizeMode: "contain",
});

const PrizeText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
  textAlign: "center",
});
