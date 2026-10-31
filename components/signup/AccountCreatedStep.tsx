import React, { useContext, useEffect, useState } from "react";
import { ScrollView } from "react-native";
import styled from "styled-components/native";
import { sendEmailVerification } from "firebase/auth";

import { PopupContext } from "../../context/PopupContext";
import { auth } from "../../services/firebase.config";

import { highQualityRanks } from "../../rankingMedals/ranking/ranks";
import {
  HowToPlayButton as NavButton,
  HowToPlayButtonText as NavButtonText,
} from "../ladder/HowToPlayFlow";
import { Reveal } from "../ladder/HowToPlayReveal";
import { BRONZE, GOLD, GlowDisc, MUTED } from "./SignupChrome";
import { Eyebrow as BaseEyebrow } from "../ladder/howToPlayTheme";

const HERO_SIZE = 120;
const RESEND_COOLDOWN_SECONDS = 180;

const ResendVerification: React.FC = () => {
  const { showBottomToast } = useContext(PopupContext);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const disabled = secondsLeft > 0 || sending;

  const onResend = async () => {
    if (disabled) return;
    const user = auth.currentUser;
    if (!user) {
      showBottomToast(
        "Log in with your email and we'll send you a new link.",
        "info",
      );
      return;
    }
    setSending(true);
    try {
      await sendEmailVerification(user);
      showBottomToast("Verification email sent. Check your inbox.", "success");
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error("Could not resend the verification email:", error);
      showBottomToast(
        "Couldn't send the email right now. Please try again shortly.",
        "error",
      );
    } finally {
      setSending(false);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <NavButton
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: "auto",
        opacity: disabled ? 0.4 : 1,
      }}
      onPress={onResend}
      disabled={disabled}
      testID="signup-welcome-resend"
    >
      <NavButtonText>
        {sending
          ? "Sending..."
          : secondsLeft > 0
            ? `Resend verification email (${minutes}:${seconds})`
            : "Resend verification email"}
      </NavButtonText>
    </NavButton>
  );
};

interface AccountCreatedStepProps {
  firstName: string;
  requiresEmailVerification: boolean;
  onExplore: () => void;
  onCreateLeague: () => void;
}

const AccountCreatedStep: React.FC<AccountCreatedStepProps> = ({
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
      {requiresEmailVerification ? <ResendVerification /> : null}
    </Actions>
  </ScrollView>
);

const Eyebrow = styled(BaseEyebrow)({
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

const Spacer = styled.View({
  flex: 1,
  minHeight: 20,
});

const Actions = styled.View({
  gap: 12,
});

export default AccountCreatedStep;
