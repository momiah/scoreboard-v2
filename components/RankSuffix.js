// RankSuffix.js
import React from "react";
import { Text, Dimensions } from "react-native";
import { getOrdinalSuffix } from "../helpers/getOrdinalSuffix";

const { width: screenWidth } = Dimensions.get("window");
const defaultFontSize = screenWidth <= 400 ? 20 : 25;

const RankSuffix = ({ number, style, numberStyle, suffixStyle }) => {
  if (typeof number !== "number" || isNaN(number)) {
    return <Text style={style}>N/A</Text>;
  }

  if (number === 0) {
    return (
      <Text style={style}>
        <Text style={numberStyle}>-</Text>
      </Text>
    );
  }

  const suffix = getOrdinalSuffix(number);
  const fontSize = numberStyle?.fontSize || defaultFontSize;

  return (
    <Text style={style}>
      <Text style={numberStyle}>{number}</Text>
      <Text
        style={[
          {
            fontSize: fontSize * 0.6,
            lineHeight: fontSize * 0.8,
            paddingTop: fontSize * 0.1,
          },
          suffixStyle,
        ]}
      >
        {suffix}
      </Text>
    </Text>
  );
};

export default RankSuffix;
