import React from "react";
import { ActivityIndicator, Image, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

import { FacebookLogo, GoogleLogo } from "../../assets";
import { BLUE, FIELD_BG, FIELD_BORDER, MUTED, SHEET } from "./SignupChrome";

export const Sheet = styled.View({
  backgroundColor: SHEET,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  borderWidth: 1,
  borderBottomWidth: 0,
  borderColor: "rgb(16, 36, 58)",
  paddingHorizontal: 24,
  paddingTop: 24,
  paddingBottom: 28,
  gap: 12,
});

export const Field = styled.TextInput.attrs({
  placeholderTextColor: "#c9d6e3",
})({
  height: 48,
  borderRadius: 8,
  paddingHorizontal: 16,
  backgroundColor: FIELD_BG,
  borderWidth: 1,
  borderColor: FIELD_BORDER,
  color: "#ffffff",
  fontSize: 15,
});

export const FieldError = styled.Text({
  color: "#ff7675",
  fontSize: 12,
  marginTop: -6,
});

export const PrimaryButton = styled.TouchableOpacity<{ disabled?: boolean }>(
  ({ disabled }: { disabled?: boolean }) => ({
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLUE,
    opacity: disabled ? 0.6 : 1,
  }),
);

export const PrimaryLabel = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const DividerRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
});

const DividerLine = styled.View({
  flex: 1,
  height: 1,
  backgroundColor: "rgba(255, 255, 255, 0.14)",
});

const DividerText = styled.Text({
  color: MUTED,
  fontSize: 13,
});

export const OrDivider: React.FC = () => (
  <DividerRow>
    <DividerLine />
    <DividerText>or</DividerText>
    <DividerLine />
  </DividerRow>
);

const SocialButton = styled.TouchableOpacity<{ disabled?: boolean }>(
  ({ disabled }: { disabled?: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    opacity: disabled ? 0.6 : 1,
  }),
);

const SocialLabel = styled.Text({
  color: "#000000",
  fontSize: 15,
  fontWeight: "700",
});

export type SocialKind = "apple" | "google" | "facebook";

interface SocialButtonsProps {
  busy: SocialKind | "email" | null;
  onApple: () => void;
  onGoogle: () => void;
  onFacebook?: () => void;
  testIDPrefix: string;
}

/** Apple sign-in only exists on iOS, so the button is hidden elsewhere. */
export const SocialButtons: React.FC<SocialButtonsProps> = ({
  busy,
  onApple,
  onGoogle,
  onFacebook,
  testIDPrefix,
}) => {
  const renderBody = (
    kind: SocialKind,
    label: string,
    icon: React.ReactNode,
  ) =>
    busy === kind ? (
      <ActivityIndicator color="#111111" />
    ) : (
      <>
        {icon}
        <SocialLabel>{label}</SocialLabel>
      </>
    );

  return (
    <>
      {Platform.OS === "ios" ? (
        <SocialButton
          onPress={onApple}
          disabled={busy !== null}
          testID={`${testIDPrefix}-apple`}
        >
          {renderBody(
            "apple",
            "Continue with Apple",
            <Ionicons name="logo-apple" size={20} color="#000000" />,
          )}
        </SocialButton>
      ) : null}
      <SocialButton
        onPress={onGoogle}
        disabled={busy !== null}
        testID={`${testIDPrefix}-google`}
      >
        {renderBody(
          "google",
          "Continue with Google",
          <Image
            source={GoogleLogo}
            resizeMode="contain"
            style={{ width: 18, height: 18 }}
          />,
        )}
      </SocialButton>
      {onFacebook ? (
        <SocialButton
          onPress={onFacebook}
          disabled={busy !== null}
          testID={`${testIDPrefix}-facebook`}
        >
          {renderBody(
            "facebook",
            "Continue with Facebook",
            <Image
              source={FacebookLogo}
              resizeMode="contain"
              style={{ width: 20, height: 20 }}
            />,
          )}
        </SocialButton>
      ) : null}
    </>
  );
};
