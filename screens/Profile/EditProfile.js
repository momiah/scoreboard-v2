import React, { useContext, useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Alert,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadProfileImage } from "../../utils/ProfileImageUploadToFirebase";
import { loadCountries, loadCities } from "../../utils/locationData";
import ListDropdown from "../../components/ListDropdown/ListDropdown";

const EditProfile = ({ navigation }) => {
  const { currentUser, updateUserProfile } = useContext(UserContext);

  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const [countries, setCountries] = useState([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    currentUser?.location?.countryCode
  );

  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [formData, setFormData] = useState({
    location: {
      city: "",
      country: "",
      countryCode: "",
    },
    handPreference: "",
    bio: "",
    email: "",
    profileImage: "",
    headline: "",
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        location: {
          city: currentUser.location?.city || "",
          country: currentUser.location?.country || "",
          countryCode: currentUser.location?.countryCode || "",
        },
        handPreference: currentUser.handPreference || "",
        bio: currentUser.bio || "",
        email: currentUser.email || "",
        profileImage: currentUser.profileImage || "",
        headline: currentUser.headline || "",
      });

      // Initialize selected country code
      setSelectedCountryCode(currentUser.location?.countryCode || null);
    }
  }, [currentUser]);

  useEffect(() => {
    if (countries.length) return;

    setLoadingCountries(true);
    setTimeout(() => {
      try {
        const all = loadCountries();
        setCountries(all);
      } finally {
        setLoadingCountries(false);
      }
    }, 0);
  }, [countries]);

  const handleCityDropdownOpen = useCallback(async () => {
    if (!selectedCountryCode) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const list = loadCities(selectedCountryCode);
      setCities(list);
    } catch (e) {
      console.error(e);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, [selectedCountryCode]);

  const pickImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "You need to allow access to your media library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        const manipulated = await ImageManipulator.manipulateAsync(
          pickedUri,
          [{ resize: { width: 300, height: 300 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setFormData((prev) => ({ ...prev, profileImage: manipulated.uri }));
      }
    } catch (err) {
      console.error("Image pick error:", err);
      Alert.alert("Error", "Unable to pick image.");
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      let imageUrl = formData.profileImage;

      if (imageUrl && !imageUrl.startsWith("https://")) {
        imageUrl = await uploadProfileImage(imageUrl, currentUser.userId);
      }

      await updateUserProfile({
        ...formData,
        profileImage: imageUrl,
        location: {
          city: formData.location.city,
          country: formData.location.country,
          countryCode: formData.location.countryCode,
        },
      });

      Alert.alert("Success", "Profile updated!");
      navigation.goBack();
    } catch (err) {
      console.error("Update failed:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useCallback(() => {
    if (!currentUser) return false;

    // Compare each field with currentUser's data
    return (
      formData.location.city !== (currentUser.location?.city || "") ||
      formData.location.country !== (currentUser.location?.country || "") ||
      formData.location.countryCode !==
        (currentUser.location?.countryCode || "") ||
      formData.handPreference !== (currentUser.handPreference || "") ||
      formData.bio !== (currentUser.bio || "") ||
      formData.email !== (currentUser.email || "") ||
      formData.profileImage !== (currentUser.profileImage || "") ||
      formData.headline !== (currentUser.headline || "")
    );
  }, [currentUser, formData]);

  return (
    <Container>
      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Edit Profile</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <FlatList
        data={[1]} // Dummy single item
        keyExtractor={() => "main"}
        renderItem={() => (
          <>
            <ImageSection>
              <TouchableOpacity
                onPress={pickImage}
                onLongPress={() => setPreviewVisible(true)}
                accessibilityLabel="Tap to pick a profile image"
              >
                <ImageContainer>
                  {formData.profileImage ? (
                    <ProfileImage source={{ uri: formData.profileImage }} />
                  ) : (
                    <PlaceholderImage>
                      <Ionicons name="camera" size={30} color="#ccc" />
                    </PlaceholderImage>
                  )}
                  <PlusIcon>
                    <Ionicons name="add-circle" size={28} color="#00a2ff" />
                  </PlusIcon>
                </ImageContainer>
              </TouchableOpacity>
              <ImageHintText>
                {formData.profileImage
                  ? "Tap to change photo"
                  : "Tap to upload photo"}
              </ImageHintText>
            </ImageSection>

            <Section>
              <SectionTitle>Headline</SectionTitle>
              <Input
                value={formData.headline}
                onChangeText={(text) =>
                  setFormData({ ...formData, headline: text.slice(0, 100) })
                }
                placeholder="Write a short headline for your profile"
                placeholderTextColor={"#aaa"}
                maxLength={80}
              />
              <View style={{ alignItems: "flex-end", marginTop: 5 }}>
                <Text style={{ color: "#aaa", fontSize: 12 }}>
                  {formData.headline.length}/80
                </Text>
              </View>
            </Section>

            <Section>
              {/* Country Dropdown */}
              <ListDropdown
                label="Country"
                setSelected={(val) => {
                  // Find the full country object
                  const selectedCountry = countries.find(
                    (c) => c.value === val
                  );

                  // Update form data with both country name and code
                  setFormData((prev) => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      country: val, // Country name
                      countryCode: selectedCountry?.key || "", // Country code
                      city: "", // Reset city
                    },
                  }));

                  // Set the country code for cities loading
                  setSelectedCountryCode(selectedCountry?.key);
                  setCities([]);
                }}
                data={countries}
                save="value"
                placeholder={
                  loadingCountries ? "Loading countries..." : "Select country"
                }
                selectedOption={
                  formData.location.country
                    ? {
                        key: formData.location.country,
                        value: formData.location.country,
                      }
                    : null
                }
                loading={loadingCountries}
              />

              {/* City Dropdown */}
              <ListDropdown
                label="City"
                setSelected={(val) => {
                  setFormData((prev) => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      city: val,
                    },
                  }));
                }}
                data={cities}
                save="value"
                placeholder={
                  selectedCountryCode
                    ? "Search cities..."
                    : "Select country first"
                }
                searchPlaceholder="Start typing..."
                selectedOption={
                  formData.location.city
                    ? {
                        key: formData.location.city,
                        value: formData.location.city,
                      }
                    : null
                }
                loading={loadingCities}
                onDropdownOpen={handleCityDropdownOpen}
                disabled={loadingCountries}
              />
            </Section>

            <Section>
              <SectionTitle>Hand Preference</SectionTitle>
              <PreferenceContainer>
                {["Left", "Right", "Ambidextrous"].map((pref) => (
                  <PreferenceButton
                    key={pref}
                    selected={formData.handPreference === pref}
                    onPress={() =>
                      setFormData({ ...formData, handPreference: pref })
                    }
                  >
                    <PreferenceText selected={formData.handPreference === pref}>
                      {pref}
                    </PreferenceText>
                  </PreferenceButton>
                ))}
              </PreferenceContainer>
            </Section>

            <Section>
              <SectionTitle>Bio</SectionTitle>
              <Input
                value={formData.bio}
                onChangeText={(text) => setFormData({ ...formData, bio: text })}
                placeholder="Tell us about yourself"
                multiline
                placeholderTextColor={"#aaa"}
                style={{ height: 150 }}
              />
            </Section>

            <Section>
              <SectionTitle>Contact Email</SectionTitle>
              <Input
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={"#aaa"}
              />
            </Section>

            <ButtonWrapper>
              <ConfirmButton
                onPress={handleUpdate}
                disabled={!hasChanges() || loading}
                style={{ opacity: hasChanges() ? 1 : 0.6 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    Update Profile
                  </Text>
                )}
              </ConfirmButton>
            </ButtonWrapper>
          </>
        )}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      />

      {/* Fullscreen Image Preview Modal */}
      <Modal visible={previewVisible} transparent animationType="fade">
        <ModalBackground>
          <PreviewImage
            source={{ uri: formData.profileImage }}
            resizeMode="contain"
          />
          <Pressable onPress={() => setPreviewVisible(false)}>
            <CloseText>Close Preview</CloseText>
          </Pressable>
        </ModalBackground>
      </Modal>
    </Container>
  );
};

