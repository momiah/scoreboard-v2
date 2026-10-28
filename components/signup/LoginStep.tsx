import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

import { CourtChampLogoIcon } from "../../assets";
import {
  loginWithEmail,
  sendResetLink,
} from "../../screens/Authentication/loginAuth";
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

interface LoginStepProps {
  getUserById: ProfileLookup;
  onBack: () => void;
  onCreateAccount: () => void;
  onLoggedIn: (
    profile: Record<string, unknown> | null,
    method?: string,
  ) => void;
  onSocialNeedsSignup: (params: SocialSignupParams) => void;
}

const ICON_SIZE = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginStep: React.FC<LoginStepProps> = ({
  getUserById,
  onBack,
  onCreateAccount,
  onLoggedIn,
  onSocialNeedsSignup,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const social = useSocialAuth({
    getUserById,
    onExisting: (profile, method) => onLoggedIn(profile, method),
    onNeedsSignup: onSocialNeedsSignup,
  });

  const checkEmail = () => {
    const value = email.trim();
    const message = !value
      ? "Email is required."
      : !EMAIL_PATTERN.test(value)
        ? "Enter a valid email address."
        : "";
    setEmailError(message);
    return !message;
  };

  const checkPassword = () => {
    const message = !password
      ? "Password is required."
      : password.length < 6
        ? "Password must be at least 6 characters."
        : "";
    setPasswordError(message);
    return !message;
  };

  const onLogin = async () => {
    const emailOk = checkEmail();
    const passwordOk = checkPassword();
    if (!emailOk || !passwordOk) return;

    setSubmitting(true);
    try {
      const result = await loginWithEmail(email.trim(), password, getUserById);
      if (result.status === "error") {
        Alert.alert(result.title, result.message);
        return;
      }
      onLoggedIn(result.profile);
    } finally {
      setSubmitting(false);
    }
  };

  const onForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Enter your email", "Please enter your email address first.");
      return;
    }
    const result = await sendResetLink(email.trim());
    Alert.alert(result.title, result.message);
  };

  const busy = submitting ? "email" : social.busy;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlowHeader onBack={onBack} testIDPrefix="signup-login" />
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
          <Title>Welcome back</Title>
          <Subline>Log in to pick up your games and your climb.</Subline>
        </Hero>

        <Sheet>
          <SocialButtons
            busy={busy}
            onApple={() => social.run("apple")}
            onGoogle={() => social.run("google")}
            onFacebook={() => social.run("facebook")}
            testIDPrefix="signup-login"
          />
          <OrDivider />

          <Field
            value={email}
            onChangeText={setEmail}
            onBlur={checkEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            testID="signup-login-email"
          />
          {emailError ? <FieldError>{emailError}</FieldError> : null}

          <PasswordRow>
            <Field
              value={password}
              onChangeText={setPassword}
              onBlur={checkPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              style={{ paddingRight: 44 }}
              testID="signup-login-password"
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
            onPress={onLogin}
            disabled={busy !== null}
            testID="signup-login-submit"
          >
            <PrimaryLabel>
              {submitting ? "Logging in..." : "Log in"}
            </PrimaryLabel>
          </PrimaryButton>

          <CenterRow>
            <LinkText onPress={onForgotPassword} testID="signup-login-forgot">
              Forgot password?
            </LinkText>
          </CenterRow>
          <CenterRow>
            <Muted>New to Court Champs? </Muted>
            <LinkText onPress={onCreateAccount} testID="signup-login-create">
              Create account
            </LinkText>
          </CenterRow>
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
  paddingVertical: 12,
  gap: 10,
  minHeight: 150,
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

const CenterRow = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
});

const Muted = styled.Text({
  color: MUTED,
  fontSize: 14,
});

const LinkText = styled.Text({
  color: BLUE,
  fontSize: 14,
});

export default LoginStep;
