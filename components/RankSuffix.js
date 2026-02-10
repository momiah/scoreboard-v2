// RankSuffix.js
import React from "react";
import { Text, Dimensions, View } from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const defaultFontSize = screenWidth <= 400 ? 20 : 25;

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
  const fontSize = numberStyle?.fontSize || defaultFontSize;

  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-start" }, style]}>
      <Text style={numberStyle}>{number}</Text>
      <Text
        style={[
          {
            fontSize: fontSize * 0.6,
            lineHeight: fontSize,
          },
          suffixStyle,
        ]}
      >
        {suffix}
      </Text>
    </View>
  );
};

// Optional prop types validation
// RankSuffix.propTypes = {
//   number: PropTypes.number,
//   style: PropTypes.object,
//   numberStyle: PropTypes.object,
//   suffixStyle: PropTypes.object,
// };

export default RankSuffix;
