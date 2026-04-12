import React from "react";
import { View } from "react-native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

const TournamentsSkeleton = () => {
  return (
    <SkeletonPulse>
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
            <SkeletonBlock width="100%" height={120} />
            <View
              style={{
                padding: 10,
                gap: 6,
                borderWidth: 1,
                borderColor: "#192336",
              }}
            >
              <SkeletonBlock width="80%" height={16} radius={4} />
              <SkeletonBlock width="60%" height={13} radius={4} />
              <SkeletonBlock width="50%" height={13} radius={4} />
              <View style={{ flexDirection: "row", gap: 6, marginTop: 14 }}>
                <SkeletonBlock width={60} height={22} radius={4} />
                <SkeletonBlock width={60} height={22} radius={4} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
};

export default TournamentsSkeleton;
