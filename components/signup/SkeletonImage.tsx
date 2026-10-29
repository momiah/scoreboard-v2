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

/**
 * An Image that shows the app's existing skeleton placeholder (CircleSkeleton /
 * ImageSkeleton, the same pattern RankInformation uses) until it has loaded, so
 * the page around it can render straight away. A failed load also clears the
 * placeholder rather than leaving it pulsing forever.
 */
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
