import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

import { AppleLogo, CourtChampLogoIcon, GoogleLogo } from "../../assets";
import {
  validateEmail,
  validatePassword,
} from "../../screens/Authentication/createAccount";
import type { SocialSignInResult } from "../../screens/Authentication/socialAuth";
import {
  signInWithApple,
  signInWithGoogle,
} from "../../screens/Authentication/socialAuth";
import SignupChrome, { BLUE, BODY, MUTED, SHEET } from "./SignupChrome";

type ProfileLookup = (
  userId: string,
) => Promise<Record<string, unknown> | null | undefined>;

interface SignupAccountStepProps {
  getUserById: ProfileLookup;
  onLogin: () => void;
  onEmailAccepted: (email: string, password: string) => void;
  onSocialExisting: (profile: Record<string, unknown>) => void;
  onSocialNeedsSignup: (params: {
    userName: string;
    userLastName: string;
    userEmail: string;
    userId: string;
    provider: "google" | "apple";
  }) => void;
}

const SignupAccountStep: React.FC<SignupAccountStepProps> = ({
  getUserById,
  onLogin,
  onEmailAccepted,
  onSocialExisting,
  onSocialNeedsSignup,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [busy, setBusy] = useState<"apple" | "google" | "email" | null>(null);

  const applySocialResult = (result: SocialSignInResult) => {
    if (result.status === "cancelled") return;
    if (result.status === "error") {
      console.error(result.logLabel, result.logMessage);
      Alert.alert(result.title, result.message);
      return;
    }
    if (result.status === "existing") {
      onSocialExisting(result.profile);
      return;
    }
    onSocialNeedsSignup(result.params);
  };

  const onApple = async () => {
    setBusy("apple");
    try {
      applySocialResult(await signInWithApple(getUserById));
    } finally {
      setBusy(null);
    }
  };

  const onGoogle = async () => {
    setBusy("google");
    try {
      applySocialResult(await signInWithGoogle(getUserById));
    } finally {
      setBusy(null);
    }
  };

  const onCreate = () => {
    const emailResult = validateEmail(email.trim());
    const passwordResult = validatePassword(password);
    setEmailError(emailResult === true ? "" : emailResult);
    setPasswordError(passwordResult === true ? "" : passwordResult);
    if (emailResult !== true || passwordResult !== true) return;
    onEmailAccepted(email.trim(), password);
  };

  return (
    <SignupChrome>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Hero>
            <AppIcon source={CourtChampLogoIcon} resizeMode="contain" />
            <Title>Join Court Champs</Title>
            <Subline>
              One account for every ladder, league and tournament.
            </Subline>
          </Hero>

          <Sheet>
            <SocialButton
              dark
              onPress={onApple}
              disabled={busy !== null}
              testID="signup-account-apple"
            >
              {busy === "apple" ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <SocialLogo source={AppleLogo} resizeMode="contain" />
                  <SocialLabel dark>Continue with Apple</SocialLabel>
                </>
              )}
            </SocialButton>
            <SocialButton
              onPress={onGoogle}
              disabled={busy !== null}
              testID="signup-account-google"
            >
              {busy === "google" ? (
                <ActivityIndicator color="#111111" />
              ) : (
                <>
                  <SocialLogo source={GoogleLogo} resizeMode="contain" />
                  <SocialLabel>Continue with Google</SocialLabel>
                </>
              )}
            </SocialButton>

            <DividerRow>
              <Divider />
              <DividerText>or</DividerText>
              <Divider />
            </DividerRow>

            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#7f97a8"
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
                placeholderTextColor="#7f97a8"
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

            <CreateButton
              onPress={onCreate}
              disabled={busy !== null}
              testID="signup-account-create"
            >
              <CreateLabel>Create account</CreateLabel>
            </CreateButton>

            <LoginRow>
              <LoginMuted>Already have an account? </LoginMuted>
              <LoginLink onPress={onLogin} testID="signup-account-login">
                <LoginLinkText>Log in</LoginLinkText>
              </LoginLink>
            </LoginRow>
          </Sheet>
        </ScrollView>
      </KeyboardAvoidingView>
    </SignupChrome>
  );
};

const Hero = styled.View({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 32,
  paddingTop: 24,
  gap: 12,
  minHeight: 220,
});

const AppIcon = styled.Image({
  width: 72,
  height: 72,
  borderRadius: 16,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 28,
  fontWeight: "bold",
  textAlign: "center",
});

const Subline = styled.Text({
  color: BODY,
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
});

const Sheet = styled.View({
  backgroundColor: SHEET,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  borderWidth: 1,
  borderColor: "rgb(16, 36, 58)",
  paddingHorizontal: 22,
  paddingTop: 22,
  paddingBottom: 28,
  gap: 12,
});

const SocialButton = styled.TouchableOpacity<{ dark?: boolean }>(
  ({ dark }: { dark?: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    backgroundColor: dark ? "#000000" : "#ffffff",
    borderWidth: dark ? 1 : 0,
    borderColor: "#2a2a2a",
  }),
);

const SocialLogo = styled.Image({
  width: 20,
  height: 20,
});

const SocialLabel = styled.Text<{ dark?: boolean }>(
  ({ dark }: { dark?: boolean }) => ({
  color: dark ? "#ffffff" : "#111111",
  fontSize: 16,
  fontWeight: "600",
}));

const DividerRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  marginVertical: 4,
});

const Divider = styled.View({
  flex: 1,
  height: 1,
  backgroundColor: "rgba(255, 255, 255, 0.12)",
});

const DividerText = styled.Text({
  color: MUTED,
  fontSize: 13,
});

const Field = styled.TextInput({
  height: 52,
  borderRadius: 12,
  paddingHorizontal: 16,
  backgroundColor: "#102033",
  color: "#ffffff",
  fontSize: 16,
});

const PasswordRow = styled.View({
  justifyContent: "center",
});

const EyeButton = styled.TouchableOpacity({
  position: "absolute",
  right: 14,
  height: 52,
  justifyContent: "center",
});

const FieldError = styled.Text({
  color: "#ff7675",
  fontSize: 12,
  marginTop: -6,
});

const CreateButton = styled.TouchableOpacity({
  height: 52,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BLUE,
  marginTop: 4,
});

const CreateLabel = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const LoginRow = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 4,
});

const LoginMuted = styled.Text({
  color: MUTED,
  fontSize: 14,
});

const LoginLink = styled.TouchableOpacity({});

const LoginLinkText = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
});

export default SignupAccountStep;
