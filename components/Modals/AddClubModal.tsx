import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Text,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  InteractionManager,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Controller,
  useForm,
  type Control,
  type FieldError,
} from "react-hook-form";
import type { Club, Player } from "@shared/types";
import { locationSchema } from "@shared/schema";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { generateClubId } from "../../helpers/generateClubId";
import { uploadClubImage } from "../../utils/UploadClubImageToFirebase";
import { loadCountries, loadCities } from "../../utils/locationData";
import ListDropdown from "../ListDropdown/ListDropdown";

const { width: screenWidth } = Dimensions.get("window");

type LocalityOption = {
  key: string;
  value: string;
};

type ClubFormValues = {
  clubName: string;
  /** Country display name (same pattern as Signup onboarding). */
  country: string;
  city: string;
  clubDescription: string;
};

const defaultValues: ClubFormValues = {
  clubName: "",
  country: "",
  city: "",
  clubDescription: "",
};

interface AddClubModalProps {
  modalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess?: () => void;
}

const AddClubModal: React.FC<AddClubModalProps> = ({
  modalVisible,
  setModalVisible,
  onSuccess,
}) => {
  const { addClub } = useContext(LeagueContext);
  const { getUserById } = useContext(UserContext);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [clubCreationLoading, setClubCreationLoading] = useState(false);

  const [countries, setCountries] = useState<LocalityOption[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null,
  );
  const [cities, setCities] = useState<LocalityOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
    reset,
  } = useForm<ClubFormValues>({
    defaultValues,
  });

  const clubName = watch("clubName");
  const country = watch("country");
  const city = watch("city");

  /** Tracks sheet open/close so reset only runs on open, not when effects re-run from Strict Mode / parent updates. */
  const sheetWasVisibleRef = useRef(false);

  useEffect(() => {
    if (!modalVisible) {
      sheetWasVisibleRef.current = false;
      return;
    }

    const justOpened = !sheetWasVisibleRef.current;
    sheetWasVisibleRef.current = true;

    if (justOpened) {
      reset(defaultValues);
      setSelectedImage(null);
      setSelectedCountryCode(null);
      setCities([]);
    }

    setLoadingCountries(true);
    const task = InteractionManager.runAfterInteractions(() => {
      try {
        setCountries(loadCountries());
      } finally {
        setLoadingCountries(false);
      }
    });

    return () => {
      task.cancel();
    };
  }, [modalVisible, reset]);

  const imagePickInFlightRef = useRef(false);

  const handleImagePick = useCallback(async () => {
    if (imagePickInFlightRef.current) return;
    imagePickInFlightRef.current = true;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photos access",
          "Allow photo library access in Settings to set a club image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]) {
        try {
          const cropped = await ImageManipulator.manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 600 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
          );
          const base =
            FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
          if (base) {
            const stableUri = `${base}club-draft-${Date.now()}.jpg`;
            await FileSystem.copyAsync({ from: cropped.uri, to: stableUri });
            setSelectedImage(stableUri);
          } else {
            setSelectedImage(cropped.uri);
          }
        } catch (e) {
          console.error("Club image pick/manipulate:", e);
          Alert.alert(
            "Image",
            "Could not process that photo. Try another image.",
          );
        }
      }
    } finally {
      imagePickInFlightRef.current = false;
    }
  }, []);

  const handleCityDropdownOpen = useCallback(async () => {
    if (!selectedCountryCode) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      setCities(loadCities(selectedCountryCode));
    } catch (e) {
      console.error(e);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, [selectedCountryCode]);

  const onSubmit = async (data: ClubFormValues) => {
    setClubCreationLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert(
          "Cannot create club",
          "You must be logged in to create a club.",
        );
        return;
      }

      const userInfo = await getUserById(userId);
      if (!userInfo?.userId) {
        Alert.alert(
          "Cannot create club",
          "Could not load your profile. Please try again.",
        );
        return;
      }

      const clubId = generateClubId(data.clubName.trim());

      let clubImageUrl = "";
      if (selectedImage) {
        const uploaded = await uploadClubImage(selectedImage, clubId);
        clubImageUrl = uploaded ?? "";
        if (!clubImageUrl) {
          Alert.alert(
            "Photo upload failed",
            "We couldn't upload your club photo. Check your connection and try picking the photo again.",
          );
          return;
        }
      }

      const clubLocationLabel = `${data.city.trim()}, ${data.country.trim()}`;

      const clubPayload: Club = {
        clubId,
        clubName: data.clubName.trim(),
        clubLocation: clubLocationLabel,
        clubDescription: data.clubDescription.trim(),
        clubImage: clubImageUrl,
        clubOwner: {
          userId: userInfo.userId,
          username: userInfo.username,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          location: userInfo.location ?? locationSchema,
        },
        clubAdmins: [
          { userId: userInfo.userId, username: userInfo.username },
        ],
        createdAt: new Date(),
        pendingInvites: [],
        pendingRequests: [],
      };

      const ownerParticipant: Player = {
        userId: userInfo.userId,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        username: userInfo.username,
      };

      await addClub({ data: clubPayload, ownerParticipant });

      reset(defaultValues);
      setSelectedCountryCode(null);
      setCities([]);
      setSelectedImage(null);
      setModalVisible(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error creating club:", err);
      Alert.alert(
        "Error",
        "Could not create the club. Please check your connection and try again.",
      );
    } finally {
      setClubCreationLoading(false);
    }
  };

  const canCreate =
    Boolean(clubName?.trim()) &&
    Boolean(country?.trim()) &&
    Boolean(city?.trim()) &&
    !clubCreationLoading;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <ModalContainer>
        <SafeAreaWrapper
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollContainer
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
                <ModalTitle>Create Club</ModalTitle>
                <ModalSubtitle>
                  Add a Club for your Community where you can create Leagues,
                  Tournaments and see accumulate Player performance
                </ModalSubtitle>

                <ImagePickerContainer onPress={handleImagePick}>
                  {selectedImage ? (
                    <>
                      <ClubImage source={{ uri: selectedImage }} />
                      <OverlayIcon>
                        <AntDesign name="pluscircleo" size={32} color="#fff" />
                      </OverlayIcon>
                    </>
                  ) : (
                    <ImagePlaceholder>
                      <AntDesign name="pluscircleo" size={32} color="#ccc" />
                      <Text style={{ color: "#ccc", marginTop: 6 }}>
                        Club Image
                      </Text>
                    </ImagePlaceholder>
                  )}
                </ImagePickerContainer>

                <FormField
                  label="Club Name"
                  name="clubName"
                  control={control}
                  error={errors.clubName}
                  required
                />

                <Controller
                  control={control}
                  name="country"
                  rules={{ required: "Country is required" }}
                  render={({ field: { onChange, value } }) => (
                    <ListDropdown
                      label="Country"
                      setSelected={(val: string) => {
                        onChange(val);
                        const selected = countries.find((c) => c.value === val);
                        setSelectedCountryCode(selected?.key ?? null);
                        setValue("city", "");
                        setCities([]);
                      }}
                      data={countries}
                      save="value"
                      placeholder={
                        loadingCountries
                          ? "Loading countries..."
                          : "Select country"
                      }
                      selectedOption={
                        value ? { key: value, value } : {}
                      }
                      boxStyles={[
                        styles.box,
                        errors.country ? styles.errorBox : null,
                      ]}
                      inputStyles={styles.input}
                      dropdownStyles={styles.dropdown}
                      fontFamily=""
                      loading={loadingCountries}
                      notFoundText="No countries found"
                      notFoundTextFunction={() => {}}
                      onDropdownOpen={() => {}}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="city"
                  rules={{ required: "City is required" }}
                  render={({ field: { onChange, value } }) => (
                    <ListDropdown
                      label="City"
                      setSelected={(val: string) => onChange(val)}
                      data={cities}
                      save="value"
                      placeholder={
                        selectedCountryCode
                          ? "Search cities..."
                          : "Select country first"
                      }
                      searchPlaceholder="Start typing..."
                      selectedOption={
                        value ? { key: value, value } : {}
                      }
                      boxStyles={[
                        styles.box,
                        errors.city ? styles.errorBox : null,
                        !selectedCountryCode ? styles.disabledBox : null,
                      ]}
                      inputStyles={styles.input}
                      dropdownStyles={styles.dropdown}
                      fontFamily=""
                      loading={loadingCities}
                      onDropdownOpen={handleCityDropdownOpen}
                      disabled={!selectedCountryCode}
                      notFoundText="No cities found"
                      notFoundTextFunction={() => {}}
                    />
                  )}
                />

                <FormField
                  label="Club Description"
                  name="clubDescription"
                  control={control}
                  error={errors.clubDescription}
                  multiline
                />

                <ButtonContainer>
                  <CancelButton onPress={() => setModalVisible(false)}>
                    <CancelText>Cancel</CancelText>
                  </CancelButton>

                  <CreateButton
                    disabled={!canCreate}
                    onPress={handleSubmit(onSubmit)}
                  >
                    {clubCreationLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <CreateText>Create</CreateText>
                    )}
                  </CreateButton>
                </ButtonContainer>
          </ScrollContainer>
        </SafeAreaWrapper>
      </ModalContainer>
    </Modal>
  );
};

