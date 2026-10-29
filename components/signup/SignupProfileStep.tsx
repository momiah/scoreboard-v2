import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppEventsLogger } from "react-native-fbsdk-next";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import styled from "styled-components/native";

import {
  CitySelector,
  CountrySelector,
} from "../Modals/CountryCitySelectionModal";
import {
  createCourtChampsAccount,
  signupErrorMessage,
  splitFullName,
  validateUsername,
} from "../../screens/Authentication/createAccount";
import type { UserProfile } from "@shared/types";
import { PopupContext } from "../../context/PopupContext";
import FlowHeader from "./FlowHeader";
import {
  AuthField,
  FIELD_BORDER_COLOR,
  FIELD_FILL,
  FIELD_FILL_FOCUSED,
  PrimaryButton,
} from "./formParts";
import { BLUE, MUTED } from "./SignupChrome";

const flagEmoji = (code: string | null) =>
  code && code.length === 2
    ? String.fromCodePoint(
        ...[...code.toUpperCase()].map((char) => 127397 + char.charCodeAt(0)),
      )
    : "";

type Hand = "Left" | "Right" | "Both";

const HANDS: Hand[] = ["Left", "Right", "Both"];

// handPreference is a free string. The profile editor (EditProfile.js) and the
// profile screen use Left / Right / Ambidextrous, so "Both" is stored as
// "Ambidextrous" to keep the editor's chips selecting the saved value.
const HAND_TO_SCHEMA: Record<Hand, string> = {
  Left: "Left",
  Right: "Right",
  Both: "Ambidextrous",
};

interface SignupProfileStepProps {
  email: string;
  password: string;
  socialId?: string;
  socialProvider?: string;
  initialFirstName?: string;
  initialLastName?: string;
  setCurrentUser?: (user: UserProfile) => void;
  onBack: () => void;
  onCreated: (requiresEmailVerification: boolean, firstName: string) => void;
}

