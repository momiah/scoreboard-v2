import React from "react";
import styled from "styled-components/native";
import { View, StyleSheet, Dimensions } from "react-native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

const { width: screenWidth } = Dimensions.get("window");

export const HorizontalLeagueCarouselSkeleton = () => {
  const itemWidth = screenWidth - 80;
  const spacing = 20;
  return (
    <SkeletonPulse>
      <View style={styles.container}>
        <View style={styles.horizontalList}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={{ marginRight: spacing }}>
              <SkeletonBlock width={itemWidth} height={200} radius={8} />
            </View>
          ))}
        </View>
      </View>
    </SkeletonPulse>
  );
};

export const TopPlayersSkeleton = () => {
  return (
    <SkeletonPulse>
      <View style={styles.verticalList}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.playerItem}>
            <View style={styles.playerInfo}>
              <SkeletonBlock width={"100%"} height={65} radius={10} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
};

export const TournamentGridSkeleton = () => {
  return (
    <SkeletonPulse>
      <SkeletonGridContainer>
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonTournamentContainer key={index}>
            <SkeletonBlock width="100%" height={120} />
            <SkeletonInfoContainer>
              <SkeletonBlock width="80%" height={16} radius={4} />
              <SkeletonBlock width="60%" height={13} radius={4} />
              <SkeletonBlock width="50%" height={13} radius={4} />
              <SkeletonTagRow>
                <SkeletonBlock width={60} height={22} radius={4} />
                <SkeletonBlock width={60} height={22} radius={4} />
              </SkeletonTagRow>
            </SkeletonInfoContainer>
          </SkeletonTournamentContainer>
        ))}
      </SkeletonGridContainer>
    </SkeletonPulse>
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
  playerInfo: {
    flex: 1,
  },
});
