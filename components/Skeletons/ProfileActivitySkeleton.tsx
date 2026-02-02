import React from "react";
import { View, Dimensions } from "react-native";
import { Skeleton } from "moti/skeleton";
import styled from "styled-components/native";
import { SKELETON_THEMES } from "../Skeletons/skeletonConfig";

const { width: screenWidth } = Dimensions.get("window");
const itemPadding = screenWidth <= 400 ? 18 : 25;

interface ProfileActivitySkeletonProps {
  itemCount?: number;
}

const skeletonConfig = {
  ...SKELETON_THEMES.dark,
  transition: {
    type: "timing" as const,
    duration: 1500,
  },
  colorMode: SKELETON_THEMES.dark.colorMode as "dark" | "light",
};

const CompetitionItemSkeleton: React.FC = () => {
  return (
    <SkeletonContainer>
      {/* Info section */}
      <InfoSection>
        {/* Competition name */}
        <Skeleton show height={16} width="80%" radius={4} {...skeletonConfig} />

        {/* Court name */}
        <View style={{ marginTop: 8 }}>
          <Skeleton
            show
            height={12}
            width="50%"
            radius={4}
            {...skeletonConfig}
          />
        </View>

        {/* Tags */}
        <TagRow>
          <Skeleton
            show
            height={20}
            width={60}
            radius={10}
            {...skeletonConfig}
          />
          <Skeleton
            show
            height={20}
            width={50}
            radius={10}
            {...skeletonConfig}
          />
        </TagRow>
      </InfoSection>

      {/* Wins stat */}
      <StatSection>
        <Skeleton show height={12} width={30} radius={4} {...skeletonConfig} />
        <View style={{ marginTop: 8 }}>
          <Skeleton
            show
            height={25}
            width={25}
            radius={4}
            {...skeletonConfig}
          />
        </View>
      </StatSection>

      {/* Rank stat */}
      <StatSection>
        <Skeleton show height={12} width={30} radius={4} {...skeletonConfig} />
        <View style={{ marginTop: 8 }}>
          <Skeleton
            show
            height={25}
            width={35}
            radius={4}
            {...skeletonConfig}
          />
        </View>
      </StatSection>
    </SkeletonContainer>
  );
};

const ProfileActivitySkeleton: React.FC<ProfileActivitySkeletonProps> = ({
  itemCount = 4,
}) => {
  return (
    <Container>
      {Array.from({ length: itemCount }).map((_, index) => (
        <CompetitionItemSkeleton key={index} />
      ))}
    </Container>
  );
};

export default ProfileActivitySkeleton;

const Container = styled.View({
  flex: 1,
});

const SkeletonContainer = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  padding: itemPadding,
  borderRadius: 8,
  marginBottom: 10,
  flexDirection: "row",
  justifyContent: "space-between",
});

const InfoSection = styled.View({
  padding: 5,
  width: "60%",
  justifyContent: "center",
});

const TagRow = styled.View({
  flexDirection: "row",
  gap: 10,
  marginTop: 15,
});

const StatSection = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
});
