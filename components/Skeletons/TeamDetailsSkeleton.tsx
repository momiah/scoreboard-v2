import React from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

const MemberRowSkeleton: React.FC = () => (
  <Row>
    <SkeletonBlock width={34} height={34} radius={17} />
    <SkeletonBlock width="45%" height={14} radius={4} />
  </Row>
);

const StatCellSkeleton: React.FC = () => (
  <StatCell>
    <SkeletonBlock width={30} height={12} radius={4} />
    <View style={{ marginTop: 8 }}>
      <SkeletonBlock width={40} height={22} radius={4} />
    </View>
  </StatCell>
);

const TeamDetailsSkeleton: React.FC = () => (
  <SkeletonPulse>
    <Container>
      <Hero>
        <SkeletonBlock width={104} height={104} radius={52} />
        <View style={{ marginTop: 12 }}>
          <SkeletonBlock width={160} height={22} radius={4} />
        </View>
        <View style={{ marginTop: 12 }}>
          <SkeletonBlock width={120} height={24} radius={20} />
        </View>
      </Hero>

      <SkeletonBlock width={90} height={12} radius={4} />
      <List>
        <MemberRowSkeleton />
        <MemberRowSkeleton />
      </List>

      <View style={{ marginTop: 24, marginBottom: 12 }}>
        <SkeletonBlock width={90} height={12} radius={4} />
      </View>
      <SkeletonBlock width="100%" height={20} radius={10} />

      <StatGrid>
        <StatCellSkeleton />
        <StatCellSkeleton />
        <StatCellSkeleton />
        <StatCellSkeleton />
      </StatGrid>
    </Container>
  </SkeletonPulse>
);

export default TeamDetailsSkeleton;

const Container = styled.View({
  paddingTop: 8,
});

const Hero = styled.View({
  alignItems: "center",
  paddingVertical: 20,
});

const List = styled.View({
  gap: 10,
  marginTop: 10,
  marginBottom: 8,
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

const StatGrid = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: 16,
});

const StatCell = styled.View({
  width: "50%",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 20,
  borderTopWidth: 1,
  borderColor: "#262626",
});
