import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import styled from "styled-components/native";

import { FacebookLogo, GoogleLogo } from "../../assets";
import { BLUE, MUTED } from "./SignupChrome";

const GLASS = "rgba(255, 255, 255, 0.06)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.14)";

/** Centered glass card for the account and log in forms. `glow` adds the blue halo and top edge highlight. */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  glow?: boolean;
  transparent?: boolean;
  style?: React.ComponentProps<typeof View>["style"];
}> = ({ children, glow = true, transparent = false, style }) => (
  <CardBase glow={glow} transparent={transparent} style={style}>
    {glow ? (
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(0, 162, 255, 0)",
          "rgba(0, 162, 255, 0.9)",
          "rgba(0, 162, 255, 0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardEdge}
      />
    ) : null}
    {children}
  </CardBase>
);

const CardBase = styled.View<{ glow: boolean; transparent: boolean }>(
  ({ glow, transparent }: { glow: boolean; transparent: boolean }) => ({
    backgroundColor: transparent ? "transparent" : "rgba(6, 20, 38, 0.94)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: glow ? "rgba(0, 162, 255, 0.28)" : "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
    gap: 12,
    ...(glow
      ? {
          shadowColor: BLUE,
          shadowOpacity: 0.3,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
        }
      : {}),
  }),
);

interface AuthFieldProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  right?: React.ReactNode;
}

/** Dark field with a leading icon that lights up blue when focused. */
export const AuthField: React.FC<AuthFieldProps> = ({
  icon,
  error,
  right,
  onFocus,
  onBlur,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={focused ? BLUE : "#7f97a8"}
          style={styles.fieldIcon}
        />
        <TextInput
          {...inputProps}
          placeholderTextColor="#7f97a8"
          style={styles.fieldInput}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {right}
      </View>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
};

export const FieldError = styled.Text({
  color: "#ff7675",
  fontSize: 12,
  marginTop: 6,
  marginLeft: 4,
});

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  disabled,
  loading,
  testID,
}) => (
  <PrimaryTouch
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    testID={testID}
    style={{ opacity: disabled && !loading ? 0.6 : 1 }}
  >
    <LinearGradient
      colors={["#27b9ff", "#0086ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.primaryFill}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <PrimaryLabel>{label}</PrimaryLabel>
      )}
    </LinearGradient>
  </PrimaryTouch>
);

const PrimaryTouch = styled.TouchableOpacity({
  borderRadius: 14,
  shadowColor: BLUE,
  shadowOpacity: 0.55,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
});

const PrimaryLabel = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
  letterSpacing: 0.3,
});

const DividerRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
});

const DividerLine = styled.View({
  flex: 1,
  height: 1,
  backgroundColor: "rgba(255, 255, 255, 0.12)",
});

const DividerText = styled.Text({
  color: MUTED,
  fontSize: 12,
  letterSpacing: 1.2,
  textTransform: "uppercase",
});

export const OrDivider: React.FC<{ label?: string }> = ({ label = "or" }) => (
  <DividerRow>
    <DividerLine />
    <DividerText>{label}</DividerText>
    <DividerLine />
  </DividerRow>
);

export type SocialKind = "apple" | "google" | "facebook";

interface SocialButtonProps {
  kind: SocialKind;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  testID?: string;
}

const LABELS: Record<SocialKind, string> = {
  apple: "Continue with Apple",
  google: "Continue with Google",
  facebook: "Continue with Facebook",
};

const SocialButton: React.FC<SocialButtonProps> = ({
  kind,
  onPress,
  disabled,
  loading,
  compact,
  testID,
}) => {
  const icon =
    kind === "apple" ? (
      <Ionicons name="logo-apple" size={22} color="#ffffff" />
    ) : (
      <Image
        source={kind === "google" ? GoogleLogo : FacebookLogo}
        resizeMode="contain"
        style={{ width: 20, height: 20 }}
      />
    );

  return (
    <SocialTouch
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityLabel={LABELS[kind]}
      testID={testID}
      style={{
        flex: compact ? 1 : undefined,
        opacity: disabled && !loading ? 0.6 : 1,
      }}
    >
      {loading ? <ActivityIndicator color="#ffffff" /> : icon}
      {compact ? null : <SocialLabel>{LABELS[kind]}</SocialLabel>}
    </SocialTouch>
  );
};

const SocialTouch = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  height: 50,
  borderRadius: 14,
  backgroundColor: GLASS,
  borderWidth: 1,
  borderColor: GLASS_BORDER,
});

const SocialLabel = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "700",
});

interface SocialButtonsProps {
  busy: SocialKind | "email" | null;
  onApple: () => void;
  onGoogle: () => void;
  onFacebook?: () => void;
  compact?: boolean;
  testIDPrefix: string;
}

/** Apple sign-in only exists on iOS, so that button is hidden elsewhere. */
export const SocialButtons: React.FC<SocialButtonsProps> = ({
  busy,
  onApple,
  onGoogle,
  onFacebook,
  compact,
  testIDPrefix,
}) => {
  const buttons = (
    <>
      {Platform.OS === "ios" ? (
        <SocialButton
          kind="apple"
          onPress={onApple}
          disabled={busy !== null}
          loading={busy === "apple"}
          compact={compact}
          testID={`${testIDPrefix}-apple`}
        />
      ) : null}
      <SocialButton
        kind="google"
        onPress={onGoogle}
        disabled={busy !== null}
        loading={busy === "google"}
        compact={compact}
        testID={`${testIDPrefix}-google`}
      />
      {onFacebook ? (
        <SocialButton
          kind="facebook"
          onPress={onFacebook}
          disabled={busy !== null}
          loading={busy === "facebook"}
          compact={compact}
          testID={`${testIDPrefix}-facebook`}
        />
      ) : null}
    </>
  );
  return compact ? <View style={styles.socialRow}>{buttons}</View> : buttons;
};

const styles = StyleSheet.create({
  cardEdge: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 2,
  },
  fieldWrap: {},
  field: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  fieldFocused: {
    borderColor: BLUE,
    backgroundColor: "rgba(0, 162, 255, 0.08)",
  },
  fieldError: {
    borderColor: "#ff7675",
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    height: "100%",
    color: "#ffffff",
    fontSize: 16,
  },
  primaryFill: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
});
