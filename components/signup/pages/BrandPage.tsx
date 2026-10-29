import React from "react";
import { View, useWindowDimensions } from "react-native";
import styled from "styled-components/native";

import { logoTrimmed } from "../assets";
import { BLUE, GlowDisc } from "../SignupChrome";
import { IntroScroll } from "../introStyles";
import SkeletonImage from "../SkeletonImage";

const LOGO_ASPECT = 1666 / 623;

/** Static on purpose: the brand page is the first thing people see and must never render blank. */
const BrandPage: React.FC = () => {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width - 56, 380) * 0.75;
  const logoHeight = logoWidth / LOGO_ASPECT;

  return (
    <IntroScroll scrollEnabled={false}>
      <View style={{ width: logoWidth, height: logoHeight }}>
        <GlowDisc
          size={logoHeight * 2.6}
          color="#0a5bff"
          opacity={0.32}
          offsetX={-logoWidth * 0.2}
        />
        <SkeletonImage
          source={logoTrimmed}
          width={logoWidth}
          height={logoHeight}
        />
      </View>
      <Motto numberOfLines={1} adjustsFontSizeToFit>
        THE HOME OF COMPETITIVE RACKET SPORTS
      </Motto>
    </IntroScroll>
  );
};

const Motto = styled.Text({
  color: BLUE,
  fontSize: 12,
  fontWeight: "700",
  letterSpacing: 1.6,
  textAlign: "center",
  alignSelf: "stretch",
  marginTop: 8,
});

export default React.memo(BrandPage);
