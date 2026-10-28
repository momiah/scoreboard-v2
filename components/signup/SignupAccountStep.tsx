import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

import {
  validateEmail,
  validatePassword,
} from "../../screens/Authentication/createAccount";
import type { SocialSignupParams } from "../../screens/Authentication/socialAuth";
import AuthLayout from "./AuthLayout";
import {
  AuthField,
  OrDivider,
  PrimaryButton,
  SocialButtons,
} from "./formParts";
import { BLUE, MUTED } from "./SignupChrome";
import { useSocialAuth } from "./useSocialAuth";
import type { ProfileLookup } from "./useSocialAuth";

interface SignupAccountStepProps {
  getUserById: ProfileLookup;
  onBack: () => void;
  onLogin: () => void;
  onEmailAccepted: (email: string, password: string) => void;
  onSocialExisting: (profile: Record<string, unknown>, method: string) => void;
  onSocialNeedsSignup: (params: SocialSignupParams) => void;
}

const SignupAccountStep: React.FC<SignupAccountStepProps> = ({
  getUserById,
  onBack,
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
    <AuthLayout
      title="Join Court Champs"
      subtitle="One account for every ladder, league and tournament."
      onBack={onBack}
      testIDPrefix="signup-account"
    >
      <SocialButtons
        busy={social.busy}
        onApple={() => social.run("apple")}
        onGoogle={() => social.run("google")}
        testIDPrefix="signup-account"
      />
      <OrDivider label="or use email" />

      <AuthField
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        error={emailError}
        testID="signup-account-email"
      />
      <AuthField
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        error={passwordError}
        testID="signup-account-password"
        right={
          <TouchableOpacity
            onPress={() => setShowPassword((current) => !current)}
            hitSlop={10}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={MUTED}
            />
          </TouchableOpacity>
        }
      />

      <PrimaryButton
        label="Create account"
        onPress={onCreate}
        disabled={social.busy !== null}
        testID="signup-account-create"
      />

      <LoginRow>
        <LoginMuted>Already have an account? </LoginMuted>
        <TouchableOpacity onPress={onLogin} testID="signup-account-login">
          <LoginLink>Log in</LoginLink>
        </TouchableOpacity>
      </LoginRow>
    </AuthLayout>
  );
};

const LoginRow = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
});

const LoginMuted = styled.Text({
  color: MUTED,
  fontSize: 14,
});

const LoginLink = styled.Text({
  color: BLUE,
  fontSize: 14,
  fontWeight: "bold",
});

export default SignupAccountStep;
