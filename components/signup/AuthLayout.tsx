import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import styled from "styled-components/native";

import { CourtChampLogoIcon } from "../../assets";
import { PulseRing, Reveal } from "../ladder/HowToPlayReveal";
import { logoTrimmed } from "./assets";
import FlowHeader from "./FlowHeader";
import { GlassCard } from "./formParts";
import { BLUE, GlowDisc, MUTED } from "./SignupChrome";

const ICON_SIZE = 76;
const LOGO_WIDTH = 210;
const LOGO_ASPECT = 1666 / 623;

interface AuthLayoutProps {
  /** "logo" is the full Court Champs wordmark, "icon" is the crescent on its own. */
  brand: "logo" | "icon";
  title: string;
  subtitle: string;
  onBack?: () => void;
  testIDPrefix: string;
  /** Sits under the card, e.g. the switch between Log in and Create account. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared look for Join and Log in: the brand mark, then one centered glass card
 * holding the title and the form. Must sit inside SignupChrome.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  brand,
  title,
  subtitle,
  onBack,
  testIDPrefix,
  footer,
  children,
}) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
  >
    <FlowHeader onBack={onBack} testIDPrefix={testIDPrefix} />
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingBottom: 24,
        gap: 18,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Reveal from="pop" style={{ alignItems: "center" }}>
        {brand === "logo" ? (
          <View style={{ width: LOGO_WIDTH, height: LOGO_WIDTH / LOGO_ASPECT }}>
            <GlowDisc
              size={LOGO_WIDTH * 1.5}
              color="#0a5bff"
              opacity={0.4}
              offsetX={-LOGO_WIDTH * 0.15}
            />
            <Image
              source={logoTrimmed}
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
        ) : (
          <IconWrap>
            <GlowDisc size={ICON_SIZE * 2.2} color="#0a5bff" opacity={0.45} />
            <PulseRing size={ICON_SIZE * 0.95} color={BLUE} />
            <Image
              source={CourtChampLogoIcon}
              resizeMode="contain"
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
            />
          </IconWrap>
        )}
      </Reveal>

      <Reveal order={1} style={{ alignSelf: "stretch" }}>
        <GlassCard>
          <Title>{title}</Title>
          <Subline>{subtitle}</Subline>
          {children}
        </GlassCard>
      </Reveal>

      {footer ? (
        <Reveal order={2} style={{ alignItems: "center" }}>
          {footer}
        </Reveal>
      ) : null}
    </ScrollView>
  </KeyboardAvoidingView>
);

const IconWrap = styled.View({
  width: ICON_SIZE,
  height: ICON_SIZE,
  alignItems: "center",
  justifyContent: "center",
  marginVertical: 14,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 26,
  fontWeight: "bold",
  textAlign: "center",
});

const Subline = styled.Text({
  color: MUTED,
  fontSize: 14,
  lineHeight: 20,
  textAlign: "center",
  alignSelf: "center",
  maxWidth: 270,
  marginTop: -4,
  marginBottom: 2,
});

export default AuthLayout;
