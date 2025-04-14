import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseApp } from "../../services/firebase.config";
import { LeagueContext } from "../../context/LeagueContext";
import { leagueSchema } from "../../schemas/schema";

const { width: screenWidth } = Dimensions.get("window");

const EditLeagueModal = ({ visible, onClose, leagueData }) => {
  const { updateLeague } = useContext(LeagueContext);
  const [leagueDetails, setLeagueDetails] = useState(leagueSchema);
  const [selectedImage, setSelectedImage] = useState(null);
  const [errorText, setErrorText] = useState({});

  useEffect(() => {
    if (leagueData) {
      setLeagueDetails(leagueData);
      setSelectedImage(leagueData.image || null);
    }
  }, [leagueData]);

  const fetchImageBlob = (uri) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError("Network request failed"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
  };

  const uploadLeagueImage = async (uri, leagueId) => {
    try {
      const blob = await fetchImageBlob(uri);
      const filePath = `LeagueImages/${leagueId}_${Date.now()}.jpg`;
      const storage = getStorage(firebaseApp);
      const storageRef = ref(storage, filePath);
      const uploadTask = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      return downloadURL;
    } catch (error) {
      console.error("Image upload error:", error);
      return null;
    }
  };

  const handleChange = (field, value) => {
    setLeagueDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      const cropped = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 600 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setSelectedImage(cropped.uri);
    }
  };

  const handleUpdate = async () => {
    const newErrors = {};
    if (!leagueDetails.description) newErrors.description = "Description is required";
    setErrorText(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    try {
      let updatedImage = selectedImage;
      if (selectedImage && selectedImage !== leagueData.image) {
        updatedImage = await uploadLeagueImage(selectedImage, leagueDetails.leagueId);
      }

      const updatedLeague = {
        ...leagueDetails,
        image: updatedImage || leagueData.image,
      };

      updateLeague(updatedLeague);
      onClose();
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <ModalContainer>
        <SafeAreaWrapper>
          <ScrollContainer>
            <ModalTitle>Edit League</ModalTitle>

            <TouchableOpacity onPress={handleImagePick}>
              {selectedImage ? (
                <LeagueImage source={{ uri: selectedImage }} />
              ) : (
                <ImagePlaceholder>
                  <Text style={{ color: "#ccc" }}>Tap to add image</Text>
                </ImagePlaceholder>
              )}
            </TouchableOpacity>

            <View>
              <LabelContainer>
                <Label>Description</Label>
                {errorText.description && <ErrorText>{errorText.description}</ErrorText>}
              </LabelContainer>
              <TextAreaInput
                value={leagueDetails.description}
                placeholder="Enter description"
                placeholderTextColor="#ccc"
                onChangeText={(v) => handleChange("description", v)}
                multiline
                numberOfLines={4}
              />
            </View>

            <ButtonContainer>
              <CancelButton onPress={onClose}>
                <CancelText>Cancel</CancelText>
              </CancelButton>
              <CreateButton onPress={handleUpdate}>
                <CreateText>Update</CreateText>
              </CreateButton>
            </ButtonContainer>
          </ScrollContainer>
        </SafeAreaWrapper>
      </ModalContainer>
    </Modal>
  );
};

// Styled components
const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const SafeAreaWrapper = styled(SafeAreaView)`
  flex: 1;
  width: ${screenWidth - 40}px;
  margin: 20px;
  border-radius: 20px;
  overflow: hidden;
  background-color: rgba(2, 13, 24, 0.7);
`;

const ScrollContainer = styled.ScrollView`
  padding: 20px;
`;

const ModalTitle = styled.Text`
  font-size: 20px;
  color: #fff;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
`;

const LabelContainer = styled.View`
  margin-bottom: 4px;
`;

const Label = styled.Text`
  color: #ccc;
  font-size: 12px;
  margin-left: 4px;
`;

const ErrorText = styled.Text`
  color: red;
  font-size: 12px;
`;

const TextAreaInput = styled.TextInput`
  height: 100px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  padding-left: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  text-align-vertical: top;
`;

const LeagueImage = styled.Image`
  width: 100%;
  height: 200px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const ImagePlaceholder = styled.View`
  width: 100%;
  height: 200px;
  background-color: #f2f2f2;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 20px;
`;

const CancelButton = styled.TouchableOpacity`
  width: 45%;
  padding: 12px;
  background-color: #9e9e9e;
  border-radius: 6px;
`;

const CancelText = styled.Text`
  text-align: center;
  color: white;
  font-size: 16px;
`;

const CreateButton = styled.TouchableOpacity`
  width: 45%;
  padding: 12px;
  background-color: #2196f3;
  border-radius: 6px;
`;

const CreateText = styled.Text`
  text-align: center;
  color: white;
  font-size: 16px;
`;

export default EditLeagueModal;
