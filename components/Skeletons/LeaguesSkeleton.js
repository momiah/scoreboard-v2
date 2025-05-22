import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from "moti/skeleton";

const { width: screenWidth } = Dimensions.get("window");

const VerticalLeagueCarouselSkeleton = ({ leagues }) => {
  return (
    <View style={styles.container}>
      <Skeleton.Group show={true}>
        {leagues.map((_, index) => (
          <View key={index} style={styles.card}>
            <Skeleton width="100%" height="100%" radius={10} />
          </View>
        ))}
      </Skeleton.Group>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,

    backgroundColor: " rgb(3, 16, 31)",
  },
  card: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginVertical: 10,
    overflow: "hidden",
  },
});

export default VerticalLeagueCarouselSkeleton;
