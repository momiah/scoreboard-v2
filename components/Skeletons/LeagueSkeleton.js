import React from "react";
import { View } from "react-native";
import { Skeleton } from "moti/skeleton";
import { DEFAULT_SKELETON_CONFIG } from "./skeletonConfig";
import styled from "styled-components/native";



export const LeagueSkeleton = ({ children }) => {
  return (
    <Skeleton
      show={true}
      width="100%"

      radius={10}
      {...DEFAULT_SKELETON_CONFIG}
    >
      {children}
    </Skeleton>

  );
};


const LeagueSkeletonContainer = styled.View({
  marginVertical: 10,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#00152B",
  borderRadius: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 5,
  elevation: 3,
  height: 200,
});

const LeagueSkeletonWrapper = styled.View({
  flex: 1
});