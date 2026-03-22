import React from "react";
import styled from "styled-components/native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

const MedalProgressSkeleton = () => {
  return (
    <SkeletonPulse>
      <Container>
        <ProgressArrowPlaceholder />
        <SkeletonBlock width="100%" height={20} radius={10} />

        <RankRow>
          <RankBlock>
            <SkeletonBlock width={60} height={14} />
            <Spacer />
            <SkeletonBlock width={20} height={20} radius={10} />
            <Spacer />
            <SkeletonBlock width={50} height={12} />
          </RankBlock>

          <RankBlock style={{ alignItems: "flex-end" }}>
            <SkeletonBlock width={60} height={14} />
            <Spacer />
            <SkeletonBlock width={20} height={20} radius={10} />
            <Spacer />
            <SkeletonBlock width={50} height={12} />
          </RankBlock>
        </RankRow>
      </Container>
    </SkeletonPulse>
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
