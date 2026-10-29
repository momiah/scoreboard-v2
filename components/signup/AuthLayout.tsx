import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import styled from "styled-components/native";

import { Reveal } from "../ladder/HowToPlayReveal";
import { logoIcon, logoTrimmed } from "./assets";
import FlowHeader from "./FlowHeader";
import SkeletonImage from "./SkeletonImage";
import { GlassCard } from "./formParts";
import { GlowDisc, MUTED } from "./SignupChrome";

const ICON_SIZE = 128;
const LOGO_WIDTH = 216;
const LOGO_ASPECT = 1666 / 623;
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_ASPECT;
// The glow lives inside a box exactly its own size, in the normal flow of the
// scroll content. A glow bigger than its box gets sliced off by the ScrollView's
// top edge, which shows up as a hard line across the screen.
const LOGO_GLOW = 140;
const ICON_GLOW = 170;

interface AuthLayoutProps {
  /** "logo" is the full Court Champs wordmark, "icon" is the crescent on its own. */
  brand: "logo" | "icon";
  /** Omit for a card that goes straight into the subtitle and form. */
  title?: string;
  subtitle: string;
  onBack?: () => void;
  testIDPrefix: string;
  /** Sits under the card, e.g. the switch between Log in and Create account. */
  footer?: React.ReactNode;
  /** Blue halo and edge highlight on the card. */
  cardGlow?: boolean;
  /** Drops the card's background fill, keeping its border and layout. */
  cardTransparent?: boolean;
  /** "top" keeps the content just under the header instead of centering it. */
  align?: "center" | "top";
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
  cardGlow = true,
  cardTransparent = false,
  align = "center",
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
        justifyContent: align === "top" ? "flex-start" : "center",
        paddingHorizontal: 20,
        paddingBottom: 24,
        gap: 18,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Reveal from="pop" style={{ alignItems: "center" }}>
        <BrandMark brand={brand} />
      </Reveal>

      <Reveal order={1} style={{ alignSelf: "stretch" }}>
        <GlassCard glow={cardGlow} transparent={cardTransparent}>
          {title ? <Title>{title}</Title> : null}
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

/** Memoised so typing in the form never re-renders the glow and logo. */
const BrandMarkBase: React.FC<{ brand: "logo" | "icon" }> = ({ brand }) =>
  brand === "logo" ? (
    <GlowBox size={LOGO_GLOW} pull={25}>
      <GlowDisc
        size={LOGO_GLOW}
        color="#0a5bff"
        opacity={0.4}
        offsetX={-LOGO_WIDTH * 0.15}
      />
      <SkeletonImage
        source={logoTrimmed}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
      />
    </GlowBox>
  ) : (
    <GlowBox size={ICON_GLOW} pull={21}>
      <GlowDisc size={ICON_GLOW} color="#0077CC" opacity={0.45} />
      <SkeletonImage
        circle
        source={logoIcon}
        width={ICON_SIZE}
        height={ICON_SIZE}
      />
    </GlowBox>
  );
const BrandMark = React.memo(BrandMarkBase);

const GlowBox = styled.View<{ size: number; pull: number }>(
  ({ size, pull }: { size: number; pull: number }) => ({
    width: size,
    height: size,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -pull,
  }),
);

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
