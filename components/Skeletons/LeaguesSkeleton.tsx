import React from "react";
import { View } from "react-native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

const LeaguesSkeleton = () => {
  return (
    <SkeletonPulse>
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
            <SkeletonBlock width="100%" height={200} radius={10} />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
};

export default LeaguesSkeleton;
