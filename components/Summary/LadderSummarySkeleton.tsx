import React from "react";
import styled from "styled-components/native";

import {
  CircleSkeleton,
  SkeletonWrapper,
  TextSkeleton,
} from "../Skeletons/SkeletonComponents";

const CONTENDER_ROWS = [0, 1, 2, 3];
const CAROUSEL_AVATARS = [0, 1, 2, 3, 4];

interface LadderSummarySkeletonProps {
  isPaid: boolean;
}

const LadderSummarySkeleton: React.FC<LadderSummarySkeletonProps> = ({
  isPaid,
}) => (
  <Container testID="ladder-summary-loading" scrollEnabled={false}>
    {isPaid && (
      <Block>
        <SkeletonWrapper show height={96} width="100%" radius={14} />
      </Block>
    )}

    <Block>
      <SkeletonWrapper show height={72} width="100%" radius={12} />
    </Block>

    <Section>
      <TextSkeleton show height={18} width={140} />
      <SkeletonWrapper show height={64} width="100%" radius={10} />
    </Section>

    <Section>
      <TextSkeleton show height={18} width={110} />
      <SkeletonWrapper show height={56} width="100%" radius={12} />
    </Section>

    <Section>
      <TextSkeleton show height={18} width={150} />
      <SkeletonWrapper show height={120} width="100%" radius={12} />
    </Section>

    <Section>
      <TextSkeleton show height={18} width={140} />
      {CONTENDER_ROWS.map((row) => (
        <SkeletonWrapper key={row} show height={56} width="100%" radius={8} />
      ))}
    </Section>

    <Section>
      <TextSkeleton show height={18} width={120} />
      <AvatarRow>
        {CAROUSEL_AVATARS.map((avatar) => (
          <CircleSkeleton key={avatar} show size={60} />
        ))}
      </AvatarRow>
    </Section>

    <SkeletonWrapper show height={52} width="100%" radius={12} />
  </Container>
);

export default LadderSummarySkeleton;

const Container = styled.ScrollView({
  padding: 20,
});

const Block = styled.View({
  marginBottom: 20,
});

const Section = styled.View({
  gap: 10,
  marginBottom: 20,
});

const AvatarRow = styled.View({
  flexDirection: "row",
  gap: 15,
});
