import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Dimensions } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const BAR_WIDTH = width * 0.6;

interface LoadingOverlayProps {
  visible: boolean;
  loadingText?: string;
}

const LoadingOverlay = ({
  visible,
  loadingText = "Players",
}: LoadingOverlayProps) => {
  const slideAnim = useRef(new Animated.Value(-BAR_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      opacityAnim.setValue(1);
      slideAnim.setValue(-BAR_WIDTH);
      Animated.loop(
        Animated.timing(slideAnim, {
          toValue: BAR_WIDTH,
          duration: 1200,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: opacityAnim }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <LoadingText>{`Loading ${loadingText}...`}</LoadingText>
      <ProgressBarBackground>
        <Animated.View
          style={{
            width: BAR_WIDTH * 0.4,
            height: "100%",
            transform: [{ translateX: slideAnim }],
          }}
        >
          <LinearGradient
            colors={["transparent", "#00A2FF", "#0057FF", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </ProgressBarBackground>
    </Animated.View>
  );
};

const LoadingText = styled.Text({
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 10,
});

const ProgressBarBackground = styled.View({
  width: BAR_WIDTH,
  height: 12,
  backgroundColor: "#0A1F33",
  borderRadius: 10,
  overflow: "hidden",
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 16, 31, 0.92)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
});

export default LoadingOverlay;
