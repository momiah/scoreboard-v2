import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import styled from "styled-components/native";

import { CourtChampLogoIcon } from "../../assets";
import { PulseRing, Reveal } from "../ladder/HowToPlayReveal";
import FlowHeader from "./FlowHeader";
import { Sheet } from "./formParts";
import { BLUE, GlowDisc, MUTED } from "./SignupChrome";

const ICON_SIZE = 88;

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
  testIDPrefix: string;
  children: React.ReactNode;
}

/**
 * Shared look for Join and Log in: glowing app icon, big title, then the form in a
 * glass sheet that rises from the bottom. Must sit inside SignupChrome.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  onBack,
  testIDPrefix,
  children,
}) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
  >
    <FlowHeader onBack={onBack} testIDPrefix={testIDPrefix} />
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Hero>
        <Reveal from="pop">
          <IconWrap>
            <GlowDisc size={ICON_SIZE * 2} color="#0a5bff" opacity={0.45} />
            <PulseRing size={ICON_SIZE * 0.95} color={BLUE} />
            <Image
              source={CourtChampLogoIcon}
              resizeMode="contain"
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
            />
          </IconWrap>
        </Reveal>
        <Reveal order={1}>
          <Title>{title}</Title>
        </Reveal>
        <Reveal order={2}>
          <Subline>{subtitle}</Subline>
        </Reveal>
      </Hero>

      <Reveal order={3} style={{ alignSelf: "stretch" }}>
        <Sheet>{children}</Sheet>
      </Reveal>
    </ScrollView>
  </KeyboardAvoidingView>
);

const Hero = styled.View({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 32,
  paddingTop: 40,
  paddingBottom: 20,
  gap: 12,
  minHeight: 240,
});

const IconWrap = styled.View({
  width: ICON_SIZE,
  height: ICON_SIZE,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 6,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 32,
  fontWeight: "bold",
  textAlign: "center",
});

const Subline = styled.Text({
  color: MUTED,
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
  maxWidth: 290,
});

export default AuthLayout;
