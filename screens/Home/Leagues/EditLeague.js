import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { LeagueContext } from "../../../context/LeagueContext";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseApp } from "../../../services/firebase.config";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

const EditLeagueScreen = () => {
  const { leagues, updateLeague } = useContext(LeagueContext);
  const route = useRoute();
  const navigation = useNavigation();
  const leagueId = route?.params?.leagueId;

  const [leagueDetails, setLeagueDetails] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [errorText, setErrorText] = useState({});

  useEffect(() => {
    const league = leagues.find((l) => l.id === leagueId);
    if (league) {
      setLeagueDetails(league);
      setSelectedImage(league.leagueImage || null);
    }
  }, [leagueId, leagues]);

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

  const handleChange = (field, value) => {
    setLeagueDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    const newErrors = {};
    if (!leagueDetails.description)
      newErrors.description = "Description is required";
    setErrorText(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    try {
      let updatedImage = selectedImage;
      if (selectedImage && selectedImage !== leagueDetails.leagueImage) {
        updatedImage = await uploadLeagueImage(
          selectedImage,
          leagueDetails.leagueId
        );
      }

      const updatedLeague = {
        ...leagueDetails,
        leagueImage: updatedImage || leagueDetails.leagueImage,
      };

      updateLeague(updatedLeague);
      navigation.goBack();
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  if (!leagueDetails) return null;

  return (
    <SafeAreaWrapper>
      <ScrollContainer>
        <Title>Edit League</Title>

        <TouchableOpacity onPress={handleImagePick}>
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
            {errorText.description && (
              <ErrorText>{errorText.description}</ErrorText>
            )}
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
          <CancelButton onPress={() => navigation.goBack()}>
            <CancelText>Cancel</CancelText>
          </CancelButton>
          <CreateButton onPress={handleUpdate}>
            <CreateText>Update</CreateText>
          </CreateButton>
        </ButtonContainer>
      </ScrollContainer>
    </SafeAreaWrapper>
  );
};

export default EditLeagueScreen;

// --- Styled Components ---
const SafeAreaWrapper = styled(SafeAreaView)`
  flex: 1;
  background-color: rgb(3, 16, 31);
`;

const ScrollContainer = styled.ScrollView`
  padding: 20px;
`;

const Title = styled.Text`
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

const ImageWrapper = styled.View`
  position: relative;
  width: 100%;
  height: 200px;
  margin-bottom: 20px;
`;

const LeagueImage = styled.Image`
  width: 100%;
  height: 100%;
  border-radius: 8px;
`;

const ImagePlaceholder = styled.View`
  width: 100%;
  height: 100%;
  background-color: #001e3c;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: 2px dashed #555;
`;

const PlusIconWrapper = styled.View`
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: white;
  border-radius: 16px;
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
