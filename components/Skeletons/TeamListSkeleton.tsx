import React from "react";
import styled from "styled-components/native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

interface TeamListSkeletonProps {
  itemCount?: number;
}

const RowSkeleton: React.FC = () => (
  <Row>
    <SkeletonBlock width={36} height={36} radius={18} />
    <Info>
      <SkeletonBlock width="55%" height={15} radius={4} />
      <SkeletonBlock width="35%" height={12} radius={4} />
    </Info>
    <SkeletonBlock width={22} height={22} radius={11} />
  </Row>
);

const TeamListSkeleton: React.FC<TeamListSkeletonProps> = ({
  itemCount = 3,
}) => (
  <SkeletonPulse>
    <Container>
      {Array.from({ length: itemCount }).map((_, index) => (
        <RowSkeleton key={index} />
      ))}
    </Container>
  </SkeletonPulse>
);

export default TeamListSkeleton;

const Container = styled.View({
  paddingVertical: 12,
  gap: 10,
});

const Row = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "#0a1929",
  borderWidth: 1,
  borderColor: "#1a2b3d",
});

const Info = styled.View({
  flex: 1,
  gap: 6,
});