const SignupProfileStep: React.FC<SignupProfileStepProps> = ({
  email,
  password,
  socialId,
  socialProvider,
  initialFirstName = "",
  initialLastName = "",
  setCurrentUser,
  onBack,
  onCreated,
}) => {
  const initialName = [initialFirstName, initialLastName]
    .filter(Boolean)
    .join(" ");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState(initialName);
  const [username, setUsername] = useState("");
  const [usernameState, setUsernameState] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [usernameError, setUsernameError] = useState("");
  const [nameError, setNameError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [showCountry, setShowCountry] = useState(false);
  const [showCity, setShowCity] = useState(false);
  const [hand, setHand] = useState<Hand>("Right");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const { showBottomToast } = useContext(PopupContext);

  useEffect(() => {
    const local = username.trim().replace(/^@/, "");
    if (!local) {
      setUsernameState("idle");
      setUsernameError("");
      return;
    }
    let cancelled = false;
    setUsernameState("checking");
    const timer = setTimeout(() => {
      validateUsername(local).then((result) => {
        if (cancelled) return;
        if (result === true) {
          setUsernameState("available");
          setUsernameError("");
          return;
        }
        setUsernameState(
          result === "Username already exists" ? "taken" : "idle",
        );
        setUsernameError(result);
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const pickPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showBottomToast(
          "You need to allow access to your media library.",
          "info",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || result.assets.length === 0) return;
      const pickedUri = result.assets[0].uri;
      const fileInfo = new File(pickedUri);
      const maxSize = 5 * 1024 * 1024;
      if (fileInfo.size && fileInfo.size > maxSize) {
        showBottomToast("Please select an image smaller than 5MB.", "error");
        return;
      }
      const manipulated = await ImageManipulator.manipulateAsync(
        pickedUri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      setPhotoUri(manipulated.uri);
    } catch (error) {
      console.error("Image pick error:", error);
      showBottomToast("Unable to pick image.", "error");
    }
  };

  const onContinue = async () => {
    if (submittingRef.current) return;
    const name = splitFullName(fullName);
    if ("error" in name) {
      setNameError(name.error);
      return;
    }
    setNameError("");
    if (!country || !city) {
      setLocationError("Country and city are required");
      return;
    }
    setLocationError("");
    const cleanUsername = username.trim().replace(/^@/, "");

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const usernameResult = await validateUsername(cleanUsername);
      if (usernameResult !== true) {
        setUsernameError(usernameResult);
        setUsernameState(
          usernameResult === "Username already exists" ? "taken" : "idle",
        );
        return;
      }

      const created = await createCourtChampsAccount({
        email,
        password,
        firstName: name.firstName,
        lastName: name.lastName,
        username: cleanUsername,
        country,
        city,
        countryCode,
        handPreference: HAND_TO_SCHEMA[hand],
        photoUri,
        socialId,
        socialProvider,
        setCurrentUser,
      });
      onCreated(!created.isSocialSignup, name.firstName);
    } catch (error) {
      const reason =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string; message?: string }).code || "")
          : error instanceof Error
            ? error.message
            : "unknown";
      AppEventsLogger.logEvent("RegistrationFailed", { reason });
      showBottomToast(
        `Could not create account: ${signupErrorMessage(error)}`,
        "error",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const locationLabel =
    city && country
      ? `${flagEmoji(countryCode)} ${country} · ${city}`.trim()
      : "";

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlowHeader
          onBack={onBack}
          rightLabel="Step 2 of 2"
          testIDPrefix="signup-profile"
        />
        <ProgressTrack>
          <ProgressFill />
        </ProgressTrack>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 22,
            paddingTop: 22,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Eyebrow>PLAYER CARD</Eyebrow>
          <Title>Who&apos;s stepping on court?</Title>

          <PhotoRow>
            <PhotoButton onPress={pickPhoto} testID="signup-profile-photo">
              {photoUri ? (
                <Photo source={{ uri: photoUri }} />
              ) : (
                <Ionicons name="camera-outline" size={30} color="#c9d6e3" />
              )}
            </PhotoButton>
            <PhotoHint>Add a photo so opponents know you</PhotoHint>
          </PhotoRow>

          <Label>Full name</Label>
          <AuthField
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Alex Morgan"
            autoCapitalize="words"
            autoCorrect={false}
            testID="signup-profile-name"
          />
          {nameError ? <FieldError>{nameError}</FieldError> : null}

          <Label>Username</Label>
          <UsernameBox focused={usernameState === "available"}>
            <UsernameAt>@</UsernameAt>
            <UsernameInput
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor="#7f97a8"
              autoCapitalize="none"
              autoCorrect={false}
              testID="signup-profile-username"
            />
            {usernameState === "checking" ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : usernameState === "available" ? (
              <Available>✓ available</Available>
            ) : null}
          </UsernameBox>
          {usernameError ? <FieldError>{usernameError}</FieldError> : null}

          <Label>Location</Label>
          <LocationButton
            onPress={() => setShowCountry(true)}
            testID="signup-profile-location"
          >
            <LocationText selected={!!locationLabel}>
              {locationLabel || "Country · City"}
            </LocationText>
          </LocationButton>
          {locationError ? <FieldError>{locationError}</FieldError> : null}

          <Label>Preferred hand</Label>
          <ChipRow>
            {HANDS.map((option) => (
              <Chip
                key={option}
                selected={hand === option}
                onPress={() => setHand(option)}
                testID={`signup-profile-hand-${option.toLowerCase()}`}
              >
                <ChipText selected={hand === option}>{option}</ChipText>
              </Chip>
            ))}
          </ChipRow>

          <Spacer />

          <PrimaryButton
            label="Finish"
            onPress={onContinue}
            loading={submitting}
            testID="signup-profile-continue"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <CountrySelector
        visible={showCountry}
        onClose={() => setShowCountry(false)}
        onSelect={(selected) => {
          setCountry(selected.value);
          setCountryCode(selected.key);
          setCity("");
          setShowCity(true);
        }}
      >
        <CitySelector
          visible={showCity}
          onBack={() => setShowCity(false)}
          countryCode={countryCode}
          onSelect={(selected) => {
            setCity(selected.value);
            setShowCity(false);
            setShowCountry(false);
            setLocationError("");
          }}
        />
      </CountrySelector>
    </>
  );
};

const ProgressTrack = styled.View({
  height: 3,
  marginHorizontal: 22,
  borderRadius: 2,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
});

const ProgressFill = styled.View({
  width: "100%",
  height: 3,
  borderRadius: 2,
  backgroundColor: BLUE,
});

const Eyebrow = styled.Text({
  color: BLUE,
  fontSize: 14,
  fontWeight: "600",
  letterSpacing: 2.4,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 30,
  fontWeight: "bold",
  lineHeight: 36,
  marginTop: 10,
  marginBottom: 18,
});

const PhotoRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 16,
  marginBottom: 8,
});

const PhotoButton = styled.TouchableOpacity({
  width: 76,
  height: 76,
  borderRadius: 38,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  borderStyle: "dashed",
  borderColor: BLUE,
  overflow: "hidden",
});

const Photo = styled.Image({
  width: 76,
  height: 76,
});

const PhotoHint = styled.Text({
  flex: 1,
  color: MUTED,
  fontSize: 13,
  lineHeight: 18,
});

const Label = styled.Text({
  color: MUTED,
  fontSize: 14,
  marginBottom: 7,
  marginTop: 14,
});

const UsernameBox = styled.View<{ focused: boolean }>(
  ({ focused }: { focused: boolean }) => ({
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: focused ? FIELD_FILL_FOCUSED : FIELD_FILL,
    borderWidth: 1,
    borderColor: focused ? BLUE : FIELD_BORDER_COLOR,
  }),
);

const UsernameAt = styled.Text({
  color: "#ffffff",
  fontSize: 15,
});

const UsernameInput = styled.TextInput({
  flex: 1,
  color: "#ffffff",
  fontSize: 15,
  paddingVertical: 0,
});

const Available = styled.Text({
  color: "#4caf50",
  fontSize: 14,
});

const FieldError = styled.Text({
  color: "#ff7675",
  fontSize: 12,
  marginTop: 4,
});

const LocationButton = styled.TouchableOpacity({
  height: 54,
  borderRadius: 14,
  paddingHorizontal: 14,
  backgroundColor: FIELD_FILL,
  borderWidth: 1,
  borderColor: FIELD_BORDER_COLOR,
  justifyContent: "center",
});

const LocationText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? "#ffffff" : "#7f97a8",
    fontSize: 15,
  }),
);

const ChipRow = styled.View({
  flexDirection: "row",
  gap: 10,
});

const Chip = styled.TouchableOpacity<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    flex: 1,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: selected ? BLUE : FIELD_BORDER_COLOR,
    backgroundColor: selected ? FIELD_FILL_FOCUSED : FIELD_FILL,
  }),
);

const ChipText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? BLUE : "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  }),
);

const Spacer = styled.View({
  flex: 1,
  minHeight: 24,
});

export default SignupProfileStep;
