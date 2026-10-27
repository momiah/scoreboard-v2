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
import SignupChrome, { BLUE, BODY, GOLD, MUTED } from "./SignupChrome";

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
  onCreated: (requiresEmailVerification: boolean) => void;
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
    const local = username.trim();
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
        setUsernameState(result === "Username already exists" ? "taken" : "idle");
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
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
        Alert.alert("File Too Large", "Please select an image smaller than 5MB.");
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
    const usernameResult = await validateUsername(username.trim());
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
        username: username.trim(),
        country,
        city,
        countryCode,
        handPreference: HAND_TO_SCHEMA[hand],
        photoUri,
        socialId,
        socialProvider,
        setCurrentUser,
      });
      onCreated(!created.isSocialSignup);
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

  return (
    <SignupChrome>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 28,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton onPress={onBack} testID="signup-profile-back">
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </BackButton>
          <StepLabel>STEP 2 OF 2</StepLabel>
          <Title>Who&apos;s stepping on court?</Title>

          <PhotoButton onPress={pickPhoto} testID="signup-profile-photo">
            {photoUri ? (
              <Photo source={{ uri: photoUri }} />
            ) : (
              <Ionicons name="person" size={42} color="#5c7388" />
            )}
            <CameraBadge>
              <Ionicons name="camera" size={14} color="#ffffff" />
            </CameraBadge>
          </PhotoButton>

          <Label>Full name</Label>
          <Field
            value={fullName}
            onChangeText={setFullName}
            placeholder="Alex Morgan"
            placeholderTextColor="#7f97a8"
            autoCapitalize="words"
            autoCorrect={false}
            testID="signup-profile-name"
          />
          {nameError ? <FieldError>{nameError}</FieldError> : null}

          <Label>Username</Label>
          <UsernameRow>
            <Field
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor="#7f97a8"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ paddingRight: 44 }}
              testID="signup-profile-username"
            />
            <UsernameMark>
              {usernameState === "checking" ? (
                <ActivityIndicator size="small" color={BLUE} />
              ) : usernameState === "available" ? (
                <Ionicons name="checkmark-circle" size={22} color="#3DDC97" />
              ) : null}
            </UsernameMark>
          </UsernameRow>
          {usernameError ? <FieldError>{usernameError}</FieldError> : null}

          <Label>Location</Label>
          <LocationButton
            onPress={() => setShowCountry(true)}
            testID="signup-profile-location"
          >
            <LocationText selected={!!(city && country)}>
              {city && country ? `${city}, ${country}` : "City, Country"}
            </LocationText>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </LocationButton>
          {locationError ? <FieldError>{locationError}</FieldError> : null}

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

          <ContinueButton
            onPress={onContinue}
            disabled={submitting}
            testID="signup-profile-continue"
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ContinueText>Continue</ContinueText>
            )}
          </ContinueButton>
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
    </SignupChrome>
  );
};

const BackButton = styled.TouchableOpacity({
  width: 36,
  height: 36,
  justifyContent: "center",
});

const StepLabel = styled.Text({
  color: GOLD,
  fontSize: 12,
  fontWeight: "bold",
  letterSpacing: 1.4,
  marginTop: 8,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 28,
  fontWeight: "bold",
  marginTop: 8,
  marginBottom: 18,
});

const PhotoButton = styled.TouchableOpacity({
  alignSelf: "center",
  width: 104,
  height: 104,
  borderRadius: 52,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#102033",
  borderWidth: 1,
  borderColor: "rgb(30, 51, 72)",
  marginBottom: 18,
});

const Photo = styled.Image({
  width: 104,
  height: 104,
  borderRadius: 52,
});

const CameraBadge = styled.View({
  position: "absolute",
  right: 2,
  bottom: 2,
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BLUE,
  borderWidth: 2,
  borderColor: "rgb(3, 16, 31)",
});

const Label = styled.Text({
  color: BODY,
  fontSize: 13,
  marginBottom: 6,
  marginTop: 8,
});

const Field = styled.TextInput({
  height: 52,
  borderRadius: 12,
  paddingHorizontal: 16,
  backgroundColor: "#102033",
  color: "#ffffff",
  fontSize: 16,
});

const UsernameRow = styled.View({
  justifyContent: "center",
});

const UsernameMark = styled.View({
  position: "absolute",
  right: 14,
  height: 52,
  justifyContent: "center",
});

const FieldError = styled.Text({
  color: "#ff7675",
  fontSize: 12,
  marginTop: 4,
});

const LocationButton = styled.TouchableOpacity({
  height: 52,
  borderRadius: 12,
  paddingHorizontal: 16,
  backgroundColor: "#102033",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const LocationText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
  color: selected ? "#ffffff" : "#7f97a8",
  fontSize: 16,
}));

const ChipRow = styled.View({
  flexDirection: "row",
  gap: 10,
});

const Chip = styled.TouchableOpacity<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
  flex: 1,
  height: 44,
  borderRadius: 22,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: selected ? BLUE : "rgb(30, 51, 72)",
  backgroundColor: selected ? "rgba(0, 162, 255, 0.12)" : "transparent",
}));

const ChipText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
  color: selected ? BLUE : "#ffffff",
  fontSize: 15,
  fontWeight: "600",
}));

const ContinueButton = styled.TouchableOpacity({
  height: 52,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BLUE,
  marginTop: 28,
});

const ContinueText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

export default SignupProfileStep;
