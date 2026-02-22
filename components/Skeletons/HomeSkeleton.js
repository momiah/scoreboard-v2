import React from "react";
import styled from "styled-components/native";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from "moti/skeleton";

const { width: screenWidth } = Dimensions.get("window");
const colors = ["rgb(5, 26, 51)", "rgb(12, 68, 133)", "rgb(5, 26, 51)"];

export const HorizontalLeagueCarouselSkeleton = ({ leagues }) => {
  const itemWidth = screenWidth - 80;
  const spacing = 20;
  return (
    <View style={styles.container}>
      <View style={styles.sectionContainer}>
        <View style={styles.horizontalList}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={{ marginRight: spacing }}>
              <Skeleton
                width={itemWidth}
                height={200}
                radius={8}
                colors={colors}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export const TopPlayersSkeleton = () => {
  return (
    <View style={styles.verticalList}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} style={styles.playerItem}>
          <View style={styles.playerInfo}>
            <Skeleton width={"100%"} height={65} radius={10} colors={colors} />
          </View>
        </View>
      ))}
    </View>
  );
};

export const TournamentGridSkeleton = () => {
  return (
    <SkeletonGridContainer>
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonTournamentContainer key={index}>
          {/* Image area */}
          <Skeleton width="100%" height={120} radius={0} colors={colors} />
          {/* Info area */}
          <SkeletonInfoContainer>
            <Skeleton width="80%" height={16} radius={4} colors={colors} />
            <Skeleton width="60%" height={13} radius={4} colors={colors} />
            <Skeleton width="50%" height={13} radius={4} colors={colors} />
            <SkeletonTagRow>
              <Skeleton width={60} height={22} radius={4} colors={colors} />
              <Skeleton width={60} height={22} radius={4} colors={colors} />
            </SkeletonTagRow>
          </SkeletonInfoContainer>
        </SkeletonTournamentContainer>
      ))}
    </SkeletonGridContainer>
  );
};

const SkeletonGridContainer = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 15,
  paddingHorizontal: 10,
  marginBottom: 40,
});

const SkeletonTournamentContainer = styled.View({
  width: "47%",
  borderRadius: 12,
  overflow: "hidden",
});

const SkeletonInfoContainer = styled.View({
  padding: 10,
  gap: 6,
  borderWidth: 1,
  borderColor: "#192336",
});

const SkeletonTagRow = styled.View({
  flexDirection: "row",
  gap: 6,
  marginTop: 14,
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: " rgb(3, 16, 31)",
    flex: 1,
  },

  horizontalList: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  verticalList: {
    flexDirection: "column",
    justifyContent: "space-between",
  },
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
});
