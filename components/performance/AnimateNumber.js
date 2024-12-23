import React, { useState, useEffect } from "react";
import { Text, StyleSheet } from "react-native";

const AnimateNumber = ({ number, fontSize = 12, progressBar = false }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isPercentage, setIsPercentage] = useState(false);

  useEffect(() => {
    const duration = 1000; // animation duration in ms
    const startTime = performance.now();

    // Check if the number is a percentage
    let parsedNumber;
    if (typeof number === "string" && number.endsWith("%")) {
      parsedNumber = parseFloat(number.replace("%", ""));
      setIsPercentage(true);
    } else {
      parsedNumber = parseFloat(number);
      setIsPercentage(false);
    }

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const currentValue = Math.floor(progress * parsedNumber);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [number]);

  return (
    <Text
      style={[
        styles.number,
        { fontSize: fontSize, width: progressBar ? 50 : "auto" },
      ]}
    >
      {displayValue}
      {isPercentage && "%"}
    </Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  number: {
    fontWeight: "bold",
    color: "white",

    textAlign: "right",
  },
});

export default AnimateNumber;