const FormField = ({
  label,
  name,
  control,
  error,
  multiline = false,
  required = false,
}: {
  label: string;
  name: keyof ClubFormValues;
  control: Control<ClubFormValues>;
  error?: FieldError;
  multiline?: boolean;
  required?: boolean;
}) => (
  <>
    <LabelContainer>
      <Label>
        {label}
        {required && <ErrorText>*</ErrorText>}
      </Label>
      {error && <ErrorText>{error.message}</ErrorText>}
    </LabelContainer>
    <Controller
      control={control}
      name={name}
      rules={{ required: required ? `${label} is required` : false }}
      render={({ field: { onChange, onBlur, value } }) =>
        multiline ? (
          <TextAreaInput
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#ccc"
            multiline
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        ) : (
          <Input
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#ccc"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )
      }
    />
  </>
);

const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ScrollContainer = styled(ScrollView).attrs({
  contentContainerStyle: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
})({});

const SafeAreaWrapper = styled(KeyboardAvoidingView)({
  width: screenWidth - 40,
  margin: 20,
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: "rgba(2, 13, 24, 0.7)",
});

const ModalTitle = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
  marginBottom: 10,
  textAlign: "center",
});

const ModalSubtitle = styled.Text({
  fontSize: 13,
  color: "#A9A9A9",
  lineHeight: 18,
  marginBottom: 20,
  textAlign: "center",
});

