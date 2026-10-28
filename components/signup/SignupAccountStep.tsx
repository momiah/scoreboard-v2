import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

import { CourtChampLogoIcon } from "../../assets";
import {
  validateEmail,
  validatePassword,
} from "../../screens/Authentication/createAccount";
import type { SocialSignupParams } from "../../screens/Authentication/socialAuth";
import FlowHeader from "./FlowHeader";
import {
  Field,
  FieldError,
  OrDivider,
  PrimaryButton,
  PrimaryLabel,
  Sheet,
  SocialButtons,
} from "./formParts";
import { BLUE, GlowDisc, MUTED } from "./SignupChrome";
import { useSocialAuth } from "./useSocialAuth";
import type { ProfileLookup } from "./useSocialAuth";

interface SignupAccountStepProps {
  getUserById: ProfileLookup;
  onBack: () => void;
  onLogin: () => void;
  onEmailAccepted: (email: string, password: string) => void;
  onSocialExisting: (profile: Record<string, unknown>, method: string) => void;
  onSocialNeedsSignup: (params: SocialSignupParams) => void;
  bottomInset: number;
}

const ICON_SIZE = 96;

const SignupAccountStep: React.FC<SignupAccountStepProps> = ({
  getUserById,
  onBack,
  onLogin,
  onEmailAccepted,
  onSocialExisting,
  onSocialNeedsSignup,
  bottomInset,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const social = useSocialAuth({
    getUserById,
    onExisting: onSocialExisting,
    onNeedsSignup: onSocialNeedsSignup,
  });

  const onCreate = () => {
    const emailResult = validateEmail(email.trim());
    const passwordResult = validatePassword(password);
    setEmailError(emailResult === true ? "" : emailResult);
    setPasswordError(passwordResult === true ? "" : passwordResult);
    if (emailResult !== true || passwordResult !== true) return;
    onEmailAccepted(email.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlowHeader onBack={onBack} testIDPrefix="signup-account" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Hero>
          <IconWrap>
            <GlowDisc size={ICON_SIZE * 2.2} color="#0a5bff" opacity={0.4} />
            <Image
              source={CourtChampLogoIcon}
              resizeMode="contain"
              style={{ width: ICON_SIZE, height: ICON_SIZE }}
            />
          </IconWrap>
          <Title>Join Court Champs</Title>
          <Subline>
            One account for every ladder, league and tournament.
          </Subline>
        </Hero>

        <Sheet style={{ paddingBottom: 28 + bottomInset }}>
          <SocialButtons
            busy={social.busy}
            onApple={() => social.run("apple")}
            onGoogle={() => social.run("google")}
            testIDPrefix="signup-account"
          />
          <OrDivider />

          <Field
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            testID="signup-account-email"
          />
          {emailError ? <FieldError>{emailError}</FieldError> : null}

          <PasswordRow>
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              style={{ paddingRight: 44 }}
              testID="signup-account-password"
            />
            <EyeButton onPress={() => setShowPassword((current) => !current)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={MUTED}
              />
            </EyeButton>
          </PasswordRow>
          {passwordError ? <FieldError>{passwordError}</FieldError> : null}

          <PrimaryButton
            onPress={onCreate}
            disabled={social.busy !== null}
            testID="signup-account-create"
          >
            <PrimaryLabel>Create account</PrimaryLabel>
          </PrimaryButton>

          <LoginRow>
            <LoginMuted>Already have an account? </LoginMuted>
            <LoginLink onPress={onLogin} testID="signup-account-login">
              <LoginLinkText>Log in</LoginLinkText>
            </LoginLink>
          </LoginRow>
        </Sheet>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Hero = styled.View({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 32,
  paddingVertical: 16,
  gap: 14,
  minHeight: 220,
});

const IconWrap = styled.View({
  width: ICON_SIZE,
  height: ICON_SIZE,
  alignItems: "center",
  justifyContent: "center",
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 28,
  fontWeight: "bold",
  textAlign: "center",
});

const Subline = styled.Text({
  color: MUTED,
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
  maxWidth: 280,
});

const PasswordRow = styled.View({
  justifyContent: "center",
});

const EyeButton = styled.TouchableOpacity({
  position: "absolute",
  right: 14,
  height: 48,
  justifyContent: "center",
});

const LoginRow = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
});

const LoginMuted = styled.Text({
  color: MUTED,
  fontSize: 14,
});

const LoginLink = styled.TouchableOpacity({});

const LoginLinkText = styled.Text({
  color: BLUE,
  fontSize: 14,
});

export default SignupAccountStep;
