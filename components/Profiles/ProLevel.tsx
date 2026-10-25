import React from "react";
import { StyleSheet, View } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";

import { PRO_LEVEL_MAX, getProLevel } from "@shared/helpers";

const GOLD_PILL = ["#FFE58A", "#F5C542", "#B8860B"] as const;
const GOLD_BAR = ["#FFE58A", "#D4A017"] as const;

const ProLevel: React.FC<{ cashWon?: number | null; width: number }> = ({
  cashWon,
  width,
}) => {
  const level = getProLevel(cashWon);
  if (level === 0) return null;
  return (
    <Container
      style={{ width }}
      testID={`profile-prolevel-level-${level}`}
    >
      <Pill accessible accessibilityLabel={`PROLevel ${level} of ${PRO_LEVEL_MAX}`}>
        <LinearGradient
          colors={GOLD_PILL}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <PillText allowFontScaling={false}>PROLevel</PillText>
      </Pill>
      <Bars>
        {Array.from({ length: PRO_LEVEL_MAX }, (_, index) => {
          const earned = index < level;
          return (
            <Bar
              key={index}
              testID={`profile-prolevel-bar-${index + 1}-${earned ? "on" : "off"}`}
            >
              {earned ? (
                <LinearGradient
                  colors={GOLD_BAR}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.unearned]} />
              )}
            </Bar>
          );
        })}
      </Bars>
    </Container>
  );
};

export default ProLevel;

const styles = StyleSheet.create({
  unearned: { backgroundColor: "rgba(245, 197, 66, 0.18)" },
});

const Container = styled.View({
  alignItems: "center",
  gap: 4,
  marginTop: 6,
});

const Pill = styled.View({
  borderRadius: 10,
  overflow: "hidden",
  paddingHorizontal: 8,
  paddingVertical: 2,
});

const PillText = styled.Text({
  color: "#3d2a00",
  fontSize: 11,
  fontWeight: "bold",
});

const Bars = styled.View({
  flexDirection: "row",
  gap: 3,
});

const Bar = styled.View({
  width: 10,
  height: 6,
  borderRadius: 2,
  overflow: "hidden",
});
