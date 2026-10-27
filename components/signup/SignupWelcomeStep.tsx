import React from "react";
import { ScrollView } from "react-native";
import styled from "styled-components/native";

import { ladderGold, medalOutline, trophyOutline } from "../../mockImages";
import { highQualityRanks } from "../../rankingMedals/ranking/ranks";
import { NavButton, NavButtonText } from "../ladder/HowToPlayFlow";
import { Reveal } from "../ladder/HowToPlayReveal";
import SignupChrome, { BODY, MUTED } from "./SignupChrome";

const BRONZE = "rgb(194, 106, 46)";

const PLACEHOLDERS = [
  {
    key: "ladder",
    title: "City Ladder",
    detail: "Placeholder · no live ladders yet",
    icon: ladderGold,
  },
  {
    key: "league",
    title: "Club League",
    detail: "Placeholder · coming soon",
    icon: trophyOutline,
  },
  {
    key: "tournament",
    title: "Weekend Open",
    detail: "Placeholder · coming soon",
    icon: medalOutline,
  },
];

interface SignupWelcomeStepProps {
  requiresEmailVerification: boolean;
  onExplore: () => void;
  onCreateLeague: () => void;
}

const SignupWelcomeStep: React.FC<SignupWelcomeStepProps> = ({
  requiresEmailVerification,
  onExplore,
  onCreateLeague,
}) => (
  <SignupChrome>
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 36,
        paddingBottom: 24,
      }}
    >
      <Reveal from="pop">
        <Hero>
          <Glow />
          <Medal source={highQualityRanks[0]?.icon} resizeMode="contain" />
        </Hero>
      </Reveal>
      <Reveal order={1}>
        <Title>You&apos;re in. Let&apos;s climb.</Title>
      </Reveal>
      <Reveal order={2}>
        <RankLine>Beginner · 0 CP</RankLine>
        <Hint>Play your first game to start earning.</Hint>
        {requiresEmailVerification ? (
          <Hint>
            Check your email and verify your account, then log in.
          </Hint>
        ) : null}
      </Reveal>

      <Reveal order={3}>
        <Section>COMPETITIONS FOR YOU</Section>
      </Reveal>
      {PLACEHOLDERS.map((card, index) => (
        <Reveal key={card.key} order={4 + index} from="right">
          <Card>
            <CardIcon source={card.icon} resizeMode="contain" />
            <CardCopy>
              <CardTitle>{card.title}</CardTitle>
              <CardDetail>{card.detail}</CardDetail>
            </CardCopy>
          </Card>
        </Reveal>
      ))}

      <Actions>
        <NavButton primary onPress={onExplore} testID="signup-welcome-explore">
          <NavButtonText>Explore Court Champs</NavButtonText>
        </NavButton>
        <NavButton onPress={onCreateLeague} testID="signup-welcome-league">
          <NavButtonText>Create a league</NavButtonText>
        </NavButton>
      </Actions>
    </ScrollView>
  </SignupChrome>
);

const Hero = styled.View({
  width: 120,
  height: 120,
  alignSelf: "center",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 12,
});

const Glow = styled.View({
  position: "absolute",
  width: 84,
  height: 84,
  borderRadius: 42,
  backgroundColor: "rgba(194, 106, 46, 0.55)",
  shadowColor: BRONZE,
  shadowOpacity: 0.55,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 0 },
});

const Medal = styled.Image({
  width: 96,
  height: 96,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 28,
  fontWeight: "bold",
  textAlign: "center",
});

const RankLine = styled.Text({
  color: BODY,
  fontSize: 16,
  textAlign: "center",
  marginTop: 8,
});

const Hint = styled.Text({
  color: MUTED,
  fontSize: 14,
  lineHeight: 20,
  textAlign: "center",
  marginTop: 4,
});

const Section = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
  fontWeight: "bold",
  letterSpacing: 1.2,
  marginTop: 28,
  marginBottom: 12,
});

const Card = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.06)",
  marginBottom: 10,
});

const CardIcon = styled.Image({
  width: 36,
  height: 36,
});

const CardCopy = styled.View({
  flex: 1,
  gap: 2,
});

const CardTitle = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const CardDetail = styled.Text({
  color: MUTED,
  fontSize: 13,
});

const Actions = styled.View({
  marginTop: 18,
  gap: 12,
});

export default SignupWelcomeStep;
