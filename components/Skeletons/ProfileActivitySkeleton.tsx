import React from "react";
import { View, Dimensions } from "react-native";
import styled from "styled-components/native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

const { width: screenWidth } = Dimensions.get("window");
const itemPadding = screenWidth <= 400 ? 18 : 25;

interface ProfileActivitySkeletonProps {
  itemCount?: number;
}

const CompetitionItemSkeleton: React.FC = () => {
  return (
    <SkeletonPulse>
      <SkeletonContainer>
        <InfoSection>
          <SkeletonBlock width="80%" height={16} radius={4} />

          <View style={{ marginTop: 8 }}>
            <SkeletonBlock width="50%" height={12} radius={4} />
          </View>

          <TagRow>
            <SkeletonBlock width={60} height={20} radius={10} />
            <SkeletonBlock width={50} height={20} radius={10} />
          </TagRow>
        </InfoSection>

        <StatSection>
          <SkeletonBlock width={30} height={12} radius={4} />
          <View style={{ marginTop: 8 }}>
            <SkeletonBlock width={25} height={25} radius={4} />
          </View>
        </StatSection>

        <StatSection>
          <SkeletonBlock width={30} height={12} radius={4} />
          <View style={{ marginTop: 8 }}>
            <SkeletonBlock width={35} height={25} radius={4} />
          </View>
        </StatSection>
      </SkeletonContainer>
    </SkeletonPulse>
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
