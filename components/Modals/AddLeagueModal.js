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
  ActivityIndicator,
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

import { AntDesign } from "@expo/vector-icons";
import { uploadLeagueImage } from "../../utils/UploadLeagueImageToFirebase";

const { width: screenWidth } = Dimensions.get("window");

const AddLeagueModal = ({ modalVisible, setModalVisible }) => {
  const { addLeagues } = useContext(LeagueContext);
  const { getUserById } = useContext(UserContext);
  const [errorText, setErrorText] = useState({});
  const [leagueDetails, setLeagueDetails] = useState(leagueSchema);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showNextModal, setShowNextModal] = useState(false);
  const [leagueCreationLoading, setLeagueCreationLoading] = useState(false);

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

  const handleCreate = async () => {
    const requiredFields = [
      "leagueName",
      "location",
      "centerName",
      "startDate",
      "leagueLengthInMonths",
      "leagueType",
      "maxPlayers",
      "privacy",
    ];

    const newErrors = {};
    requiredFields.forEach((f) => {
      if (!leagueDetails[f]) newErrors[f] = "required";
    });

    setErrorText(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    setLeagueCreationLoading(true);

    try {
      const adminData = await assignLeagueAdmin();
      if (!adminData) return;

      let imageDownloadUrl = null;
      if (selectedImage) {
        imageDownloadUrl = await uploadLeagueImage(
          selectedImage,
          leagueDetails.leagueId
        );
      }

      const newLeague = {
        ...leagueDetails,
        leagueAdmins: [adminData.leagueAdmin],
        leagueParticipants: [adminData.leagueParticipant],
        leagueImage: imageDownloadUrl || null,
      };

      addLeagues(newLeague);
      setLeagueCreationLoading(false);
      setModalVisible(false);
    } catch (err) {
      console.error("Error creating league:", err);
    }
  };

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
    <Modal
      animationType="slide"
      transparent
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <ModalContainer>
        <SafeAreaWrapper>
          <ScrollContainer contentContainerStyle={{ paddingBottom: 60 }}>
            <ModalTitle>Create League</ModalTitle>

            <ImagePickerContainer onPress={handleImagePick}>
              {selectedImage ? (
                <>
                  <LeagueImage source={{ uri: selectedImage }} />
                  <OverlayIcon>
                    <AntDesign name="pluscircleo" size={32} color="#fff" />
                  </OverlayIcon>
                </>
              ) : (
                <ImagePlaceholder>
                  <AntDesign name="pluscircleo" size={32} color="#ccc" />
                  <Text style={{ color: "#ccc", marginTop: 6 }}>Add Image</Text>
                </ImagePlaceholder>
              )}
            </ImagePickerContainer>

            {renderInput("League Name", "leagueName")}
            {renderInput("Location", "location")}
            {renderInput("Center Name", "centerName")}
            {renderInput("Description", "leagueDescription", true)}

            <ButtonContainer>
              <CancelButton onPress={() => setModalVisible(false)}>
                <CancelText>Cancel</CancelText>
              </CancelButton>

              <CreateButton
                disabled={
                  !(
                    leagueDetails.leagueName?.trim() &&
                    leagueDetails.location?.trim() &&
                    leagueDetails.centerName?.trim()
                  )
                }
                onPress={() => setShowNextModal(true)}
              >
                <CreateText>Next</CreateText>
              </CreateButton>
            </ButtonContainer>

            <ConfirmLeagueSettingsModal
              visible={showNextModal}
              leagueCreationLoading={leagueCreationLoading}
              onBack={() => {
                setShowNextModal(false);
                setModalVisible(true);
              }}
              onConfirm={handleCreate}
              confirmDisabled={
                !(
                  leagueDetails.startDate &&
                  leagueDetails.maxPlayers &&
                  leagueDetails.leagueType &&
                  leagueDetails.leagueLengthInMonths &&
                  leagueDetails.privacy
                )
              }
              setLeagueDetails={setLeagueDetails}
              leagueDetails={leagueDetails}
              errorText={errorText}
            />
          </ScrollContainer>
        </SafeAreaWrapper>
      </ModalContainer>
    </Modal>
  );
};

