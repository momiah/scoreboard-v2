import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

const TOAST_CONFIG: Record<
  ToastType,
  { color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { color: "#00C853", icon: "checkmark-circle-outline" },
  error: { color: "#FF4B6E", icon: "close-circle-outline" },
  info: { color: "#00A2FF", icon: "information-circle-outline" },
};

const BottomToast: React.FC<ToastProps> = ({
  visible,
  message,
  type = "success",
  duration = 3000,
  onHide,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  const { color, icon } = TOAST_CONFIG[type];

  return (
    <ToastContainer style={{ opacity }}>
      <Ionicons name={icon} size={18} color={color} />
      <ToastMessage>{message}</ToastMessage>
    </ToastContainer>
  );
};

const ToastContainer = styled(Animated.View)({
  position: "absolute",
  bottom: 100,
  alignSelf: "center",
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  backgroundColor: "rgba(2, 13, 24, 0.95)",
  borderRadius: 24,
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.1)",
  zIndex: 9999,
});

const ToastMessage = styled.Text({
  color: "white",
  fontSize: 13,
  fontWeight: "500",
});

export default BottomToast;
