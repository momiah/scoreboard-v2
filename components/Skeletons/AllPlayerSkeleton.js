import React from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import { CircleSkeleton, TextSkeleton } from "./UserProfileSkeleton";
import { SKELETON_THEMES } from "./skeletonConfig";

const config = SKELETON_THEMES.dark;
const iconSize = 40;

const AllPlayerSkeleton = () => {
  return (
    <PlayerRow>
      <CircleSkeleton show size={iconSize} config={config}>
        <View style={{ width: iconSize, height: iconSize }} />
      </CircleSkeleton>

      <TableCell>
        <TextSkeleton show height={13} width={30} config={config}>
          <View />
        </TextSkeleton>
      </TableCell>

      <PlayerNameCell>
        <TextSkeleton show height={13} width={90} config={config}>
          <View />
        </TextSkeleton>
      </PlayerNameCell>

      <TableCell>
        <TextSkeleton show height={20} width={20} config={config}>
          <View />
        </TextSkeleton>
      </TableCell>

      <TableCell>
        <TextSkeleton show height={11} width={25} config={config}>
          <View />
        </TextSkeleton>
        <View style={{ height: 3 }} />
        <TextSkeleton show height={13} width={20} config={config}>
          <View />
        </TextSkeleton>
      </TableCell>

      <TableCell>
        <CircleSkeleton show size={iconSize} config={config}>
          <View style={{ width: iconSize, height: iconSize }} />
        </CircleSkeleton>
        <View style={{ height: 2 }} />
        <TextSkeleton show height={10} width={14} config={config}>
          <View />
        </TextSkeleton>
      </TableCell>
    </PlayerRow>
  );
};

const PlayerRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  borderTopWidth: 1,
  borderColor: "1px solid rgb(9, 33, 62)",
  borderRadius: 10,
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  width: 110,
});

export default AllPlayerSkeleton;