const ConfirmLeagueSettingsModal = ({
  visible,
  onBack,
  leagueCreationLoading,
  onConfirm,
  confirmDisabled,
  setLeagueDetails,
  leagueDetails,
  errorText,
}) => {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <ModalContainer>
        <LeagueDetailsWrapper>
          <LeagueDetailsScrollContainer>
            <ModalTitle>Confirm League Settings</ModalTitle>
            <DatePicker
              setLeagueDetails={setLeagueDetails}
              leagueDetails={leagueDetails}
              errorText={errorText.startDate}
            />
            <MaxPlayersPicker
              setLeagueDetails={setLeagueDetails}
              leagueDetails={leagueDetails}
              errorText={errorText.maxPlayers}
            />
            <LeagueType
              setLeagueDetails={setLeagueDetails}
              leagueDetails={leagueDetails}
              errorText={errorText.leagueType}
            />
            <PrivacyType
              setLeagueDetails={setLeagueDetails}
              leagueDetails={leagueDetails}
              errorText={errorText.privacy}
            />

            <ButtonContainer>
              <CancelButton onPress={onBack}>
                <CancelText>Back</CancelText>
              </CancelButton>
              <CreateButton disabled={confirmDisabled} onPress={onConfirm}>
                {leagueCreationLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <CreateText>Create</CreateText>
                )}
              </CreateButton>
            </ButtonContainer>
          </LeagueDetailsScrollContainer>
        </LeagueDetailsWrapper>
      </ModalContainer>
    </Modal>
  );
};

// Styled Components
const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const SafeAreaWrapper = styled(SafeAreaView)({
  flex: 1,
  width: screenWidth - 40,
  margin: 20,
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: "rgba(2, 13, 24, 0.7)",
});

const ScrollContainer = styled.ScrollView({
  padding: 20,
});

const LeagueDetailsWrapper = styled(SafeAreaView)({
  // flex: 1,
  width: screenWidth - 40,
  margin: 20,
  borderRadius: 20,
  overflow: "hidden",
  backgroundColor: "rgba(2, 13, 24, 0.7)",
});

const LeagueDetailsScrollContainer = styled.ScrollView({
  padding: "40px 20px",
});

const ModalTitle = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
  marginBottom: 20,
  textAlign: "center",
});

