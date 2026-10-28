import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import FlowHeader from "./FlowHeader";
import { BLUE, FIELD_BG, FIELD_BORDER, MUTED } from "./SignupChrome";

const flagEmoji = (code: string | null) =>
  code && code.length === 2
    ? String.fromCodePoint(
        ...[...code.toUpperCase()].map((char) => 127397 + char.charCodeAt(0)),
      )
    : "";

type Hand = "Right" | "Left";
type Format = "Doubles" | "Singles";

const HAND_TO_SCHEMA: Record<Hand, string> = {
  Right: "Right Hand",
  Left: "Left Hand",
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
  // TODO: preferred format is not on UserProfile (courtchamps-shared) or the
  // Firestore rules. Keep the choice in the UI until that schema exists.
  const [format, setFormat] = useState<Format>("Doubles");
  const [submitting, setSubmitting] = useState(false);

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
        Alert.alert(
          "Permission Required",
          "You need to allow access to your media library.",
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
        Alert.alert(
          "File Too Large",
          "Please select an image smaller than 5MB.",
        );
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
      Alert.alert("Error", "Unable to pick image.");
    }
  };

  const onContinue = async () => {
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
    const usernameResult = await validateUsername(cleanUsername);
    if (usernameResult !== true) {
      setUsernameError(usernameResult);
      setUsernameState(
        usernameResult === "Username already exists" ? "taken" : "idle",
      );
      return;
    }

    setSubmitting(true);
    try {
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
      Alert.alert("Could not create account", signupErrorMessage(error));
    } finally {
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
          <Field
            value={fullName}
            onChangeText={setFullName}
            placeholder="Alex Morgan"
            placeholderTextColor="#6f8396"
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
              placeholderTextColor="#6f8396"
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

          <ChipGroups>
            <ChipGroup>
              <Label>Handedness</Label>
              <ChipRow>
                {(["Right", "Left"] as Hand[]).map((option) => (
                  <Chip
                    key={option}
                    selected={hand === option}
                    onPress={() => setHand(option)}
                  >
                    <ChipText selected={hand === option}>{option}</ChipText>
                  </Chip>
                ))}
              </ChipRow>
            </ChipGroup>
            <ChipGroup>
              <Label>Format</Label>
              <ChipRow>
                {(["Doubles", "Singles"] as Format[]).map((option) => (
                  <Chip
                    key={option}
                    selected={format === option}
                    onPress={() => setFormat(option)}
                  >
                    <ChipText selected={format === option}>{option}</ChipText>
                  </Chip>
                ))}
              </ChipRow>
            </ChipGroup>
          </ChipGroups>

          <Spacer />

          <FinishButton
            onPress={onContinue}
            disabled={submitting}
            testID="signup-profile-continue"
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <FinishText>Finish</FinishText>
            )}
          </FinishButton>
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

const Field = styled.TextInput({
  height: 48,
  borderRadius: 8,
  paddingHorizontal: 16,
  backgroundColor: FIELD_BG,
  borderWidth: 1,
  borderColor: FIELD_BORDER,
  color: "#ffffff",
  fontSize: 15,
});

const UsernameBox = styled.View<{ focused: boolean }>(
  ({ focused }: { focused: boolean }) => ({
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FIELD_BG,
    borderWidth: 1,
    borderColor: focused ? BLUE : FIELD_BORDER,
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
  height: 48,
  borderRadius: 8,
  paddingHorizontal: 16,
  backgroundColor: FIELD_BG,
  borderWidth: 1,
  borderColor: FIELD_BORDER,
  justifyContent: "center",
});

const LocationText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? "#ffffff" : "#6f8396",
    fontSize: 15,
  }),
);

const ChipGroups = styled.View({
  flexDirection: "row",
  gap: 16,
});

const ChipGroup = styled.View({});

const ChipRow = styled.View({
  flexDirection: "row",
  gap: 8,
});

const Chip = styled.TouchableOpacity<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: selected ? BLUE : "transparent",
    backgroundColor: selected ? "rgba(0, 162, 255, 0.12)" : "#1d2a3a",
  }),
);

const ChipText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? BLUE : "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  }),
);

const Spacer = styled.View({
  flex: 1,
  minHeight: 24,
});

const FinishButton = styled.TouchableOpacity({
  height: 50,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BLUE,
});

const FinishText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

export default SignupProfileStep;
