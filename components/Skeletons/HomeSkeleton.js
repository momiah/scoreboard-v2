import React from "react";
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

export const TopPlayersSkeleton = ({ count = 5 }) => {
  return (
    <View style={styles.verticalList}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.playerItem}>
          <View style={styles.playerInfo}>
            <Skeleton width={"100%"} height={65} radius={10} colors={colors} />
          </View>
        </View>
      ))}
    </View>
  );
};

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
