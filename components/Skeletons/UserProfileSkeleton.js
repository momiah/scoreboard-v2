// skeletonComponents.js - Reusable skeleton components

import React from "react";
import { View } from "react-native";
import { Skeleton } from "moti/skeleton";
import { DEFAULT_SKELETON_CONFIG } from "./skeletonConfig";

// Base skeleton wrapper component
export const SkeletonWrapper = ({
  children,
  show,
  height,
  width,
  radius = 4,
  config = DEFAULT_SKELETON_CONFIG,
}) => {
  return (
    <Skeleton
      show={show}
      height={height}
      width={width}
      radius={radius}
      {...config}
    >
      {children}
    </Skeleton>
  );
};

// Circle skeleton for round images (medals, profile pics, etc.)
export const CircleSkeleton = ({
  children,
  show,
  size,
  config = DEFAULT_SKELETON_CONFIG,
}) => {
  return (
    <Skeleton show={show} height={size} width={size} radius="round" {...config}>
      {children}
    </Skeleton>
  );
};

// Text skeleton for titles, stats, labels
export const TextSkeleton = ({
  children,
  show,
  height = 16,
  width = 80,
  config = DEFAULT_SKELETON_CONFIG,
}) => {
  return (
    <Skeleton show={show} height={height} width={width} radius={4} {...config}>
      {children}
    </Skeleton>
  );
};

// Image skeleton for rectangular images
export const ImageSkeleton = ({
  children,
  show,
  height,
  width,
  borderRadius = 4,
  config = DEFAULT_SKELETON_CONFIG,
}) => {
  return (
    <Skeleton
      show={show}
      height={height}
      width={width}
      radius={borderRadius}
      {...config}
    >
      {children}
    </Skeleton>
  );
};
