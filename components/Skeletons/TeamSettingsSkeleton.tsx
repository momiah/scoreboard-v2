import React from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

const TeamSettingsSkeleton: React.FC = () => (
  <SkeletonPulse>
    <Container>
      <Avatar>
        <SkeletonBlock width={96} height={96} radius={48} />
        <View style={{ marginTop: 8 }}>
          <SkeletonBlock width={90} height={13} radius={4} />
        </View>
      </Avatar>

      <SkeletonBlock width={80} height={14} radius={4} />
      <View style={{ marginTop: 8 }}>
        <SkeletonBlock width="100%" height={48} radius={12} />
      </View>

      <View style={{ marginTop: 20 }}>
        <SkeletonBlock width="100%" height={52} radius={12} />
      </View>

      <View style={{ marginTop: 40 }}>
        <SkeletonBlock width={90} height={12} radius={4} />
        <View style={{ marginTop: 10 }}>
          <SkeletonBlock width="100%" height={52} radius={12} />
        </View>
      </View>
    </Container>
  </SkeletonPulse>
);

export default TeamSettingsSkeleton;

const Container = styled.View({
  paddingTop: 8,
});

const Avatar = styled.View({
  alignItems: "center",
  paddingVertical: 20,
});
