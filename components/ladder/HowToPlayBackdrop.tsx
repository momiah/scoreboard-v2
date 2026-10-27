import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
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

const DOT_SPACING = 8;
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
                r={0.8}
                fill={BLUE}
              />
            </Pattern>
            <LinearGradient id="fade" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="white" stopOpacity={0.3} />
              <Stop offset="0.5" stopColor="white" stopOpacity={0.1} />
              <Stop offset="0.95" stopColor="white" stopOpacity={0} />
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
        </Svg>
      ) : null}
      {width > 0 ? (
        <>
          <DriftingWave
            height={height}
            period={width}
            baseline={height * 0.66}
            amplitude={height * 0.06}
            opacity={0.12}
            strokeWidth={1.5}
            duration={24000}
          />
          <DriftingWave
            height={height}
            period={width * 1.3}
            baseline={height * 0.8}
            amplitude={height * 0.045}
            opacity={0.08}
            strokeWidth={1}
            duration={34000}
          />
        </>
      ) : null}
    </View>
  );
};

interface DriftingWaveProps {
  height: number;
  period: number;
  baseline: number;
  amplitude: number;
  opacity: number;
  strokeWidth: number;
  duration: number;
}

const WAVE_PERIODS = 3;

/** A wave drawn three periods wide that slides right by one period on repeat, so it moves forever without a seam. */
const DriftingWave: React.FC<DriftingWaveProps> = ({
  height,
  period,
  baseline,
  amplitude,
  opacity,
  strokeWidth,
  duration,
}) => {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(slide, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [slide, duration]);

  const half = period / 2;
  const steps = Array.from(
    { length: WAVE_PERIODS * 2 - 1 },
    (_, step) => `T ${half * (step + 2)} ${baseline}`,
  ).join(" ");
  const d = `M 0 ${baseline} Q ${period / 4} ${baseline - amplitude} ${half} ${baseline} ${steps}`;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: -period,
        transform: [
          {
            translateX: slide.interpolate({
              inputRange: [0, 1],
              outputRange: [0, period],
            }),
          },
        ],
      }}
    >
      <Svg width={period * WAVE_PERIODS} height={height}>
        <Path
          d={d}
          stroke={BLUE}
          strokeOpacity={opacity}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
};

export default HowToPlayBackdrop;
