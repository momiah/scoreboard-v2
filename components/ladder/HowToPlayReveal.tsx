import React, { createContext, useContext, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

/** True while the How to Play page holding this subtree is on screen. */
export const RevealContext = createContext(true);

const STAGGER_MS = 90;
const DURATION_MS = 420;

type RevealFrom = "up" | "right" | "pop";

interface RevealProps {
  order?: number;
  from?: RevealFrom;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Fades its children in the first time their page is shown, staggered by order. */
export const Reveal: React.FC<RevealProps> = ({
  order = 0,
  from = "up",
  style,
  children,
}) => {
  const active = useContext(RevealContext);
  const progress = useRef(new Animated.Value(0)).current;
  const shown = useRef(false);

  useEffect(() => {
    if (!active || shown.current) return;
    shown.current = true;
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      delay: order * STAGGER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [active, order, progress]);

  const offset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [from === "pop" ? 0.6 : 24, from === "pop" ? 1 : 0],
  });
  const transform =
    from === "pop"
      ? [{ scale: offset }]
      : from === "right"
        ? [{ translateX: offset }]
        : [{ translateY: offset }];

  return (
    <Animated.View style={[style, { opacity: progress, transform }]}>
      {children}
    </Animated.View>
  );
};

/** A soft ring that keeps pulsing out from behind a page's icon, only while that page is on screen. */
export const PulseRing: React.FC<{ size: number; color: string }> = ({
  size,
  color,
}) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const active = useContext(RevealContext);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [pulse, active]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 0],
        }),
        transform: [
          {
            scale: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.45],
            }),
          },
        ],
      }}
    />
  );
};
