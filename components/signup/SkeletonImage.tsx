import React, { useState } from "react";
import { Image } from "react-native";
import type { ImageSourcePropType, ImageStyle, StyleProp } from "react-native";

import { CircleSkeleton, ImageSkeleton } from "../Skeletons/SkeletonComponents";

interface SkeletonImageProps {
  source: ImageSourcePropType;
  width: number;
  height: number;
  /** Round placeholder for badges and avatars; rectangular otherwise. */
  circle?: boolean;
  radius?: number;
  style?: StyleProp<ImageStyle>;
}

/** An Image behind a skeleton placeholder until it loads or fails. */
const SkeletonImage: React.FC<SkeletonImageProps> = ({
  source,
  width,
  height,
  circle,
  radius = 8,
  style,
}) => {
  const [loaded, setLoaded] = useState(false);
  const markLoaded = () => setLoaded(true);
  const image = (
    <Image
      source={source}
      resizeMode="contain"
      onLoad={markLoaded}
      onError={markLoaded}
      style={[{ width, height }, style]}
    />
  );

  return circle ? (
    <CircleSkeleton show={!loaded} size={Math.min(width, height)}>
      {image}
    </CircleSkeleton>
  ) : (
    <ImageSkeleton
      show={!loaded}
      width={width}
      height={height}
      borderRadius={radius}
    >
      {image}
    </ImageSkeleton>
  );
};

export default React.memo(SkeletonImage);
