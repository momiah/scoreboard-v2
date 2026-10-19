import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

import Tag from "../Tag";

const DARK_GOLD: [string, string] = ["#A87A00", "#7A5600"];
const BRIGHT_GOLD = "#FFD84D";
const seenKey = (ladderId: string) => `playoff-guide-seen:${ladderId}`;

interface HowToPlayButtonProps {
  ladderId: string;
  isPlayoffs: boolean;
  onPress: () => void;
}

const HowToPlayButton: React.FC<HowToPlayButtonProps> = ({
  ladderId,
  isPlayoffs,
  onPress,
}) => {
  const [seen, setSeen] = useState(true);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlayoffs) return;
    let active = true;
    AsyncStorage.getItem(seenKey(ladderId))
      .then((value) => {
        if (active) setSeen(value === "1");
      })
      .catch(() => {
        if (active) setSeen(false);
      });
    return () => {
      active = false;
    };
  }, [isPlayoffs, ladderId]);

  useEffect(() => {
    if (!isPlayoffs || seen) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isPlayoffs, seen, pulse]);

  if (!isPlayoffs) {
    return (
      <Tag
        name="How to Play"
        color="#00A2FF"
        iconColor="white"
        iconSize={15}
        icon="book-outline"
        iconPosition="right"
        onPress={onPress}
        bold
        testID="ladder-how-to-play"
      />
    );
  }

  const handlePress = () => {
    setSeen(true);
    AsyncStorage.setItem(seenKey(ladderId), "1").catch(() => undefined);
    onPress();
  };

  return (
    <Animated.View
      testID={seen ? "ladder-playoff-guide-seen" : "ladder-playoff-guide-new"}
      style={{
        borderRadius: 7,
        shadowColor: BRIGHT_GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: seen ? 6 : 10,
        shadowOpacity: seen ? 0.5 : 0.9,
        transform: [
          {
            scale: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.03],
            }),
          },
        ],
      }}
    >
      <LinearGradient
        colors={DARK_GOLD}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 7, borderWidth: 1, borderColor: BRIGHT_GOLD }}
      >
        <Tag
          name="How to play playoffs"
          color="transparent"
          iconColor={BRIGHT_GOLD}
          iconSize={15}
          icon="trophy"
          iconPosition="right"
          onPress={handlePress}
          bold
          testID="ladder-how-to-play"
        />
      </LinearGradient>
    </Animated.View>
  );
};

export default HowToPlayButton;
