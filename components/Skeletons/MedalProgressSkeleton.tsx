// components/Skeletons/MedalProgressSkeleton.tsx
import React from "react";
import { Skeleton } from "moti/skeleton";
import styled from "styled-components/native";
import { SKELETON_THEMES } from "./skeletonConfig";

const { colors } = SKELETON_THEMES.dark;

const MedalProgressSkeleton = () => {
  return (
    <Container>
      <ProgressArrowPlaceholder />
      {/* Progress bar */}
      <Skeleton width="100%" height={20} radius={10} colors={colors} />

      {/* Rank row */}
      <RankRow>
        <RankBlock>
          <Skeleton width={60} height={14} colors={colors} />
          <Spacer />
          <Skeleton width={20} height={20} radius="round" colors={colors} />
          <Spacer />
          <Skeleton width={50} height={12} colors={colors} />
        </RankBlock>

        <RankBlock style={{ alignItems: "flex-end" }}>
          <Skeleton width={60} height={14} colors={colors} />
          <Spacer />
          <Skeleton width={20} height={20} radius="round" colors={colors} />
          <Spacer />
          <Skeleton width={50} height={12} colors={colors} />
        </RankBlock>
      </RankRow>
    </Container>
  );
};

const Container = styled.View({
  marginVertical: 20,
});

const ProgressArrowPlaceholder = styled.View({
  height: 30,
  width: "100%",
});

const RankRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 10,
});

const RankBlock = styled.View({
  flexDirection: "column",
  width: "40%",
});

const Spacer = styled.View({
  height: 5,
});

export default MedalProgressSkeleton;