const Label = styled.Text({
  color: "#ccc",
  alignSelf: "flex-start",
  fontSize: 12,
  marginLeft: 4,
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

const CreateButton = styled.TouchableOpacity(({ disabled }) => ({
  width: "45%",
  padding: 12,
  borderRadius: 6,
  backgroundColor: disabled ? "#9e9e9e" : "#00A2FF",
  opacity: disabled ? 0.6 : 1,
}));

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

const LeagueImage = styled.Image({
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

export default AddLeagueModal;

// import React, { useState, useContext, useRef } from "react";
// import {
//   Modal,
//   Text,
//   View,
//   ScrollView,
//   TouchableOpacity,
//   TextInput,
//   Image,
//   Dimensions,
//   SafeAreaView,
//   Animated,
// } from "react-native";
// import { BlurView } from "expo-blur";
// import styled from "styled-components/native";
// import * as ImagePicker from "expo-image-picker";
// import * as ImageManipulator from "expo-image-manipulator";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { LeagueContext } from "../../context/LeagueContext";
// import { UserContext } from "../../context/UserContext";
// import DatePicker from "../Leagues/AddLeague/DatePicker";
// import MaxPlayersPicker from "../Leagues/AddLeague/MaxPlayersPicker";
// import LeagueType from "../Leagues/AddLeague/LeagueType";
// import PrivacyType from "../Leagues/AddLeague/PrivacyType";
// import { leagueSchema, scoreboardProfileSchema } from "../../schemas/schema";
// import { AntDesign } from "@expo/vector-icons";
// import { uploadLeagueImage } from "../../utils/UploadLeagueImageToFirebase";

// const { width: screenWidth } = Dimensions.get("window");

// const AddLeagueModal = ({ modalVisible, setModalVisible }) => {
//   const { addLeagues } = useContext(LeagueContext);
//   const { getUserById } = useContext(UserContext);
//   const [errorText, setErrorText] = useState({});
//   const [leagueDetails, setLeagueDetails] = useState(leagueSchema);
//   const [selectedImage, setSelectedImage] = useState(null);
//   const slideAnim = useRef(new Animated.Value(0)).current;

//   const requiredStep1Fields = ["leagueName", "location", "centerName"];
//   const requiredStep2Fields = [
//     "startDate",
//     "leagueLengthInMonths",
//     "leagueType",
//     "maxPlayers",
//     "privacy",
//   ];

//   const assignLeagueAdmin = async () => {
//     const currentUserId = await AsyncStorage.getItem("userId");
//     if (!currentUserId) return null;

//     const userInfo = await getUserById(currentUserId);
//     return {
//       leagueAdmin: { userId: userInfo.userId, username: userInfo.username },
//       leagueParticipant: {
//         ...scoreboardProfileSchema,
//         username: userInfo.username,
//         userId: userInfo.userId,
//         memberSince: userInfo.profileDetail?.memberSince || "",
//       },
//     };
//   };

//   const validateFields = (fields) => {
//     const errors = {};
//     fields.forEach((field) => {
//       if (!leagueDetails[field]) errors[field] = "Required";
//     });
//     setErrorText(errors);
//     return Object.keys(errors).length === 0;
//   };

//   const handleImagePick = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       allowsEditing: true,
//       quality: 1,
//       aspect: [1, 1],
//     });

//     if (!result.canceled) {
//       const cropped = await ImageManipulator.manipulateAsync(
//         result.assets[0].uri,
//         [{ resize: { width: 600 } }],
//         { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
//       );
//       setSelectedImage(cropped.uri);
//     }
//   };

//   const handleNext = () => {
//     if (!validateFields(requiredStep1Fields)) return;
//     Animated.timing(slideAnim, {
//       toValue: 1,
//       duration: 300,
//       useNativeDriver: true,
//     }).start();
//   };

//   const handleBack = () => {
//     Animated.timing(slideAnim, {
//       toValue: 0,
//       duration: 300,
//       useNativeDriver: true,
//     }).start();
//   };

//   const handleCreate = async () => {
//     if (!validateFields(requiredStep2Fields)) return;

//     try {
//       const adminData = await assignLeagueAdmin();
//       if (!adminData) return;

//       const imageDownloadUrl = selectedImage
//         ? await uploadLeagueImage(selectedImage, leagueDetails.leagueId)
//         : null;

//       addLeagues({
//         ...leagueDetails,
//         leagueAdmins: [adminData.leagueAdmin],
//         leagueParticipants: [adminData.leagueParticipant],
//         leagueImage: imageDownloadUrl,
//       });

//       setModalVisible(false);
//       // Reset form state
//       slideAnim.setValue(0);
//       setLeagueDetails(leagueSchema);
//       setSelectedImage(null);
//       setErrorText({});
//     } catch (err) {
//       console.error("Error creating league:", err);
//     }
//   };

//   const renderInput = (label, key, isTextArea = false) => (
//     <View>
//       <LabelContainer>
//         <Label>{label}</Label>
//         {errorText[key] && <ErrorText>{errorText[key]}</ErrorText>}
//       </LabelContainer>
//       {isTextArea ? (
//         <TextAreaInput
//           placeholder={`Enter ${label.toLowerCase()}`}
//           value={leagueDetails[key]}
//           onChangeText={(v) => setLeagueDetails((p) => ({ ...p, [key]: v }))}
//         />
//       ) : (
//         <Input
//           placeholder={`Enter ${label.toLowerCase()}`}
//           value={leagueDetails[key]}
//           onChangeText={(v) => setLeagueDetails((p) => ({ ...p, [key]: v }))}
//         />
//       )}
//     </View>
//   );

//   const step1Valid = requiredStep1Fields.every((f) => leagueDetails[f]?.trim());

//   return (
//     <Modal
//       visible={modalVisible}
//       transparent
//       animationType="slide"
//       onRequestClose={() => setModalVisible(false)}
//     >
//       <ModalContainer intensity={80} tint="dark">
//         <SafeAreaWrapper>
//           <Animated.View
//             style={{
//               width: screenWidth * 2,
//               flexDirection: "row",
//               transform: [
//                 {
//                   translateX: slideAnim.interpolate({
//                     inputRange: [0, 1],
//                     outputRange: [0, -screenWidth],
//                   }),
//                 },
//               ],
//             }}
//           >
//             {/* Step 1 */}
//             <LeagueDetailsWrapper>
//               <LeagueDetailsScrollContainer>
//                 <ModalTitle>Create League</ModalTitle>

//                 <ImagePickerContainer onPress={handleImagePick}>
//                   {selectedImage ? (
//                     <>
//                       <LeagueImage source={{ uri: selectedImage }} />
//                       <OverlayIcon>
//                         <AntDesign name="pluscircleo" size={24} color="#fff" />
//                       </OverlayIcon>
//                     </>
//                   ) : (
//                     <ImagePlaceholder>
//                       <AntDesign name="pluscircleo" size={32} color="#ccc" />
//                       <Text style={{ color: "#ccc", marginTop: 6 }}>
//                         Add Image
//                       </Text>
//                     </ImagePlaceholder>
//                   )}
//                 </ImagePickerContainer>

//                 {renderInput("League Name", "leagueName")}
//                 {renderInput("Location", "location")}
//                 {renderInput("Center Name", "centerName")}
//                 {renderInput("Description", "description", true)}

//                 <ButtonContainer>
//                   <CancelButton onPress={() => setModalVisible(false)}>
//                     <CancelText>Cancel</CancelText>
//                   </CancelButton>
//                   <NextButton
//                     onPress={handleNext}
//                     disabled={!step1Valid}
//                     style={{ opacity: step1Valid ? 1 : 0.6 }}
//                   >
//                     <Text>Next</Text>
//                   </NextButton>
//                 </ButtonContainer>
//               </LeagueDetailsScrollContainer>
//             </LeagueDetailsWrapper>

//             {/* Step 2 */}
//             <LeagueSettingsWrapper>
//               <LeagueSettingsScrollContainer>
//                 <ModalTitle>League Settings</ModalTitle>

//                 <DatePicker
//                   setLeagueDetails={setLeagueDetails}
//                   leagueDetails={leagueDetails}
//                   errorText={errorText.startDate}
//                 />
//                 <MaxPlayersPicker
//                   setLeagueDetails={setLeagueDetails}
//                   errorText={errorText.maxPlayers}
//                 />
//                 <LeagueType
//                   setLeagueDetails={setLeagueDetails}
//                   errorText={errorText.leagueType}
//                 />
//                 <PrivacyType
//                   setLeagueDetails={setLeagueDetails}
//                   errorText={errorText.privacy}
//                 />

//                 <ButtonContainer>
//                   <BackButton onPress={handleBack}>
//                     <Text>Back</Text>
//                   </BackButton>
//                   <CreateButton onPress={handleCreate}>
//                     <CreateText>Create</CreateText>
//                   </CreateButton>
//                 </ButtonContainer>
//               </LeagueSettingsScrollContainer>
//             </LeagueSettingsWrapper>
//           </Animated.View>
//         </SafeAreaWrapper>
//       </ModalContainer>
//     </Modal>
//   );
// };

// // Styled Components (keep previous styles, add these new ones)
// const NextButton = styled(TouchableOpacity)`
//   width: 45%;
//   padding: 12px;
//   background-color: #4caf50;
//   border-radius: 6px;
//   ${({ disabled }) => disabled && "opacity: 0.6;"}
// `;

// const BackButton = styled(TouchableOpacity)`
//   width: 45%;
//   padding: 12px;
//   background-color: #666;
//   border-radius: 6px;
// `;

// // Styled Components
// const ModalContainer = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
//   flex: 1,
//   justifyContent: "center",
//   alignItems: "center",
// });

// const SafeAreaWrapper = styled(SafeAreaView)({
//   // flex: 1,
//   width: screenWidth - 40,
//   margin: 20,
//   borderRadius: 20,
//   overflow: "hidden",
//   backgroundColor: "rgba(2, 13, 24, 0.7)",
// });

// const ScrollContainer = styled.ScrollView({
//   padding: 20,
// });

// const LeagueSettingsWrapper = styled(SafeAreaView)({
//   // flex: 1,
//   width: screenWidth - 40,
//   margin: 20,
//   borderRadius: 20,
//   overflow: "hidden",
//   backgroundColor: "rgba(2, 13, 24, 0.7)",
// });

// const LeagueSettingsScrollContainer = styled.ScrollView({
//   padding: 40,
// });
// const LeagueDetailsWrapper = styled(SafeAreaView)({
//   // flex: 1,
//   width: screenWidth - 40,
//   // margin: 20,
//   borderRadius: 20,
//   overflow: "hidden",
//   backgroundColor: "rgba(2, 13, 24, 0.7)",
// });

// const LeagueDetailsScrollContainer = styled.ScrollView({
//   padding: 20,
// });

// const ModalTitle = styled.Text({
//   fontSize: 20,
//   color: "#fff",
//   fontWeight: "bold",
//   marginBottom: 20,
//   textAlign: "center",
// });

// const Label = styled.Text({
//   color: "#ccc",
//   alignSelf: "flex-start",
//   fontSize: 12,
//   marginLeft: 4,
//   marginBottom: 6,
// });

// const ErrorText = styled.Text({
//   color: "red",
//   fontSize: 12,
//   marginTop: 4,
// });

// const Input = styled.TextInput({
//   height: 40,
//   borderRadius: 6,
//   backgroundColor: "rgba(255, 255, 255, 0.2)",
//   color: "white",
//   paddingLeft: 12,
//   marginBottom: 16,
// });

// const TextAreaInput = styled.TextInput({
//   height: 100,
//   borderRadius: 6,
//   backgroundColor: "rgba(255, 255, 255, 0.2)",
//   color: "white",
//   paddingLeft: 12,
//   marginBottom: 16,
// });

// const LabelContainer = styled.View({
//   marginBottom: 4,
// });

// const ButtonContainer = styled.View({
//   flexDirection: "row",
//   justifyContent: "space-between",
//   marginTop: 20,
// });

// const CancelButton = styled.TouchableOpacity({
//   width: "45%",
//   padding: 12,
//   backgroundColor: "#9e9e9e",
//   borderRadius: 6,
// });

// const CancelText = styled.Text({
//   textAlign: "center",
//   color: "white",
//   fontSize: 16,
// });

// const CreateButton = styled.TouchableOpacity({
//   width: "45%",
//   padding: 12,
//   backgroundColor: "#4caf50",
//   borderRadius: 6,
// });

// const CreateText = styled.Text({
//   textAlign: "center",
//   color: "white",
//   fontSize: 16,
// });

// const ImagePickerContainer = styled.TouchableOpacity({
//   position: "relative",
//   marginBottom: 20,
// });

// const LeagueImage = styled.Image({
//   width: "100%",
//   height: 200,
//   borderRadius: 8,
// });

// const OverlayIcon = styled.View({
//   position: "absolute",
//   right: 10,
//   bottom: 10,
//   backgroundColor: "rgba(0, 0, 0, 0.5)",
//   borderRadius: 16,
//   padding: 2,
// });

// const ImagePlaceholder = styled.View({
//   width: "100%",
//   height: 200,
//   backgroundColor: "rgba(255, 255, 255, 0.1)",
//   justifyContent: "center",
//   alignItems: "center",
//   borderRadius: 8,
//   borderWidth: 1,
//   borderStyle: "dashed",
//   borderColor: "#ccc",
// });

// export default AddLeagueModal;
