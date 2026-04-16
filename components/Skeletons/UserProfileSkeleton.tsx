import React, { ReactNode } from "react";
import { View, DimensionValue } from "react-native";
import { SkeletonPulse, SkeletonBlock } from "./skeletonConfig";

interface SkeletonWrapperProps {
  children?: ReactNode;
  show: boolean;
  height: number;
  width: DimensionValue;
  radius?: number;
}

interface CircleSkeletonProps {
  children?: ReactNode;
  show: boolean;
  size: number;
}

interface TextSkeletonProps {
  children?: ReactNode;
  show: boolean;
  height?: number;
  width?: DimensionValue;
}

interface ImageSkeletonProps {
  children?: ReactNode;
  show: boolean;
  height: number;
  width: DimensionValue;
  borderRadius?: number;
}

export const SkeletonWrapper = ({
  children,
  show,
  height,
  width,
  radius = 4,
}: SkeletonWrapperProps) => {
  return (
    <View>
      {show && (
        <SkeletonPulse>
          <SkeletonBlock width={width} height={height} radius={radius} />
        </SkeletonPulse>
      )}
      <View style={show ? { position: "absolute", opacity: 0 } : undefined}>
        {children}
      </View>
    </View>
  );
};

export const CircleSkeleton = ({
  children,
  show,
  size,
}: CircleSkeletonProps) => {
  return (
    <View>
      {show && (
        <SkeletonPulse>
          <SkeletonBlock width={size} height={size} radius={size / 2} />
        </SkeletonPulse>
      )}
      <View style={show ? { position: "absolute", opacity: 0 } : undefined}>
        {children}
      </View>
    </View>
  );
};

export const TextSkeleton = ({
  children,
  show,
  height = 16,
  width = 80,
}: TextSkeletonProps) => {
  return (
    <View>
      {show && (
        <SkeletonPulse>
          <SkeletonBlock width={width} height={height} radius={4} />
        </SkeletonPulse>
      )}
      <View style={show ? { position: "absolute", opacity: 0 } : undefined}>
        {children}
      </View>
    </View>
  );
};

export const ImageSkeleton = ({
  children,
  show,
  height,
  width,
  borderRadius = 4,
}: ImageSkeletonProps) => {
  return (
    <View>
      {show && (
        <SkeletonPulse>
          <SkeletonBlock width={width} height={height} radius={borderRadius} />
        </SkeletonPulse>
      )}
      <View style={show ? { position: "absolute", opacity: 0 } : undefined}>
        {children}
      </View>
    </View>
  );
};
