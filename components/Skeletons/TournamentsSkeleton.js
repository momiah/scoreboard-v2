import React from "react";
import { View } from "react-native";
import { Skeleton } from "moti/skeleton";
import { SKELETON_THEMES } from "./skeletonConfig";

const { colors } = SKELETON_THEMES.dark;

const TournamentsSkeleton = () => {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 15,
        paddingHorizontal: 10,
        marginTop: 20,
      }}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          style={{ width: "47%", borderRadius: 12, overflow: "hidden" }}
        >
          <Skeleton width="100%" height={120} radius={0} colors={colors} />
          <View
            style={{
              padding: 10,
              gap: 6,
              borderWidth: 1,
              borderColor: "#192336",
            }}
          >
            <Skeleton width="80%" height={16} radius={4} colors={colors} />
            <Skeleton width="60%" height={13} radius={4} colors={colors} />
            <Skeleton width="50%" height={13} radius={4} colors={colors} />
            <View style={{ flexDirection: "row", gap: 6, marginTop: 14 }}>
              <Skeleton width={60} height={22} radius={4} colors={colors} />
              <Skeleton width={60} height={22} radius={4} colors={colors} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export default TournamentsSkeleton;
