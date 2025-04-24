import React, { useContext, useState, useEffect } from "react";
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
} from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { uploadProfileImage } from "../../utils/ProfileImageUploadToFirebase";

const EditProfile = ({ navigation }) => {
  const { currentUser, updateUserProfile } = useContext(UserContext);

  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const [formData, setFormData] = useState({
    location: "",
    handPreference: "",
    bio: "",
    email: "",
    profileImage: "",
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        location: currentUser.location || "",
        handPreference: currentUser.handPreference || "",
        bio: currentUser.bio || "",
        email: currentUser.email || "",
        profileImage: currentUser.profileImage || "",
      });
    }
  }, [currentUser]);

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

      await updateUserProfile({ ...formData, profileImage: imageUrl });
      Alert.alert("Success", "Profile updated!");
      navigation.goBack();
    } catch (err) {
      console.error("Update failed:", err);
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Edit Profile</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <ScrollView contentContainerStyle={styles.content}>
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
          <SectionTitle>Location</SectionTitle>
          <Input
            value={formData.location}
            onChangeText={(text) =>
              setFormData({ ...formData, location: text })
            }
            placeholder="Enter your location"
            placeholderTextColor={"#aaa"}
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
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={"#aaa"}
          />
        </Section>

        <ButtonWrapper>
          <ConfirmButton onPress={handleUpdate} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Update Profile
              </Text>
            )}
          </ConfirmButton>
        </ButtonWrapper>
      </ScrollView>

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
  // gap isn’t supported in RN—add margin on children instead
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
};

export default EditProfile;
