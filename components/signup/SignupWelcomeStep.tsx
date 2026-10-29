import React from "react";
import { ScrollView } from "react-native";
import styled from "styled-components/native";

import { highQualityRanks } from "../../rankingMedals/ranking/ranks";
import {
  HowToPlayButton as NavButton,
  HowToPlayButtonText as NavButtonText,
} from "../ladder/HowToPlayFlow";
import { Reveal } from "../ladder/HowToPlayReveal";
import { BODY, BLUE, BRONZE, GOLD, GlowDisc, MUTED } from "./SignupChrome";

const HERO_SIZE = 120;

interface SignupWelcomeStepProps {
  firstName: string;
  requiresEmailVerification: boolean;
  onExplore: () => void;
  onCreateLeague: () => void;
}

const SignupWelcomeStep: React.FC<SignupWelcomeStepProps> = ({
  firstName,
  requiresEmailVerification,
  onExplore,
  onCreateLeague,
}) => (
  <ScrollView
    contentContainerStyle={{
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 24,
    }}
    showsVerticalScrollIndicator={false}
  >
    <Reveal>
      <Eyebrow>
        {firstName ? `WELCOME, ${firstName.toUpperCase()}` : "WELCOME"}
      </Eyebrow>
    </Reveal>
    <Reveal order={1}>
      <Title>You&apos;re in.</Title>
      <Title gold>Let&apos;s climb.</Title>
    </Reveal>
    <Reveal order={2} from="pop">
      <Hero>
        <GlowDisc size={HERO_SIZE * 1.8} color={BRONZE} opacity={0.45} />
        <Medal source={highQualityRanks[0]?.icon} resizeMode="contain" />
      </Hero>
    </Reveal>
    <Reveal order={3}>
      <RankLine>
        Beginner · 20 CP. Play your first game to start earning.
      </RankLine>
      {requiresEmailVerification ? (
        <RankLine>
          Check your email and verify your account, then log in.
        </RankLine>
      ) : null}
    </Reveal>

    <Reveal order={4}>
      <Section>Competitions for you</Section>
    </Reveal>
    <Reveal order={5} from="right">
      <Placeholder>
        <PlaceholderText>[ PLACEHOLDER · competition card ]</PlaceholderText>
        <PlaceholderText>
          Future: open ladders / leagues / tournaments near the player
        </PlaceholderText>
      </Placeholder>
    </Reveal>
    <Reveal order={6} from="right">
      <Placeholder>
        <PlaceholderText>[ PLACEHOLDER · competition card ]</PlaceholderText>
      </Placeholder>
    </Reveal>

    <Spacer />
    <Actions>
      <NavButton
        primary
        style={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto" }}
        onPress={onExplore}
        testID="signup-welcome-explore"
      >
        <NavButtonText>Explore Court Champs</NavButtonText>
      </NavButton>
      <NavButton
        style={{ flexGrow: 0, flexShrink: 0, flexBasis: "auto" }}
        onPress={onCreateLeague}
        testID="signup-welcome-league"
      >
        <NavButtonText>Create a league</NavButtonText>
      </NavButton>
    </Actions>
  </ScrollView>
);

const Eyebrow = styled.Text({
  color: BLUE,
  fontSize: 14,
  fontWeight: "600",
  letterSpacing: 2.4,
  textAlign: "center",
  marginBottom: 12,
});

const Title = styled.Text<{ gold?: boolean }>(
  ({ gold }: { gold?: boolean }) => ({
    color: gold ? GOLD : "#ffffff",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 42,
  }),
);

const Hero = styled.View({
  width: HERO_SIZE,
  height: HERO_SIZE,
  alignSelf: "center",
  alignItems: "center",
  justifyContent: "center",
  marginVertical: 20,
});

const Medal = styled.Image({
  width: HERO_SIZE,
  height: HERO_SIZE,
});

const RankLine = styled.Text({
  color: MUTED,
  fontSize: 16,
  lineHeight: 23,
  textAlign: "center",
  marginBottom: 4,
});

const Section = styled.Text({
  color: MUTED,
  fontSize: 14,
  marginTop: 20,
  marginBottom: 10,
});

const Placeholder = styled.View({
  padding: 16,
  borderRadius: 14,
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "rgba(201, 214, 227, 0.35)",
  marginBottom: 12,
  gap: 2,
});

const PlaceholderText = styled.Text({
  color: BODY,
  opacity: 0.75,
  fontSize: 13.5,
  lineHeight: 19,
});

const Spacer = styled.View({
  flex: 1,
  minHeight: 20,
});

const Actions = styled.View({
  gap: 12,
});

export default SignupWelcomeStep;
