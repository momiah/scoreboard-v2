import React, { useState, useContext } from "react";
import {
  Modal,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  SafeAreaView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import styled from "styled-components/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import DatePicker from "../Leagues/AddLeague/DatePicker";
import MaxPlayersPicker from "../Leagues/AddLeague/MaxPlayersPicker";
import LeagueType from "../Leagues/AddLeague/LeagueType";
import PrivacyType from "../Leagues/AddLeague/PrivacyType";
import { leagueSchema, scoreboardProfileSchema } from "../../schemas/schema";

// Firebase imports
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '../../services/firebase.config'; // Your Firebase app initialization

const { width: screenWidth } = Dimensions.get("window");

const AddLeagueModal = ({ modalVisible, setModalVisible }) => {
  const { addLeagues } = useContext(LeagueContext);
  const { getUserById } = useContext(UserContext);
  const [errorText, setErrorText] = useState({});
  const [leagueDetails, setLeagueDetails] = useState(leagueSchema);
  const [selectedImage, setSelectedImage] = useState(null);

  // Function to fetch image as blob using XMLHttpRequest
  const fetchImageBlob = (uri) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function() {
        reject(new TypeError('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  };

  // Function to upload league image to Firebase
  const uploadLeagueImage = async (uri, leagueId) => {
    try {
      console.log("🟡 Starting league image upload...");

      // Fetch the image as a blob using XMLHttpRequest
      const blob = await fetchImageBlob(uri);
      if (!blob) {
        throw new Error("⚠️ Failed to fetch image blob.");
      }

      const filePath = `LigueImages/${leagueId}_${new Date().getTime()}.jpg`;
      console.log(`⬆️ Uploading to: ${filePath} (type: image/jpeg)`);

      // Initialize storage using the Firebase app
      const storage = getStorage(firebaseApp); // Use getStorage to access Firebase storage
      const storageRef = ref(storage, filePath); // Create reference for the file path

      // Upload blob to Firebase storage
      const uploadTaskSnapshot = await uploadBytes(storageRef, blob);

      // Once uploaded, get the download URL
      const downloadURL = await getDownloadURL(uploadTaskSnapshot.ref);
      console.log(`Upload success! File available at: ${downloadURL}`);

      // Return the download URL
      return downloadURL;
    } catch (error) {
      console.error("🔥 Error during league image upload:", error);
      throw new Error("⚠️ Failed to upload image. Please try again.");
    }
  };

  // Function to assign the league admin
  const assignLeagueAdmin = async () => {
    const currentUserId = await AsyncStorage.getItem("userId");
    if (!currentUserId) return null;

    const userInfo = await getUserById(currentUserId);
    const leagueCreatorProfile = {
      ...scoreboardProfileSchema,
      username: userInfo.username,
      userId: userInfo.userId,
      memberSince: userInfo.profileDetail?.memberSince || "",
    };

    return {
      leagueAdmin: { userId: userInfo.userId, username: userInfo.username },
      leagueParticipant: leagueCreatorProfile,
    };
  };

  // Handle form field change
  const handleChange = (field, value) => {
    setLeagueDetails((prev) => ({ ...prev, [field]: value }));
  };

  // Handle image picker from the gallery
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

  // Handle creating the league
  const handleCreate = async () => {
    const requiredFields = [
      "leagueName", "location", "centerName", "startDate",
      "leagueLengthInMonths", "leagueType", "maxPlayers", "privacy"
    ];

    const newErrors = {};
    requiredFields.forEach((f) => {
      if (!leagueDetails[f]) newErrors[f] = "required";
    });

    setErrorText(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    try {
      const adminData = await assignLeagueAdmin();
      if (!adminData) return;

      // Upload league image to Firebase and get the download URL
      let imageDownloadUrl = null;
      if (selectedImage) {
        imageDownloadUrl = await uploadLeagueImage(selectedImage, leagueDetails.leagueId);
      }

      const newLeague = {
        ...leagueDetails,
        leagueAdmins: [adminData.leagueAdmin],
        leagueParticipants: [adminData.leagueParticipant],
        image: imageDownloadUrl || null,  // Assign image URL or null if no image selected
      };

      addLeagues(newLeague);
      setModalVisible(false);
    } catch (err) {
      console.error("Error creating league:", err);
    }
  };

  // Render input fields
  const renderInput = (label, key, isTextArea = false) => (
    <>
      <LabelContainer>
        <Label>{label}</Label>
        {errorText[key] && <ErrorText>{errorText[key]}</ErrorText>}
      </LabelContainer>
      {isTextArea ? (
        <TextAreaInput
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#ccc"
          multiline
          value={leagueDetails[key]}
          onChangeText={(v) => handleChange(key, v)}
        />
      ) : (
        <Input
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor="#ccc"
          value={leagueDetails[key]}
          onChangeText={(v) => handleChange(key, v)}
        />
      )}
    </>
  );

  return (
    <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
      <ModalContainer>
        <SafeAreaWrapper>
          <ScrollContainer contentContainerStyle={{ paddingBottom: 60 }}>
            <ModalTitle>Create League</ModalTitle>

            <TouchableOpacity onPress={handleImagePick}>
              {selectedImage ? (
                <LeagueImage source={{ uri: selectedImage }} />
              ) : (
                <ImagePlaceholder>
                  <Text style={{ color: "#ccc" }}>Tap to add image</Text>
                </ImagePlaceholder>
              )}
            </TouchableOpacity>

            {renderInput("League Name", "leagueName")}
            {renderInput("Location", "location")}
            {renderInput("Center Name", "centerName")}
            {renderInput("Description", "description", true)}

            <DatePicker
              setLeagueDetails={setLeagueDetails}
              leagueDetails={leagueDetails}
              errorText={errorText.startDate}
            />
            <MaxPlayersPicker setLeagueDetails={setLeagueDetails} errorText={errorText.maxPlayers} />
            <LeagueType setLeagueDetails={setLeagueDetails} errorText={errorText.leagueType} />
            <PrivacyType setLeagueDetails={setLeagueDetails} errorText={errorText.privacy} />

            <ButtonContainer>
              <CancelButton onPress={() => setModalVisible(false)}>
                <CancelText>Cancel</CancelText>
              </CancelButton>
              <CreateButton onPress={handleCreate}>
                <CreateText>Create</CreateText>
              </CreateButton>
            </ButtonContainer>
          </ScrollContainer>
        </SafeAreaWrapper>
      </ModalContainer>
    </Modal>
  );
};

// Styled Components
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

const Label = styled.Text`
  color: #ccc;
  align-self: flex-start;
  font-size: 12px;
  margin-left: 4px;
  margin-bottom: 6px;
`;

const ErrorText = styled.Text`
  color: red;
  font-size: 12px;
  margin-top: 4px;
`;

const Input = styled.TextInput`
  height: 40px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  padding-left: 12px;
  margin-bottom: 16px;
`;

const TextAreaInput = styled.TextInput`
  height: 100px;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  padding-left: 12px;
  margin-bottom: 16px;
`;

const LabelContainer = styled.View`
  margin-bottom: 4px;
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
  background-color: #4caf50;
  border-radius: 6px;
`;

const CreateText = styled.Text`
  text-align: center;
  color: white;
  font-size: 16px;
`;

const LeagueImage = styled.Image`
  width: 100%;
  height: 200px;
  margin-bottom: 20px;
  border-radius: 8px;
`;

const ImagePlaceholder = styled.View`
  width: 100%;
  height: 200px;
  background-color: #f2f2f2;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
`;

export default AddLeagueModal;
