import React from "react";
import { View } from "react-native";
import styled from "styled-components/native";

import { CourtChampLogo } from "../../../assets";
import { Reveal } from "../../ladder/HowToPlayReveal";
import { IntroScroll } from "../introStyles";
import { BODY } from "../SignupChrome";

/** Logo asset includes transparent padding; the clip trims it while keeping contain. */
const BrandPage: React.FC = () => (
  <IntroScroll>
    <Reveal from="pop">
      <LogoFrame>
        <Logo source={CourtChampLogo} resizeMode="contain" />
      </LogoFrame>
    </Reveal>
    <Reveal order={1}>
      <Motto>THE HOME OF COMPETITIVE RACKET SPORTS</Motto>
    </Reveal>
  </IntroScroll>
);

const LogoFrame = styled(View)({
  width: 280,
  height: 96,
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
});

const Logo = styled.Image({
  width: 360,
  height: 140,
});

const Motto = styled.Text({
  color: BODY,
  fontSize: 12,
  fontWeight: "600",
  letterSpacing: 1.2,
  textAlign: "center",
  paddingHorizontal: 12,
});

export default BrandPage;
