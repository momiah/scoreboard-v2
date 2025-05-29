import React, { useContext, useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";

import { LeagueContext } from "../../../context/LeagueContext";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { uploadLeagueImage } from "../../../utils/UploadLeagueImageToFirebase";
import { useNavigation, useRoute } from "@react-navigation/native";
import Popup from "../../../components/popup/Popup";
import { PopupContext } from "../../../context/PopupContext";
import * as FileSystem from "expo-file-system";

const EditLeague = () => {
  const route = useRoute();
  const { leagueId, leagueById } = route.params;

  const { updateLeague, fetchLeagueById } = useContext(LeagueContext);
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");

    navigation.goBack();
  };

  useEffect(() => {
    const loadLeague = async () => {
      if (!leagueById || leagueById.id !== leagueId) {
        await fetchLeagueById(leagueId);
      }
      setSelectedImage(leagueById?.leagueImage || null);
      setLoading(false);
    };
    loadLeague();
  }, [leagueId]);

  // Setup React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm({
    defaultValues: {
      leagueImage: leagueById.leagueImage || "",
      leagueDescription: leagueById.leagueDescription || "",
    },
  });

  // Watch form values for change detection
  const formValues = watch();

  const hasChanges = useMemo(() => {
    if (!leagueById) return false;
    const imageChanged = selectedImage !== leagueById.leagueImage;
    const descriptionChanged =
      formValues.leagueDescription !== leagueById.leagueDescription;
    return imageChanged || descriptionChanged || isDirty;
  }, [selectedImage, leagueById, formValues, isDirty]);

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 1,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const pickedUri = asset.uri;

        // Check file size (5MB = 5 * 1024 * 1024 bytes)
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes

        // Get file info to check size
        const fileInfo = await FileSystem.getInfoAsync(pickedUri);

        if (fileInfo.size && fileInfo.size > MAX_SIZE) {
          Alert.alert(
            "File Too Large",
            `Image size is ${(fileInfo.size / (1024 * 1024)).toFixed(
              2
            )}MB. Please select an image smaller than 5MB.`,
            [{ text: "OK" }]
          );
          return;
        }

        const cropped = await ImageManipulator.manipulateAsync(
          pickedUri,
          [{ resize: { width: 600 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Optional: Log the final image size
        const croppedInfo = await FileSystem.getInfoAsync(cropped.uri);
        console.log(
          `Final image size: ${(croppedInfo.size / 1024).toFixed(1)}KB`
        );

        setSelectedImage(cropped.uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Unable to pick image.");
    }
  };

  const onSubmit = async (data) => {
    if (!hasChanges) return;

    setIsSubmitting(true);
    try {
      let updatedImage = selectedImage;
      if (selectedImage && selectedImage !== leagueById.leagueImage) {
        updatedImage = await uploadLeagueImage(selectedImage, leagueById.id);
      }

      const updatedLeague = {
        ...leagueById,
        leagueDescription: data.leagueDescription,
        leagueImage: updatedImage || leagueById.leagueImage,
      };

      await updateLeague(updatedLeague);
      handleShowPopup("League updated!");
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !leagueById) {
    return (
      <SafeAreaWrapper>
        <ScrollContainer
          contentContainerStyle={{
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <ActivityIndicator size="large" color="#00A2FF" />
        </ScrollContainer>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <Popup
        visible={showPopup}
        message={popupMessage}
        onClose={handleClosePopup}
        type="success"
      />
      <ScrollContainer showsVerticalScrollIndicator={false}>
        <Title>Edit League</Title>

        <TouchableOpacity onPress={handleImagePick} disabled={isSubmitting}>
          <ImageWrapper>
            {selectedImage ? (
              <LeagueImage source={{ uri: selectedImage }} />
            ) : (
              <ImagePlaceholder>
                <Text style={{ color: "#ccc" }}>Tap to add image</Text>
              </ImagePlaceholder>
            )}
            <PlusIconWrapper>
              <AntDesign name="pluscircle" size={28} color="#2196f3" />
            </PlusIconWrapper>
          </ImageWrapper>
        </TouchableOpacity>

        <View>
          <LabelContainer>
            <Label>Description</Label>
            {errors.leagueDescription && (
              <ErrorText>{errors.leagueDescription.message}</ErrorText>
            )}
          </LabelContainer>
          <Controller
            control={control}
            name="leagueDescription"
            rules={{
              minLength: {
                value: 10,
                message: "Description must be at least 10 characters",
              },
            }}
            render={({ field: { onChange, value, onBlur } }) => (
              <TextAreaInput
                value={value}
                placeholder="Enter description"
                placeholderTextColor="#ccc"
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={4}
                editable={!isSubmitting}
              />
            )}
          />
        </View>

        <ButtonContainer>
          <CancelButton
            onPress={() => navigation.goBack()}
            disabled={isSubmitting}
          >
            <CancelText>Cancel</CancelText>
          </CancelButton>
          <CreateButton
            onPress={handleSubmit(onSubmit)}
            disabled={!hasChanges || isSubmitting}
            style={{ opacity: !hasChanges || isSubmitting ? 0.5 : 1 }}
          >
            <CreateText>{isSubmitting ? "Updating..." : "Update"}</CreateText>
          </CreateButton>
        </ButtonContainer>
      </ScrollContainer>
    </SafeAreaWrapper>
  );
};

export default EditLeague;

// --- Styled Components ---
// --- Styled Components (Object Style) ---
const SafeAreaWrapper = styled(SafeAreaView)({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
});

const ScrollContainer = styled.ScrollView({
  padding: 20,
});

const Title = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
  marginBottom: 20,
  textAlign: "center",
});

const LabelContainer = styled.View({
  marginBottom: 4,
});

const Label = styled.Text({
  color: "#ccc",
  fontSize: 12,
  marginLeft: 4,
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
});

const TextAreaInput = styled.TextInput({
  height: 100,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "white",
  paddingLeft: 12,
  borderRadius: 6,
  marginBottom: 16,
  textAlignVertical: "top",
});

const ImageWrapper = styled.View({
  position: "relative",
  width: "100%",
  height: 200,
  marginBottom: 20,
});

const LeagueImage = styled.Image({
  width: "100%",
  height: "100%",
  borderRadius: 8,
});

const ImagePlaceholder = styled.View({
  width: "100%",
  height: "100%",
  backgroundColor: "#001e3c",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 8,
  borderWidth: 2,
  borderStyle: "dashed",
  borderColor: "#555",
});

const PlusIconWrapper = styled.View({
  position: "absolute",
  bottom: 10,
  right: 10,
  backgroundColor: "white",
  borderRadius: 16,
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

const CreateButton = styled.TouchableOpacity({
  width: "45%",
  padding: 12,
  backgroundColor: "#2196f3",
  borderRadius: 6,
});

const CreateText = styled.Text({
  textAlign: "center",
  color: "white",
  fontSize: 16,
});