const Label = styled.Text({
  color: "#ccc",
  alignSelf: "flex-start",
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 6,
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
  marginTop: 4,
});

const Input = styled.TextInput({
  height: 40,
  borderRadius: 6,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "white",
  paddingLeft: 12,
  marginBottom: 16,
});

const TextAreaInput = styled.TextInput({
  height: 100,
  borderRadius: 6,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "white",
  paddingLeft: 12,
  marginBottom: 16,
});

const LabelContainer = styled.View({
  marginBottom: 4,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 20,
});

const CancelButton = styled.TouchableOpacity({
  width: "45%",
  padding: 12,
  backgroundColor: "#9e9e9e",
  borderRadius: 6,
});

const CancelText = styled.Text({
  textAlign: "center",
  color: "white",
  fontSize: 16,
});

const CreateButton = styled.TouchableOpacity<{ disabled?: boolean }>(
  ({ disabled }: { disabled?: boolean }) => ({
    width: "45%",
    padding: 12,
    borderRadius: 6,
    backgroundColor: disabled ? "#9e9e9e" : "#00A2FF",
    opacity: disabled ? 0.6 : 1,
  }),
);

const CreateText = styled.Text({
  textAlign: "center",
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});

const ImagePickerContainer = styled.TouchableOpacity({
  position: "relative",
  marginBottom: 20,
});

const ClubImage = styled.Image({
  width: "100%",
  height: 200,
  borderRadius: 8,
});

const OverlayIcon = styled.View({
  position: "absolute",
  right: 10,
  bottom: 10,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  borderRadius: 16,
  padding: 2,
});

const ImagePlaceholder = styled.View({
  width: "100%",
  height: 200,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "#ccc",
});

const styles = StyleSheet.create({
  box: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#ff7675",
  },
  disabledBox: { opacity: 0.6 },
  input: { color: "#fff", paddingRight: 10 },
  dropdown: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
    marginTop: 5,
  },
});

export default AddClubModal;
