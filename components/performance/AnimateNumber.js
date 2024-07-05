import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";

const AnimateNumber = ({ xp, style }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000; // animation duration in ms
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const currentValue = Math.floor(progress * xp);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [xp]);

  return <Text style={styles.number}>{displayValue}</Text>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  number: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
});

export default AnimateNumber;