// Object-style styled components
const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  padding: 20,
});

const ConfirmButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 12,
  borderRadius: 8,
  backgroundColor: "#00a2ff",
});

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 30,
});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const Section = styled.View({
  marginBottom: 25,
});

const SectionTitle = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "500",
  marginBottom: 10,
});

const Input = styled.TextInput({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  color: "white",
  paddingVertical: 12,
  paddingHorizontal: 15,
  borderRadius: 8,
  fontSize: 16,
});

const PreferenceContainer = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
});

const PreferenceButton = styled.TouchableOpacity(({ selected }) => ({
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 5,
  backgroundColor: selected ? "#00284b" : "#00152B",
  borderWidth: 1,
  borderColor: selected ? "#004eb4" : "#414141",
}));

const PreferenceText = styled.Text(({ selected }) => ({
  color: selected ? "white" : "#aaa",
  fontSize: 14,
}));

const ButtonWrapper = styled.View({
  marginTop: 30,
  marginBottom: 50,
});

const ImageSection = styled.View({
  alignItems: "center",
  marginBottom: 30,
});

const ImageContainer = styled.View({
  position: "relative",
  width: 120,
  height: 120,
});

const ProfileImage = styled.Image({
  width: 120,
  height: 120,
  borderRadius: 60,
  borderWidth: 3,
  borderColor: "#00a2ff",
});

const PlaceholderImage = styled.View({
  width: 120,
  height: 120,
  borderRadius: 60,
  backgroundColor: "#001e3c",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 2,
  borderStyle: "dashed",
  borderColor: "#555",
});

const PlusIcon = styled.View({
  position: "absolute",
  bottom: -2,
  right: -2,
  backgroundColor: "rgb(3, 16, 31)",
  borderRadius: 14,
});

const ImageHintText = styled.Text({
  color: "#aaa",
  marginTop: 10,
  fontSize: 14,
});

const ModalBackground = styled.View({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.9)",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
});

const PreviewImage = styled.Image({
  width: "100%",
  height: "70%",
});

const CloseText = styled.Text({
  color: "white",
  fontSize: 16,
  marginTop: 20,
});

const styles = {
  content: {
    paddingTop: 10,
    paddingBottom: 30,
  },
  container: {
    width: "100%",
    marginBottom: 15,
  },
  box: {
    backgroundColor: "#262626",
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#ff7675",
  },
  disabledBox: {
    opacity: 0.6,
  },
  input: {
    color: "#fff",
    paddingRight: 10,
  },
  dropdown: {
    backgroundColor: "#262626",
    borderWidth: 0,
    marginTop: 5,
  },
  dropdownText: {
    color: "#fff",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
};

export default EditProfile;
