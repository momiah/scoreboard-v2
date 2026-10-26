import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Mask,
  Path,
  Pattern,
  Rect,
  Stop,
} from "react-native-svg";

const DOT_SPACING = 10;
const BLUE = "#00A2FF";

/** A faint dot grid and two sweeping lines rising from the bottom of the screen and fading out. */
const HowToPlayBackdrop: React.FC = () => {
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) =>
    setSize(event.nativeEvent.layout);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <Pattern
              id="dots"
              width={DOT_SPACING}
              height={DOT_SPACING}
              patternUnits="userSpaceOnUse"
            >
              <Circle
                cx={DOT_SPACING / 2}
                cy={DOT_SPACING / 2}
                r={0.9}
                fill={BLUE}
              />
            </Pattern>
            <LinearGradient id="fade" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="white" stopOpacity={0.3} />
              <Stop offset="0.5" stopColor="white" stopOpacity={0.1} />
              <Stop offset="0.85" stopColor="white" stopOpacity={0} />
            </LinearGradient>
            <Mask id="fadeMask">
              <Rect width={width} height={height} fill="url(#fade)" />
            </Mask>
          </Defs>
          <Rect
            width={width}
            height={height}
            fill="url(#dots)"
            mask="url(#fadeMask)"
          />
          <Path
            d={`M ${-width * 0.1} ${height * 0.7} C ${width * 0.3} ${height * 0.56}, ${width * 0.65} ${height * 0.86}, ${width * 1.1} ${height * 0.62}`}
            stroke={BLUE}
            strokeOpacity={0.12}
            strokeWidth={1.5}
            fill="none"
          />
          <Path
            d={`M ${-width * 0.1} ${height * 0.82} C ${width * 0.35} ${height * 0.7}, ${width * 0.7} ${height * 0.94}, ${width * 1.1} ${height * 0.76}`}
            stroke={BLUE}
            strokeOpacity={0.08}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
};

export default HowToPlayBackdrop;
