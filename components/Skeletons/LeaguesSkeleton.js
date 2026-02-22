// components/Skeletons/LeaguesSkeleton.js
import React from "react";
import { View } from "react-native";
import { Skeleton } from "moti/skeleton";
import { SKELETON_THEMES } from "./skeletonConfig";

const { colors } = SKELETON_THEMES.dark;

const LeaguesSkeleton = () => {
  return (
    <View>
      {Array.from({ length: 10 }).map((_, index) => (
        <View
          key={index}
          style={{
            marginVertical: 10,
            borderRadius: 10,
            overflow: "hidden",
            height: 200,
          }}
        >
          <Skeleton width="100%" height={200} radius={10} colors={colors} />
        </View>
      ))}
    </View>
  );
};

export default LeaguesSkeleton;
