// RankSuffix.js
import React from "react";
import { View, Text, Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const DEFAULT_FONT_SIZE = screenWidth <= 400 ? 20 : 25;

const RankSuffix = ({ number, style, numberStyle, suffixStyle }) => {
  const getOrdinalSuffix = (num) => {
    if (typeof num !== "number" || isNaN(num)) return null;
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  if (typeof number !== "number" || isNaN(number)) {
    return <Text style={style}>N/A</Text>;
  }

  const suffix = getOrdinalSuffix(number);
  const fontSize = numberStyle?.fontSize || DEFAULT_FONT_SIZE;
  const suffixFontSize = fontSize * 0.6;

  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end" }, style]}>
      <Text style={numberStyle}>{number}</Text>
      <Text
        style={[
          {
            fontSize: suffixFontSize,
            lineHeight: suffixFontSize * 1.2,
            marginBottom: fontSize * 0.15,
          },
          suffixStyle,
        ]}
      >
        {suffix}
      </Text>
    </View>
  );
};

export default RankSuffix;
