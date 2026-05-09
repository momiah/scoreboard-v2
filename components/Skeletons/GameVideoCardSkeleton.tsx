import React from "react";
import { View, Dimensions } from "react-native";
import styled from "styled-components/native";
import {
  CircleSkeleton,
  TextSkeleton,
  ImageSkeleton,
} from "./UserProfileSkeleton";

const { width: screenWidth } = Dimensions.get("window");
const VIDEO_HEIGHT = screenWidth * (9 / 16);

const GameVideoCardSkeleton: React.FC = () => (
  <CardContainer>
    {/* ── Header ── */}
    <HeaderRow>
      <CircleSkeleton show size={36}>
        <View />
      </CircleSkeleton>
      <UploaderInfo>
        <TextSkeleton show height={14} width={120}>
          <View />
        </TextSkeleton>
        <TextSkeleton show height={12} width={80}>
          <View />
        </TextSkeleton>
      </UploaderInfo>
    </HeaderRow>

    {/* ── Video ── */}
    <ImageSkeleton
      show
      height={VIDEO_HEIGHT}
      width={screenWidth}
      borderRadius={0}
    >
      <View />
    </ImageSkeleton>

    {/* ── Footer ── */}
    <FooterRow>
      <TextSkeleton show height={12} width="60%">
        <View />
      </TextSkeleton>
      <ActionsRow>
        <TextSkeleton show height={20} width={40}>
          <View />
        </TextSkeleton>
        <TextSkeleton show height={20} width={40}>
          <View />
        </TextSkeleton>
      </ActionsRow>
    </FooterRow>
  </CardContainer>
);

const CardContainer = styled.View({
  width: screenWidth,
  marginBottom: 50,
});

const HeaderRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 10,
  gap: 8,
});

const UploaderInfo = styled.View({
  flex: 1,
  gap: 6,
});

const FooterRow = styled.View({
  paddingHorizontal: 12,
  paddingTop: 12,
  gap: 10,
});

const ActionsRow = styled.View({
  flexDirection: "row",
  gap: 16,
  paddingTop: 4,
});

export default GameVideoCardSkeleton;
