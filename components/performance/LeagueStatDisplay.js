import React from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import { trophies } from "../../mockImages";
import { useImageLoader } from "../../utils/imageLoader";
import {
  CircleSkeleton,
  TextSkeleton,
} from "../../components/Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";

const LeagueStatsDisplay = ({ leagueStats }) => {
  const statKeys = ["first", "second", "third", "fourth"];

  // Individual trophy component
  const TrophyItem = React.memo(({ trophySource, statValue, index }) => {
    const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();

    return (
      <PrizeView>
        <CircleSkeleton
          show={!imageLoaded}
          size={60}
          config={SKELETON_THEMES.dark}
        >
          <PrizeImage
            source={trophySource}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />
        </CircleSkeleton>

        <TextSkeleton
          show={!imageLoaded}
          height={14}
          width={30}
          config={SKELETON_THEMES.dark}
        >
          <PrizeText style={{ opacity: imageLoaded ? 1 : 0 }}>
            {statValue}
          </PrizeText>
        </TextSkeleton>
      </PrizeView>
    );
  });

  return (
    <View style={{ flexDirection: "column" }}>
      <PrizeRow>
        {statKeys.map((key, index) => (
          <TrophyItem
            key={index}
            trophySource={trophies[index]}
            statValue={leagueStats?.[key] ?? 0}
            index={index}
          />
        ))}
      </PrizeRow>
    </View>
  );
};

export default React.memo(LeagueStatsDisplay, (prevProps, nextProps) => {
  return (
    JSON.stringify(prevProps.leagueStats) ===
    JSON.stringify(nextProps.leagueStats)
  );
});

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
